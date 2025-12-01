# Order Service (FastAPI + PostgreSQL)

This service handles order creation, pricing, status updates and integration with the User and Product services in the Cloud-Native E-commerce Microservice Platform.

It is built with **FastAPI**, **SQLAlchemy**, and **PostgreSQL**, and exposes a REST API secured with JWTs issued by the User Service.

---

## Features

- Create orders from product IDs and quantities  
- Pull product details from the Product Service via HTTP  
- Calculate subtotal, tax, shipping cost, and totals  
- Store denormalized product and customer snapshots on the order  
- Track full order lifecycle:
  - `pending → confirmed → processing → shipped → delivered`
- Support cancellations (while order is not shipped or delivered)
- Role-based access:
  - Customers see and manage their own orders
  - Admins can view and update all orders
- Swagger UI documentation at `/docs`

---

## Tech Stack

- **Language**: Python 3.11  
- **Framework**: FastAPI  
- **Database**: PostgreSQL  
- **ORM**: SQLAlchemy (sync + async engines)  
- **Auth**: JWT (python-jose)  
- **Caching / future use**: Redis  
- **Containerization**: Docker  

---

## Project Structure

```text
order-service/
├── app/
│   ├── database/
│   │   └── database.py          # Sync and async DB engines and session deps
│   ├── models/
│   │   ├── __init__.py
│   │   └── order.py             # Order and OrderItem models, enums
│   ├── routes/
│   │   ├── __init__.py
│   │   └── orders.py            # FastAPI routes for orders
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── order.py             # Pydantic schemas
│   ├── services/
│   │   ├── __init__.py
│   │   └── order_service.py     # Business logic for orders
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py              # JWT auth, current user/admin helpers
│   └── main.py                  # FastAPI app, CORS, health check
├── alembic.ini                  # Alembic configuration (migrations)
├── Dockerfile
├── requirements.txt
├── run.py                       # Uvicorn entrypoint
├── .env                         # Local environment variables
└── .gitignore
```

---

## Environment Variables

Create a `.env` file in the root of the `order-service` directory:

```env
# Application
APP_NAME=Order Service
APP_VERSION=1.0.0
DEBUG=True
PORT=8000

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orders
ASYNC_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/orders

# JWT
SECRET_KEY=your-super-secret-jwt-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Service URLs
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
INVENTORY_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004

# Redis (for caching)
REDIS_URL=redis://localhost:6379/0
```

---

## Installation and Setup

### 1. Create the service folder

From the monorepo root:

```bash
cd /a/Cloud-Native-E-commerce-Microservice-Platform/ecommerce-platform/services

mkdir -p order-service/{app/{models,routes,schemas,services,middleware,database},tests}
cd order-service
```

### 2. Python dependencies

`requirements.txt`:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.1
redis==5.0.1
python-dotenv==1.0.0
asyncpg==0.29.0
```

Create and activate a virtual environment:

```bash
python -m venv venv

# On Windows (Git Bash / PowerShell)
source venv/Scripts/activate

# On macOS / Linux
# source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## Database

### Run PostgreSQL with Docker

```bash
docker run -d   --name postgres-orders   -e POSTGRES_USER=postgres   -e POSTGRES_PASSWORD=postgres   -e POSTGRES_DB=orders   -p 5432:5432   postgres:15-alpine
```

The service uses `SQLAlchemy` for models and can be wired to Alembic for schema migrations via `alembic.ini`.

---

## Running the Service Locally

From the `order-service` directory with your virtualenv activated:

```bash
python run.py
```

You should see logs similar to:

```text
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Health check:

```bash
curl http://localhost:8000/health
```

Interactive API docs:

- Open your browser and go to: `http://localhost:8000/docs`

---

## Core API Endpoints

All endpoints are prefixed with `/api/orders` and require a **Bearer JWT** in the `Authorization` header, except `/health` and `/`.

### Customer endpoints

- `POST /api/orders`  
  Create a new order for the authenticated user.  
  Request body uses `OrderCreate` schema.

- `GET /api/orders`  
  Paginated list of the current users orders.  
  Query params: `page`, `limit`.

- `GET /api/orders/{order_id}`  
  Get a single order by ID (only if owned by the user, or user is admin).

- `GET /api/orders/number/{order_number}`  
  Fetch order by `order_number`.

- `DELETE /api/orders/{order_id}/cancel`  
  Cancel an order while it is not shipped or delivered.

### Admin endpoints

- `GET /api/orders/all`  
  Paginated list of all orders in the system.  
  Optional filter by `status`.

- `PUT /api/orders/{order_id}`  
  Update an order (status, tracking, internal notes, etc.).

