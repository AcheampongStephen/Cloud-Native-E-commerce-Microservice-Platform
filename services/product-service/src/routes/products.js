const express = require('express');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateProduct = [
  body('name').trim().notEmpty().withMessage('Product name is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('sku').trim().notEmpty().withMessage('SKU is required'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer')
];

// Public routes
router.get('/', optionalAuth, productController.getAllProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/sku/:sku', productController.getProductBySku);
router.get('/:id', productController.getProductById);

// Admin routes
router.post('/', 
  authenticate, 
  authorize('admin'), 
  validateProduct, 
  productController.createProduct
);

router.put('/:id', 
  authenticate, 
  authorize('admin'), 
  productController.updateProduct
);

router.delete('/:id', 
  authenticate, 
  authorize('admin'), 
  productController.deleteProduct
);

router.patch('/:id/stock', 
  authenticate, 
  authorize('admin'), 
  productController.updateStock
);

module.exports = router;
