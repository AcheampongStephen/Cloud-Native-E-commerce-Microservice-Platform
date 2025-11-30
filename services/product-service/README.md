# Product Service (Node.js + Express + MongoDB)

The Product Service is a dedicated microservice in the Cloud Native E-commerce Platform.  
It handles product data, categories, inventory, search, and metadata, and exposes a clean REST API for the rest of the system.

This service is built with Node.js, Express, and MongoDB, and is designed to be secure, modular, and easy to extend.

---

## Features

- Product CRUD (create, read, update, delete)
- Category management (with optional parent categories)
- SKU-based product lookup
- Text search across name, description, and tags
- Price range filtering
- Brand and category filtering
- Pagination and sorting
- Featured product listing
- Stock updates and low-stock awareness
- JWT-based authentication and role-based authorization
- Centralized error handling and validation
- Docker support for containerized deployments

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express
- **Database:** MongoDB with Mongoose
- **Security and Hardening:** Helmet, rate limiting, CORS
- **Auth:** JWT
- **Validation:** express-validator
- **File Handling / Cloud (future):** multer, AWS SDK, S3
- **Containerization:** Docker

---

## Project Structure

```bash
product-service
├── src
│   ├── controllers
│   │   └── productController.js
│   ├── middleware
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models
│   │   ├── Product.js
│   │   └── Category.js
│   ├── routes
│   │   ├── products.js
│   │   └── categories.js
│   └── utils
│
├── .env
├── Dockerfile
├── package.json
└── README.md
```

---

## Prerequisites

- Node.js 18 or later
- npm
- MongoDB Atlas cluster or a reachable MongoDB instance
- User Service running with JWT support (for admin tokens)
- Docker (optional, for containerized runs)

---

## Setup and Installation

### 1. Create Product Service directory

From your monorepo root:

```bash
cd /a/Cloud-Native-E-commerce-Microservice-Platform/ecommerce-platform/services

# Create product service directory
mkdir -p product-service/src/{models,routes,middleware,controllers,utils}
cd product-service
```

### 2. Initialize the service

```bash
npm init -y
```

### 3. Install dependencies

```bash
npm install express mongoose dotenv cors helmet express-rate-limit express-validator multer aws-sdk uuid jsonwebtoken
npm install -D nodemon
```

> Note: `jsonwebtoken` is required by the `auth` middleware. If you forget to install it, you will see a `Cannot find module 'jsonwebtoken'` error.

### 4. package.json

Your `package.json` should look like this:

```json
{
  "name": "product-service",
  "version": "1.0.0",
  "description": "Product microservice for e-commerce platform",
  "main": "src/index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "echo "Error: no test specified" && exit 1"
  },
  "keywords": ["microservice", "product", "ecommerce"],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.3",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-validator": "^7.0.1",
    "multer": "^1.4.5-lts.1",
    "aws-sdk": "^2.1691.0",
    "uuid": "^9.0.1",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 5. Environment file

Create a `.env` file in the root of `product-service` and configure it with your own values:

```env
PORT=3002
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/products?retryWrites=true&w=majority&appName=ecommerce-cluster
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development

# AWS S3 Configuration (used later for image uploads)
AWS_REGION=us-east-1
AWS_BUCKET_NAME=ecommerce-product-images
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

> Do not commit real credentials to version control. Use environment variables or a secrets manager in production.

---

## Core Implementation Overview

The code files are already wired to give you a complete, production-style product engine.

### Product model

`src/models/Product.js` defines a rich product schema with fields for pricing, inventory, SEO, tags, specs, images, and a set of helpful virtuals for discount percentage, stock status, and low stock.

### Category model

`src/models/Category.js` handles named categories with optional `parentCategory`, slugs, sorting, and active flags.

### Auth middleware

`src/middleware/auth.js` exposes:

- `authenticate` to validate JWTs
- `authorize(...roles)` to enforce role-based access (for example, `admin`)
- `optionalAuth` to attach user details when a token is present without failing if there is none

### Error handler

`src/middleware/errorHandler.js` centralizes:

- Mongoose validation errors
- Duplicate key errors
- JWT errors
- Generic server errors

### Product controller

`src/controllers/productController.js` handles:

- Listing products with filtering, pagination, and sorting
- Fetching by ID or SKU
- Creating, updating, and deleting products
- Updating stock
- Fetching featured products

### Routes

- `src/routes/products.js` exposes public and admin-only product routes.
- `src/routes/categories.js` exposes public and admin-only category routes.

### Main server

`src/index.js` boots the service, wires middleware, binds routes, and connects to MongoDB.

---

## Running the Service

### Development

```bash
npm run dev
```

You should see something like:

```text
✓ MongoDB connected successfully
✓ Product Service running on port 3002
```

### Production

```bash
npm start
```

---

## Docker

### Dockerfile