- `PATCH /api/orders/{order_id}/status`  
  Update only the order status.

---

## Example: Creating an Order

Assuming:

- User Service is running on `http://localhost:3001`  
- Product Service is running on `http://localhost:3002`  
- You have a valid **customer JWT** and at least one product in the catalog  

### 1. Log in as a customer and get a token

```bash
curl -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"john.doe@example.com","password":"SecurePass123"}'
```

Copy the `token` from the response and set it in your terminal as `CUSTOMER_TOKEN`.

### 2. List products and pick one or more IDs

```bash
curl http://localhost:3002/api/products
```

Copy one or more product IDs.

### 3. Create an order

```bash
curl -X POST http://localhost:8000/api/orders   -H "Authorization: Bearer YOUR_CUSTOMER_TOKEN"   -H "Content-Type: application/json"   -d '{
    "items": [
      {
        "product_id": "PRODUCT_ID_1",
        "quantity": 1
      },
      {
        "product_id": "PRODUCT_ID_2",
        "quantity": 2
      }
    ],
    "shipping_address": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "billing_address": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA"
    },
    "customer_notes": "Please deliver during business hours",
    "payment_method": "credit_card"
  }'
```

The response will include:

- `id`
- `order_number`
- `status`, `payment_status`
- Calculated `subtotal`, `tax`, `shipping_cost`, `total`
- List of `items` with denormalized product data

---

## Example: Admin Order Management

Log in as admin and get an admin token from the User Service, then:

```bash
# Get all orders
curl http://localhost:8000/api/orders/all   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Filter by status
curl "http://localhost:8000/api/orders/all?status=pending"   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Update order status
curl -X PATCH http://localhost:8000/api/orders/ORDER_ID_HERE/status   -H "Authorization: Bearer YOUR_ADMIN_TOKEN"   -H "Content-Type: application/json"   -d '{"status": "confirmed"}'
```

---

## Integration Test Script

You can automate a full happy-path integration test across the User, Product and Order services with a helper script like `test-full-integration.sh`:

```bash
#!/bin/bash
echo "=== Full E-commerce Platform Integration Test ==="
echo ""

GREEN='[0;32m'
BLUE='[0;34m'
NC='[0m'

echo -e "${BLUE}1. Logging in as customer...${NC}"
CUSTOMER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login   -H "Content-Type: application/json"   -d '{"email":"john.doe@example.com","password":"SecurePass123"}')

CUSTOMER_TOKEN=$(echo $CUSTOMER_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Customer logged in${NC}"
echo ""

echo -e "${BLUE}2. Fetching available products...${NC}"
PRODUCTS=$(curl -s http://localhost:3002/api/products)
PRODUCT_ID=$(echo $PRODUCTS | grep -o '"_id":"[^"]*' | head -1 | cut -d'"' -f4)
echo -e "${GREEN}✓ Found products${NC}"
echo "Using Product ID: $PRODUCT_ID"
echo ""

echo -e "${BLUE}3. Creating order...${NC}"
ORDER_RESPONSE=$(curl -s -X POST http://localhost:8000/api/orders   -H "Authorization: Bearer $CUSTOMER_TOKEN"   -H "Content-Type: application/json"   -d "{
    \"items\": [
      {
        \"product_id\": \"$PRODUCT_ID\",
        \"quantity\": 1
      }
    ],
    \"shipping_address\": {
      \"street\": \"123 Test St\",
      \"city\": \"New York\",
      \"state\": \"NY\",
      \"zipCode\": \"10001\",
      \"country\": \"USA\"
    }
  }")

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ORDER_NUMBER=$(echo $ORDER_RESPONSE | grep -o '"order_number":"[^"]*' | cut -d'"' -f4)

echo -e "${GREEN}✓ Order created${NC}"
echo "Order ID: $ORDER_ID"
echo "Order Number: $ORDER_NUMBER"
echo ""

echo -e "${BLUE}4. Fetching order details...${NC}"
ORDER_DETAILS=$(curl -s http://localhost:8000/api/orders/$ORDER_ID   -H "Authorization: Bearer $CUSTOMER_TOKEN")
echo -e "${GREEN}✓ Order details retrieved${NC}"
echo ""

echo -e "${GREEN}=== Integration Test Complete ===${NC}"
```

Make it executable and run:

```bash
chmod +x test-full-integration.sh
./test-full-integration.sh
```

---

## Next Steps

- Wire in Alembic migrations for schema evolution  
- Add payment integration (Stripe or PayPal) and tie into `PaymentStatus`  
- Use Redis for caching heavy reads or for idempotency keys  
- Add observability (logging, metrics, tracing) for production  
