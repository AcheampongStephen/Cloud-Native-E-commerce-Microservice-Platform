const { docClient, tableName } = require('../config/dynamodb');
const { v4: uuidv4 } = require('uuid');

class InventoryService {
  
  // Get inventory for a product
  async getInventory(productId) {
    const params = {
      TableName: tableName.inventory,
      Key: { productId }
    };

    const result = await docClient.get(params).promise();
    return result.Item;
  }

  // Get inventory by SKU
  async getInventoryBySku(sku) {
    const params = {
      TableName: tableName.inventory,
      IndexName: 'SkuIndex',
      KeyConditionExpression: 'sku = :sku',
      ExpressionAttributeValues: {
        ':sku': sku
      }
    };

    const result = await docClient.query(params).promise();
    return result.Items[0];
  }

  // Initialize inventory for a product
  async initializeInventory(productId, sku, initialStock, location = 'default') {
    const timestamp = Date.now();
    
    const item = {
      productId,
      sku,
      availableStock: initialStock,
      reservedStock: 0,
      totalStock: initialStock,
      location,
      lowStockThreshold: 10,
      reorderPoint: 20,
      reorderQuantity: 50,
      lastRestocked: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const params = {
      TableName: tableName.inventory,
      Item: item,
      ConditionExpression: 'attribute_not_exists(productId)'
    };

    try {
      await docClient.put(params).promise();
      
      // Log stock movement
      await this.logStockMovement({
        productId,
        type: 'INITIAL',
        quantity: initialStock,
        reference: 'System initialization'
      });

      return item;
    } catch (error) {
      if (error.code === 'ConditionalCheckFailedException') {
        throw new Error('Inventory already exists for this product');
      }
      throw error;
    }
  }

  // Update stock levels
  async updateStock(productId, quantity, type = 'ADJUSTMENT', reference = '') {
    // First get current inventory
    const currentInventory = await this.getInventory(productId);
    
    if (!currentInventory) {
      throw new Error('Inventory not found for this product');
    }

    const newAvailableStock = currentInventory.availableStock + quantity;
    const newTotalStock = currentInventory.totalStock + quantity;

    // Check if operation would result in negative stock
    if (newAvailableStock < 0) {
      throw new Error('Insufficient stock for this operation');
    }

    const params = {
      TableName: tableName.inventory,
      Key: { productId },
      UpdateExpression: 'SET availableStock = :newAvailable, totalStock = :newTotal, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':newAvailable': newAvailableStock,
        ':newTotal': newTotalStock,
        ':timestamp': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    };

    const result = await docClient.update(params).promise();
    
    // Log stock movement
    await this.logStockMovement({
      productId,
      type,
      quantity,
      reference
    });

    return result.Attributes;
  }

  // Reserve stock (for order processing)
  async reserveStock(productId, quantity, orderId, expirationMinutes = 15) {
    const reservationId = uuidv4();
    const timestamp = Date.now();
    const expiresAt = timestamp + (expirationMinutes * 60 * 1000);

    // First, check if we have enough available stock
    const inventory = await this.getInventory(productId);
    if (!inventory || inventory.availableStock < quantity) {
      throw new Error('Insufficient stock available');
    }

    const newAvailableStock = inventory.availableStock - quantity;
    const newReservedStock = inventory.reservedStock + quantity;

    // Update inventory to reserve stock
    const updateParams = {
      TableName: tableName.inventory,
      Key: { productId },
      UpdateExpression: 'SET availableStock = :newAvailable, reservedStock = :newReserved, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':newAvailable': newAvailableStock,
        ':newReserved': newReservedStock,
        ':timestamp': timestamp
      },
      ReturnValues: 'ALL_NEW'
    };

    await docClient.update(updateParams).promise();

    // Create reservation record
    const reservation = {
      reservationId,
      productId,
      orderId,
      quantity,
      status: 'ACTIVE',
      createdAt: timestamp,
      expiresAt
    };

    const reservationParams = {
      TableName: tableName.reservations,
      Item: reservation
    };

    await docClient.put(reservationParams).promise();

    return reservation;
  }

  // Confirm reservation (when order is paid)
  async confirmReservation(reservationId) {
    // Get reservation
    const getParams = {
      TableName: tableName.reservations,
      Key: { reservationId }
    };

    const result = await docClient.get(getParams).promise();
    const reservation = result.Item;

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      throw new Error('Reservation is not active');
    }

