const { dynamoDB, tableName } = require('../config/dynamodb');

async function createTables() {
  console.log('Setting up DynamoDB tables...\n');

  // Create Inventory Table
  const inventoryTableParams = {
    TableName: tableName.inventory,
    KeySchema: [
      { AttributeName: 'productId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'productId', AttributeType: 'S' },
      { AttributeName: 'sku', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SkuIndex',
        KeySchema: [
          { AttributeName: 'sku', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  // Create Reservations Table
  const reservationsTableParams = {
    TableName: tableName.reservations,
    KeySchema: [
      { AttributeName: 'reservationId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'reservationId', AttributeType: 'S' },
      { AttributeName: 'productId', AttributeType: 'S' },
      { AttributeName: 'expiresAt', AttributeType: 'N' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ProductIdIndex',
        KeySchema: [
          { AttributeName: 'productId', KeyType: 'HASH' },
          { AttributeName: 'expiresAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  // Create Stock Movements Table
  const stockMovementsTableParams = {
    TableName: tableName.stockMovements,
    KeySchema: [
      { AttributeName: 'movementId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'movementId', AttributeType: 'S' },
      { AttributeName: 'productId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ProductIdTimestampIndex',
        KeySchema: [
          { AttributeName: 'productId', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    }
  };

  try {
    // Create Inventory Table
    console.log(`Creating ${tableName.inventory} table...`);
    await dynamoDB.createTable(inventoryTableParams).promise();
    console.log(`✓ ${tableName.inventory} table created`);

    // Create Reservations Table
    console.log(`Creating ${tableName.reservations} table...`);
    await dynamoDB.createTable(reservationsTableParams).promise();
    console.log(`✓ ${tableName.reservations} table created`);

    // Create Stock Movements Table
    console.log(`Creating ${tableName.stockMovements} table...`);
    await dynamoDB.createTable(stockMovementsTableParams).promise();
    console.log(`✓ ${tableName.stockMovements} table created`);

    console.log('\n✓ All tables created successfully!');
    console.log('Waiting for tables to become active...');

    // Wait for tables to become active
    await dynamoDB.waitFor('tableExists', { TableName: tableName.inventory }).promise();
    await dynamoDB.waitFor('tableExists', { TableName: tableName.reservations }).promise();
    await dynamoDB.waitFor('tableExists', { TableName: tableName.stockMovements }).promise();

    console.log('✓ All tables are active and ready!');
  } catch (error) {
    if (error.code === 'ResourceInUseException') {
      console.log('Tables already exist. Skipping creation.');
    } else {
      console.error('Error creating tables:', error);
      throw error;
    }
  }
}

// Run if called directly
if (require.main === module) {
  createTables()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { createTables };
