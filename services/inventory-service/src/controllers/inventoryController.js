const inventoryService = require('../services/inventoryService');

// Get inventory for a product
exports.getInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const inventory = await inventoryService.getInventory(productId);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    res.json(inventory);
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get inventory by SKU
exports.getInventoryBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const inventory = await inventoryService.getInventoryBySku(sku);

    if (!inventory) {
      return res.status(404).json({ message: 'Inventory not found' });
    }

    res.json(inventory);
  } catch (error) {
    console.error('Get inventory by SKU error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Initialize inventory
exports.initializeInventory = async (req, res) => {
  try {
    const { productId, sku, initialStock, location } = req.body;

    const inventory = await inventoryService.initializeInventory(
      productId,
      sku,
      initialStock,
      location
    );

    res.status(201).json({
      message: 'Inventory initialized successfully',
      inventory
    });
  } catch (error) {
    console.error('Initialize inventory error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update stock
exports.updateStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, type, reference } = req.body;

    const inventory = await inventoryService.updateStock(
      productId,
      quantity,
      type,
      reference
    );

    res.json({
      message: 'Stock updated successfully',
      inventory
    });
  } catch (error) {
    console.error('Update stock error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Reserve stock
exports.reserveStock = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, orderId, expirationMinutes } = req.body;

    const reservation = await inventoryService.reserveStock(
      productId,
      quantity,
      orderId,
      expirationMinutes
    );

    res.status(201).json({
      message: 'Stock reserved successfully',
      reservation
    });
  } catch (error) {
    console.error('Reserve stock error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Confirm reservation
exports.confirmReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;

    const result = await inventoryService.confirmReservation(reservationId);

    res.json({
      message: 'Reservation confirmed successfully',
      ...result
    });
  } catch (error) {
    console.error('Confirm reservation error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Cancel reservation
exports.cancelReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;

    const result = await inventoryService.cancelReservation(reservationId);

    res.json({
      message: 'Reservation cancelled successfully',
      ...result
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get stock movements
exports.getStockMovements = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit } = req.query;

    const movements = await inventoryService.getStockMovements(
      productId,
      limit ? parseInt(limit) : 50
    );

    res.json({ movements });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get low stock items
exports.getLowStockItems = async (req, res) => {
  try {
    const items = await inventoryService.getLowStockItems();

    res.json({ items, count: items.length });
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cleanup expired reservations (cron job endpoint)
exports.cleanupExpiredReservations = async (req, res) => {
  try {
    const result = await inventoryService.cleanupExpiredReservations();

    res.json({
      message: 'Cleanup completed',
      ...result
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Bulk check stock availability
exports.checkStockAvailability = async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, quantity }

    const availability = [];

    for (const item of items) {
      const inventory = await inventoryService.getInventory(item.productId);
      
      availability.push({
        productId: item.productId,
        requestedQuantity: item.quantity,
        available: inventory ? inventory.availableStock >= item.quantity : false,
        availableStock: inventory ? inventory.availableStock : 0
      });
    }

    res.json({ availability });
  } catch (error) {
    console.error('Check stock availability error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