    // Get current inventory
    const inventory = await this.getInventory(reservation.productId);
    
    const newReservedStock = inventory.reservedStock - reservation.quantity;
    const newTotalStock = inventory.totalStock - reservation.quantity;

    // Update inventory - move from reserved to permanently reduced
    const updateParams = {
      TableName: tableName.inventory,
      Key: { productId: reservation.productId },
      UpdateExpression: 'SET reservedStock = :newReserved, totalStock = :newTotal, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':newReserved': newReservedStock,
        ':newTotal': newTotalStock,
        ':timestamp': Date.now()
      },
      ReturnValues: 'ALL_NEW'
    };

    await docClient.update(updateParams).promise();

    // Update reservation status
    const reservationUpdateParams = {
      TableName: tableName.reservations,
      Key: { reservationId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'CONFIRMED'
      }
    };

    await docClient.update(reservationUpdateParams).promise();

    // Log stock movement
    await this.logStockMovement({
      productId: reservation.productId,
      type: 'SALE',
      quantity: -reservation.quantity,
      reference: `Order: ${reservation.orderId}`
    });

    return { success: true, reservation };
  }

  // Cancel reservation (order cancelled or expired)
  async cancelReservation(reservationId) {
    // Get reservation
    const getParams = {
      TableName: tableName.reservations,
      Key: { reservationId }
    };

    const result = await docClient.get(getParams).promise();
    const reservation = result.Item;

    if (!reservation) {
      throw new Error('Reservation not found');
    }

    if (reservation.status !== 'ACTIVE') {
      return { success: true, message: 'Reservation already processed' };
    }

    // Get current inventory
    const inventory = await this.getInventory(reservation.productId);
    
    const newAvailableStock = inventory.availableStock + reservation.quantity;
    const newReservedStock = inventory.reservedStock - reservation.quantity;

    // Return stock to available
    const updateParams = {
      TableName: tableName.inventory,
      Key: { productId: reservation.productId },
      UpdateExpression: 'SET availableStock = :newAvailable, reservedStock = :newReserved, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':newAvailable': newAvailableStock,
        ':newReserved': newReservedStock,
        ':timestamp': Date.now()
      }
    };

    await docClient.update(updateParams).promise();

    // Update reservation status
    const reservationUpdateParams = {
      TableName: tableName.reservations,
      Key: { reservationId },
      UpdateExpression: 'SET #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'CANCELLED'
      }
    };

    await docClient.update(reservationUpdateParams).promise();

    return { success: true, reservation };
  }

  // Clean up expired reservations
  async cleanupExpiredReservations() {
    const now = Date.now();
    
    const scanParams = {
      TableName: tableName.reservations,
      FilterExpression: '#status = :status AND expiresAt < :now',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'ACTIVE',
        ':now': now
      }
    };

    const result = await docClient.scan(scanParams).promise();
    
    // Cancel each expired reservation
    for (const reservation of result.Items) {
      try {
        await this.cancelReservation(reservation.reservationId);
        console.log(`Cancelled expired reservation: ${reservation.reservationId}`);
      } catch (error) {
        console.error(`Error cancelling reservation ${reservation.reservationId}:`, error);
      }
    }

    return { cleaned: result.Items.length };
  }

  // Log stock movement
  async logStockMovement({ productId, type, quantity, reference }) {
    const movement = {
      movementId: uuidv4(),
      productId,
      type, // INITIAL, RESTOCK, SALE, RETURN, ADJUSTMENT
      quantity,
      reference,
      timestamp: Date.now()
    };

    const params = {
      TableName: tableName.stockMovements,
      Item: movement
    };

    await docClient.put(params).promise();
    return movement;
  }

  // Get stock movements history
  async getStockMovements(productId, limit = 50) {
    const params = {
      TableName: tableName.stockMovements,
      IndexName: 'ProductIdTimestampIndex',
      KeyConditionExpression: 'productId = :productId',
      ExpressionAttributeValues: {
        ':productId': productId
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    };

    const result = await docClient.query(params).promise();
    return result.Items;
  }

  // Check low stock items
  async getLowStockItems() {
    const params = {
      TableName: tableName.inventory,
      FilterExpression: 'availableStock <= lowStockThreshold'
    };

    const result = await docClient.scan(params).promise();
    return result.Items;
  }
}

module.exports = new InventoryService();
