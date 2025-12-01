const AWS = require('aws-sdk');
require('dotenv').config();

// Configure AWS
const config = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Use local DynamoDB if specified
if (process.env.USE_LOCAL_DYNAMODB === 'true') {
  config.endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8001';
  config.accessKeyId = 'local';
  config.secretAccessKey = 'local';
} else if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  config.accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  config.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
}

AWS.config.update(config);

const dynamoDB = new AWS.DynamoDB();
const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
  dynamoDB,
  docClient,
  tableName: {
    inventory: process.env.INVENTORY_TABLE || 'inventory',
    reservations: process.env.RESERVATIONS_TABLE || 'inventory_reservations',
    stockMovements: process.env.STOCK_MOVEMENTS_TABLE || 'stock_movements'
  }
};