A basic Dockerfile is included:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "src/index.js"]
```

### Build and run

```bash
docker build -t product-service .
docker run -p 3002:3002 --env-file .env product-service
```

---

## API Overview

Base URL:

```text
http://localhost:3002
```

### Health

- `GET /health`  
  Returns basic service status, service name, and timestamp.

### Categories

- `GET /api/categories`  
- `GET /api/categories/:slug`  
- `POST /api/categories` (admin only)  
- `PUT /api/categories/:id` (admin only)  
- `DELETE /api/categories/:id` (admin only)  

### Products

- `GET /api/products` (supports filters, pagination, sorting)
- `GET /api/products/featured`
- `GET /api/products/sku/:sku`
- `GET /api/products/:id`
- `POST /api/products` (admin only)
- `PUT /api/products/:id` (admin only)
- `DELETE /api/products/:id` (admin only)
- `PATCH /api/products/:id/stock` (admin only)

---

## Manual Testing Guide (Exact Examples)

This section preserves your original test flow and curl examples as given, so you can run everything step by step.

### Testing Product Service

Keep the Product Service running in one terminal and open a new terminal for testing.

#### Step 1: Health Check ✅

```bash
curl http://localhost:3002/health
```

Expected:

```json
{
  "status": "healthy",
  "service": "product-service",
  "timestamp": "2024-..."
}
```

#### Step 2: Create an Admin User (in User Service)

We need an admin token to create products. Let's create an admin user in the User Service first.

First, update the User Service to allow admin registration. Open a new terminal:

```bash
cd /a/Cloud-Native-E-commerce-Microservice-Platform/ecommerce-platform/services/user-service
```

Create a simple script to create an admin user:

```bash
cat > create-admin.js << 'EOF'
const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@ecommerce.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const admin = new User({
      email: 'admin@ecommerce.com',
      password: 'Admin123456',
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin'
    });

    await admin.save();
    console.log('✓ Admin user created successfully');
    console.log('Email: admin@ecommerce.com');
    console.log('Password: Admin123456');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdmin();
EOF
```

Run the script:

```bash
node create-admin.js
```

Now login as admin to get the token:

```bash
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@ecommerce.com","password":"Admin123456"}'
```

Copy the token from the response and save it as `ADMIN_TOKEN`.

---

#### Step 3: Create Categories

First, create some categories:

```bash
# Replace YOUR_ADMIN_TOKEN with the actual token
ADMIN_TOKEN="your_admin_token_here"

# Create Electronics category
curl -X POST http://localhost:3002/api/categories   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Electronics",
    "slug": "electronics",
    "description": "Electronic devices and gadgets",
    "sortOrder": 1
  }'
```

```bash
# Create Laptops subcategory
curl -X POST http://localhost:3002/api/categories   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Laptops",
    "slug": "laptops",
    "description": "Laptop computers",
    "sortOrder": 1
  }'
```

```bash
# Create Clothing category
curl -X POST http://localhost:3002/api/categories   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Clothing",
    "slug": "clothing",
    "description": "Apparel and fashion",
    "sortOrder": 2
  }'
```

---

#### Step 4: Get All Categories (Public)

```bash
curl http://localhost:3002/api/categories
```

Expected: Array of categories you just created.

---

#### Step 5: Create Products (Admin)

```bash
# Create Product 1 - MacBook Pro
curl -X POST http://localhost:3002/api/products   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "MacBook Pro 16-inch",
    "description": "Powerful laptop with M3 Max chip, perfect for professionals and creators",
    "shortDescription": "16-inch MacBook Pro with M3 Max chip",
    "price": 2499,
    "comparePrice": 2999,
    "sku": "MBP-16-M3MAX-001",
    "category": "Electronics",
    "subcategory": "Laptops",
    "brand": "Apple",
    "stock": 50,
    "lowStockThreshold": 10,
    "specifications": {
      "processor": "Apple M3 Max",
      "ram": "32GB",
      "storage": "1TB SSD",
      "display": "16-inch Liquid Retina XDR",
      "graphics": "38-core GPU"
    },
    "tags": ["laptop", "apple", "macbook", "professional"],
    "isFeatured": true,
    "weight": {
      "value": 2.1,
      "unit": "kg"
    },
    "dimensions": {
      "length": 35.57,
      "width": 24.81,
      "height": 1.68,
      "unit": "cm"
    },
    "images": [
      {
        "url": "https://example.com/macbook-pro-1.jpg",
        "alt": "MacBook Pro front view",
        "isPrimary": true
      }
    ]
  }'
