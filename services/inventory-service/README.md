# Inventory Service

Real time inventory management for the cloud native e commerce platform.

This service keeps track of stock levels, reservations, low stock alerts, and a full audit trail of stock movements. It is built for fast reads and writes using DynamoDB and is designed to work together with the Product and Order services.

---

## Tech Stack

- Node.js + Express
- AWS SDK (DynamoDB)
- DynamoDB Local for development
- JWT based authentication and authorization (shared with User Service)
- Redis (reserved for future caching)
- Nodemon for local development

Ports and services in the current setup:

- **User Service** (Node.js + MongoDB Atlas) on port `3001`
- **Product Service** (Node.js + MongoDB Atlas) on port `3002`
- **Inventory Service** (this service) on port `3003`
- **Order Service** (FastAPI + PostgreSQL) on port `8000`

---

## What This Service Does

The Inventory Service provides:

- Inventory records per product and SKU
- Stock initialization when a product is created
- Stock updates for restocks and adjustments
- Stock reservations during checkout
- Confirmation and cancellation of reservations
- Automatic cleanup of expired reservations
- Low stock reporting
- Stock movement history for auditing
- Bulk stock availability checks for carts

This service is the source of truth for product stock in the platform.

---

## Prerequisites

You should have the following installed locally:

- Node.js 18 or later
- npm
- Docker (for DynamoDB Local)
- curl or Postman for testing

You should already have the User Service running, because some endpoints require an admin JWT from that service.

---

## Project Structure

Inside `services/inventory-service` you will see something similar to:

```text
inventory-service/
  Dockerfile
  package.json
  .env (not committed)
  src/
    index.js
    config/
      dynamodb.js
    controllers/
      inventoryController.js
    middleware/
      auth.js
    routes/
      inventory.js
    services/
      inventoryService.js
    utils/
      setupDynamoDB.js
```

---

## 1. Install Dependencies

From the root of the inventory service folder:

```bash
cd services/inventory-service

npm install
```

This installs Express, AWS SDK, JWT, validation, and other dependencies used by the service.

---

## 2. Configure Environment

Create a `.env` file in `services/inventory-service`:

```env
PORT=3003
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# AWS DynamoDB
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
DYNAMODB_ENDPOINT=http://localhost:8001
USE_LOCAL_DYNAMODB=true

# DynamoDB Tables
INVENTORY_TABLE=inventory
RESERVATIONS_TABLE=inventory_reservations
STOCK_MOVEMENTS_TABLE=stock_movements

# Service URLs
PRODUCT_SERVICE_URL=http://localhost:3002

# Redis (optional for now)
REDIS_URL=redis://localhost:6379
```

You can keep these values for local development. In real AWS environments you will remove `USE_LOCAL_DYNAMODB` and rely on real credentials and endpoints.

---

## 3. Start DynamoDB Local

Use Docker to start a local DynamoDB instance on port `8001`:

```bash
docker run -d   --name dynamodb-local   -p 8001:8000   amazon/dynamodb-local
```

You only need to run this once. After that you can start and stop the container:

```bash
docker start dynamodb-local
docker stop dynamodb-local
```

---

## 4. Create DynamoDB Tables

The service ships with a script that creates the three required tables:

- `inventory`
- `inventory_reservations`
- `stock_movements`

Run the setup script:

```bash
npm run setup-db
```

You should see log output similar to:

```text
Setting up DynamoDB tables...

Creating inventory table...
✓ inventory table created
Creating inventory_reservations table...
✓ inventory_reservations table created
Creating stock_movements table...
✓ stock_movements table created

✓ All tables created successfully!
✓ All tables are active and ready!
```

If the tables already exist, the script prints a message and continues.

---

## 5. Run the Inventory Service

Start the service in development mode:

```bash
npm run dev
```

You should see:

```text
✓ Inventory Service running on port 3003
```

Nodemon will restart the service automatically when you change files.

---

## 6. Health Check

Verify that the service is alive:

