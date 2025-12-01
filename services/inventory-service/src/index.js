const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const inventoryRoutes = require('./routes/inventory');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'inventory-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/inventory', inventoryRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

const PORT = process.env.PORT || 3003;

// Cleanup expired reservations every 5 minutes
const inventoryService = require('./services/inventoryService');
setInterval(async () => {
  try {
    const result = await inventoryService.cleanupExpiredReservations();
    if (result.cleaned > 0) {
      console.log(`Cleaned up ${result.cleaned} expired reservations`);
    }
  } catch (error) {
    console.error('Error cleaning up reservations:', error);
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✓ Inventory Service running on port ${PORT}`);
});
