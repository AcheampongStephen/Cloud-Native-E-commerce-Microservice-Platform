const express = require('express');
const { body, param } = require('express-validator');
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateInitialize = [
  body('productId').notEmpty().withMessage('Product ID is required'),
  body('sku').notEmpty().withMessage('SKU is required'),
  body('initialStock').isInt({ min: 0 }).withMessage('Initial stock must be non-negative')
];

const validateStockUpdate = [
  body('quantity').isInt().withMessage('Quantity must be an integer'),
  body('type').optional().isIn(['RESTOCK', 'SALE', 'RETURN', 'ADJUSTMENT']).withMessage('Invalid type')
];

const validateReservation = [
  body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive'),
  body('orderId').notEmpty().withMessage('Order ID is required')
];

const validateStockCheck = [
  body('items').isArray({ min: 1 }).withMessage('Items array is required'),
  body('items.*.productId').notEmpty().withMessage('Product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be positive')
];

// Public routes (read-only)
router.get('/product/:productId', inventoryController.getInventory);
router.get('/sku/:sku', inventoryController.getInventoryBySku);

// Check stock availability (used by Order Service)
router.post('/check-availability', validateStockCheck, inventoryController.checkStockAvailability);

// Admin routes
router.post('/initialize', 
  authenticate, 
  authorize('admin'), 
  validateInitialize, 
  inventoryController.initializeInventory
);

router.patch('/product/:productId/stock', 
  authenticate, 
  authorize('admin'), 
  validateStockUpdate, 
  inventoryController.updateStock
);

router.get('/low-stock', 
  authenticate, 
  authorize('admin'), 
  inventoryController.getLowStockItems
);

router.get('/product/:productId/movements', 
  authenticate, 
  authorize('admin'), 
  inventoryController.getStockMovements
);

// Reservation endpoints (used by Order Service)
router.post('/product/:productId/reserve', 
  authenticate, 
  validateReservation, 
  inventoryController.reserveStock
);

router.post('/reservation/:reservationId/confirm', 
  authenticate, 
  inventoryController.confirmReservation
);

router.post('/reservation/:reservationId/cancel', 
  authenticate, 
  inventoryController.cancelReservation
);

// Maintenance endpoint
router.post('/cleanup-expired', 
  authenticate, 
  authorize('admin'), 
  inventoryController.cleanupExpiredReservations
);

module.exports = router;