```bash
curl http://localhost:3003/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "inventory-service",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

The exact timestamp will be different on your machine.

---

## 7. Authentication

Many endpoints require a JWT in the `Authorization` header.

The token comes from the User Service. Log in as an admin:

```bash
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"admin@ecommerce.com","password":"Admin123456"}'
```

Copy the `token` from the response and use it as:

```text
Authorization: Bearer YOUR_ADMIN_TOKEN
```

Customer users can also log in and get tokens to reserve stock:

```bash
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"john.doe@example.com","password":"SecurePass123"}'
```

---

## 8. Core Concepts

### 8.1 Inventory

Each product has one record in the `inventory` table:

- `productId`
- `sku`
- `availableStock`
- `reservedStock`
- `totalStock`
- `location`
- thresholds and reorder settings
- timestamps

### 8.2 Reservations

When a customer checks out, stock is not removed immediately. Instead, a reservation is created:

- Stock moves from `availableStock` to `reservedStock`
- A reservation record is created with an expiry time
- If payment succeeds, the reservation is confirmed
- If payment fails or expires, the reservation is cancelled and stock returns to `availableStock`

### 8.3 Stock Movements

Every important stock change writes an entry to `stock_movements`:

- Initial creation
- Restocks
- Sales
- Returns
- Manual adjustments

This gives you an audit trail for later analysis.

---

## 9. API Endpoints

### Public (no auth)

| Method | Path                                | Description                   |
| ------ | ----------------------------------- | ----------------------------- |
| GET    | `/health`                           | Health check                  |
| GET    | `/api/inventory/product/:productId` | Get inventory for product     |
| GET    | `/api/inventory/sku/:sku`           | Get inventory by SKU          |
| POST   | `/api/inventory/check-availability` | Bulk stock availability check |

### Admin

Requires `Authorization: Bearer ADMIN_TOKEN` and `role: admin` in the token payload.

| Method | Path                                          | Description                     |
| ------ | --------------------------------------------- | ------------------------------- |
| POST   | `/api/inventory/initialize`                   | Initialize inventory record     |
| PATCH  | `/api/inventory/product/:productId/stock`     | Update stock (restock, adjust)  |
| GET    | `/api/inventory/low-stock`                    | Get low stock items             |
| GET    | `/api/inventory/product/:productId/movements` | Get stock movement history      |
| POST   | `/api/inventory/cleanup-expired`              | Trigger cleanup of reservations |

### Reservations (used by Order Service and customers)

Requires a valid JWT (customer or admin).

| Method | Path                                                | Description                   |
| ------ | --------------------------------------------------- | ----------------------------- |
| POST   | `/api/inventory/product/:productId/reserve`         | Reserve stock for an order    |
| POST   | `/api/inventory/reservation/:reservationId/confirm` | Confirm reservation after pay |
| POST   | `/api/inventory/reservation/:reservationId/cancel`  | Cancel reservation            |

---

## 10. Example Workflows

### 10.1 Initialize Inventory (Admin)

```bash
curl -X POST http://localhost:3003/api/inventory/initialize   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "productId": "692cc529439b2ea96b10e98b",
    "sku": "MBP-16-M3MAX-001",
    "initialStock": 50,
    "location": "Warehouse A"
  }'
```

Another product:

```bash
curl -X POST http://localhost:3003/api/inventory/initialize   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "productId": "692cc53c439b2ea96b10e98e",
    "sku": "IPHONE-15-PRO-001",
    "initialStock": 100,
    "location": "Warehouse A"
  }'
```

### 10.2 Get Inventory

By product id:

```bash
curl http://localhost:3003/api/inventory/product/692cc529439b2ea96b10e98b
```

By SKU:

```bash
curl http://localhost:3003/api/inventory/sku/MBP-16-M3MAX-001
```

### 10.3 Bulk Stock Availability

This is used by the Order Service during checkout, but you can test it directly:

```bash
curl -X POST http://localhost:3003/api/inventory/check-availability   -H "Content-Type: application/json"   -d '{
    "items": [
      {
        "productId": "692cc529439b2ea96b10e98b",
        "quantity": 2
      },
      {
        "productId": "692cc53c439b2ea96b10e98e",
        "quantity": 5
      }
    ]
  }'
```

### 10.4 Reserve Stock

Log in as a customer and use the token:

```bash
curl -X POST http://localhost:3003/api/inventory/product/692cc529439b2ea96b10e98b/reserve   -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"   -H "Content-Type: application/json"   -d '{
    "quantity": 1,
    "orderId": "test-order-123",
    "expirationMinutes": 15
  }'
```

Save the `reservationId` from the response.

### 10.5 Confirm Reservation

After payment succeeds:

```bash
curl -X POST http://localhost:3003/api/inventory/reservation/RESERVATION_ID_HERE/confirm   -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"
```

This does the following:

- Decreases `reservedStock`
- Decreases `totalStock`
- Writes a `SALE` stock movement
- Marks the reservation as `CONFIRMED`

### 10.6 Cancel Reservation

If the order is cancelled or payment fails:

```bash
curl -X POST http://localhost:3003/api/inventory/reservation/RESERVATION_ID_HERE/cancel   -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"
```

This returns the reserved quantity back to `availableStock` and marks the reservation as `CANCELLED`.

### 10.7 Restock Inventory (Admin)

```bash
curl -X PATCH "http://localhost:3003/api/inventory/product/692cc529439b2ea96b10e98b/stock"   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{
    "quantity": 25,
    "type": "RESTOCK",
    "reference": "Purchase Order #PO-2024-001"
  }'
```

This increases `availableStock` and `totalStock` and writes a `RESTOCK` movement.

### 10.8 View Stock Movements (Admin)

```bash
curl "http://localhost:3003/api/inventory/product/692cc529439b2ea96b10e98b/movements"   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 10.9 Low Stock Items (Admin)

```bash
curl "http://localhost:3003/api/inventory/low-stock"   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 10.10 Cleanup Expired Reservations (Admin)

Reservations are cleaned periodically inside the service, but you can trigger it manually:

```bash
curl -X POST "http://localhost:3003/api/inventory/cleanup-expired"   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 11. Integration With Other Services

- **Product Service**: Provides product ids and SKUs. When new products are created you can initialize inventory entries for them.
- **Order Service**: Calls the inventory service to check availability and create reservations during checkout.
- **Payment Service** (future): After a successful payment it will call the confirm reservation endpoint. If payment fails it will cancel the reservation.

This service is now ready to take part in the larger platform once you wire those flows together.

---

## 12. Next Steps

From here you can:

- Hook the Order Service to the reservation and availability endpoints
- Add a Payment Service that confirms or cancels reservations based on payment status
- Add Docker support and include this service in your `docker-compose.yml`
- Expose it through API Gateway once you move to AWS

The Inventory Service is now production ready for local development. You can evolve the schema, tuning, and indexes later as you see real traffic patterns.