```

```bash
# Create Product 2 - iPhone 15 Pro
curl -X POST http://localhost:3002/api/products   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "iPhone 15 Pro",
    "description": "The latest iPhone with titanium design and A17 Pro chip",
    "shortDescription": "iPhone 15 Pro with A17 Pro chip",
    "price": 999,
    "comparePrice": 1099,
    "sku": "IPHONE-15-PRO-001",
    "category": "Electronics",
    "subcategory": "Smartphones",
    "brand": "Apple",
    "stock": 100,
    "specifications": {
      "processor": "A17 Pro",
      "storage": "256GB",
      "display": "6.1-inch Super Retina XDR",
      "camera": "48MP Main + 12MP Ultra Wide + 12MP Telephoto"
    },
    "tags": ["phone", "smartphone", "apple", "iphone"],
    "isFeatured": true
  }'
```

```bash
# Create Product 3 - Men's T-Shirt
curl -X POST http://localhost:3002/api/products   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Classic Cotton T-Shirt",
    "description": "Comfortable 100% cotton t-shirt in multiple colors",
    "shortDescription": "Premium cotton t-shirt",
    "price": 29.99,
    "sku": "TSHIRT-COTTON-001",
    "category": "Clothing",
    "subcategory": "Mens",
    "brand": "Generic",
    "stock": 200,
    "tags": ["clothing", "tshirt", "cotton", "casual"],
    "isFeatured": false
  }'
```

---

#### Step 6: Get All Products (Public)

```bash
curl http://localhost:3002/api/products
```

Expected: List of all products with pagination.

---

#### Step 7: Get Products with Filters

```bash
# Filter by category
curl "http://localhost:3002/api/products?category=Electronics"

# Filter by price range
curl "http://localhost:3002/api/products?minPrice=500&maxPrice=1500"

# Filter by brand
curl "http://localhost:3002/api/products?brand=Apple"

# Search products
curl "http://localhost:3002/api/products?search=laptop"

# Get featured products only
curl "http://localhost:3002/api/products?isFeatured=true"

# Pagination
curl "http://localhost:3002/api/products?page=1&limit=10"

# Sort by price (ascending)
curl "http://localhost:3002/api/products?sort=price"

# Sort by price (descending)
curl "http://localhost:3002/api/products?sort=-price"
```

---

#### Step 8: Get Featured Products

```bash
curl http://localhost:3002/api/products/featured
```

---

#### Step 9: Get Single Product by ID

First, get a product ID from one of the previous responses, then:

```bash
curl http://localhost:3002/api/products/PRODUCT_ID_HERE
```

---

#### Step 10: Get Product by SKU

```bash
curl http://localhost:3002/api/products/sku/MBP-16-M3MAX-001
```

---

#### Step 11: Update Product (Admin)

```bash
curl -X PUT http://localhost:3002/api/products/PRODUCT_ID_HERE   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "price": 2399,
    "stock": 45
  }'
```

---

#### Step 12: Update Stock (Admin)

```bash
curl -X PATCH http://localhost:3002/api/products/PRODUCT_ID_HERE/stock   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "quantity": 30
  }'
```

---

#### Step 13: Test Error Handling

Try creating a product without a token:

```bash
curl -X POST http://localhost:3002/api/products   -H "Content-Type: application/json"   -d '{
    "name": "Test Product"
  }'
```

Expected:

```json
{"message":"No token provided"}
```

Try creating a product with a duplicate SKU:

```bash
curl -X POST http://localhost:3002/api/products   -H "Authorization: Bearer $ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "name": "Duplicate Product",
    "description": "Test",
    "price": 100,
    "sku": "MBP-16-M3MAX-001",
    "category": "Electronics",
    "stock": 10
  }'
```

Expected:

```json
{"message":"sku already exists"}
```

---

#### Step 14: Delete Product (Admin)

```bash
curl -X DELETE http://localhost:3002/api/products/PRODUCT_ID_HERE   -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

### Quick Test Script

Create a test file for easy testing:

```bash
cat > test-product-service.sh << 'EOF'
#!/bin/bash

# Set your admin token here
ADMIN_TOKEN="YOUR_TOKEN_HERE"

echo "=== Testing Product Service ==="
echo ""

echo "1. Health Check"
curl -s http://localhost:3002/health | json_pp
echo -e "
"

echo "2. Get All Categories"
curl -s http://localhost:3002/api/categories | json_pp
echo -e "
"

echo "3. Get All Products"
curl -s http://localhost:3002/api/products | json_pp
echo -e "
"

echo "4. Get Featured Products"
curl -s http://localhost:3002/api/products/featured | json_pp
echo -e "
"

echo "5. Filter Electronics"
curl -s "http://localhost:3002/api/products?category=Electronics" | json_pp
echo -e "
"

echo "=== Tests Complete ==="
EOF

chmod +x test-product-service.sh
```

Run it with:

```bash
./test-product-service.sh
```

---

## What Is Working ✅

- Product CRUD operations
- Category management
- Product search and filtering
- Pagination
- Sorting
- Stock management
- Admin authorization
- Public and protected routes
- Featured products
- SKU lookup
- Price filtering
- Brand filtering
- Text search