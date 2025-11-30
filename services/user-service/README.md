# Cloud Native E-commerce Microservice Platform

This project is a cloud ready e-commerce platform built as a set of independent microservices. Each service is designed to be deployed, scaled, and maintained on its own, while still working together as a single system.

Right now you have:

- ✅ **User Service** (Node.js + Express + MongoDB Atlas) with full auth
- ✅ **AWS VPC infrastructure** defined in Terraform (for future deployment)
- 🛠 **Planned**: Product Service, Order Service, and shared tooling (Docker Compose, CI/CD, etc.)

This README focuses on the current implementation and how to run, test, and extend it.

---

## High Level Architecture

At a high level, the platform is split into:

- **User Service**  
  Handles registration, login, JWT based authentication, and user profile management.

- **Product Service** *(planned)*  
  Will manage products, categories, inventory, pricing, and product search.

- **Order Service** *(planned)*  
  Will handle order creation, order history, status updates, and integration with payment and inventory.

- **Infrastructure (Terraform + AWS)**  
  Defines a cloud environment for the platform:
  - VPC
  - Subnets
  - Security groups
  - Gateways and routing
  - ECS/EKS or EC2 (depending on deployment strategy)

The goal is a fully cloud native setup where each service can run in containers and be wired together with load balancers, service discovery, and shared observability.

---

## Tech Stack

**Backend**

- Node.js
- Express
- MongoDB Atlas (managed cloud database)
- Mongoose
- JSON Web Tokens (JWT)
- bcryptjs (password hashing)

**Security & Middleware**

- Helmet
- CORS
- express-rate-limit
- express-validator

**Infrastructure**

- Terraform
- AWS VPC and related networking components
- Docker (for containerizing services)

---

## Repository Structure

A typical layout (adjust this to your actual repo if needed):

```bash
Cloud-Native-E-commerce-Microservice-Platform/
├─ ecommerce-platform/
│  ├─ services/
│  │  ├─ user-service/
│  │  │  ├─ src/
│  │  │  │  ├─ index.js
│  │  │  │  ├─ models/
│  │  │  │  │  └─ User.js
│  │  │  │  ├─ routes/
│  │  │  │  │  ├─ auth.js
│  │  │  │  │  └─ user.js
│  │  │  │  └─ middleware/
│  │  │  │     ├─ auth.js
│  │  │  │     └─ errorHandler.js
│  │  │  ├─ .env
│  │  │  ├─ package.json
│  │  │  ├─ Dockerfile
│  │  │  └─ README.md (this file, or a service specific one)
│  │  ├─ product-service/      # planned
│  │  └─ order-service/        # planned
│  └─ infra/
│     └─ terraform/            # VPC, networking, etc.
└─ README.md

# User Service

## Overview

The User Service provides:

- User registration  
- User login  
- JWT issuance and validation  
- Protected profile endpoints (`/api/users/me`)  
- Basic profile updates (name and addresses)

It is a standard Express application with MongoDB Atlas as the datastore.

---

## Prerequisites

To run the User Service locally you need:

- Node.js (v18+ recommended)  
- npm  
- MongoDB Atlas account (free tier is fine)  
- Git Bash / WSL / PowerShell (for Windows)

For infrastructure work later:

- Terraform  
- AWS CLI with configured credentials  

---

## MongoDB Atlas Setup

1. Create an account on MongoDB Atlas.  
2. Create a free cluster (M0).  
3. Create a database user:  
   - Username example: `ecommerce_user`  
   - Use a strong password  
4. Under Network Access, allow IP `0.0.0.0/0` for development.  
5. Click Connect → Connect your application and copy the Node.js connection string.

Example:

```
mongodb+srv://ecommerce_user:<password>@ecommerce-cluster.jwdqzhq.mongodb.net/?appName=ecommerce-cluster
```

Use `users` as the database name:

```
mongodb+srv://ecommerce_user:<password>@ecommerce-cluster.jwdqzhq.mongodb.net/users?retryWrites=true&w=majority&appName=ecommerce-cluster
```

If your password has special characters, make sure they are URL encoded.

---

## Environment Configuration

Inside `ecommerce-platform/services/user-service`, create a `.env` file:

```
PORT=3001
MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@ecommerce-cluster.jwdqzhq.mongodb.net/users?retryWrites=true&w=majority&appName=ecommerce-cluster
JWT_SECRET=your-super-secret-jwt-key-change-this
NODE_ENV=development
```

Replace `<USERNAME>`/`<PASSWORD>` accordingly.

Never commit `.env` to version control.

---

## Installing Dependencies

From the `user-service` directory:

```bash
cd ecommerce-platform/services/user-service

rm -rf node_modules package-lock.json
npm install
```

Summary of `package.json` is included in your request.

---

## Running the User Service

Start the service (development mode):

```bash
npm run dev
```

Expected output:

```
[nodemon] starting `node src/index.js`
✓ User Service running on port 3001
✓ MongoDB connected successfully
```

Run without nodemon:

```bash
npm start
```

---

## API Endpoints

Base URL (local):

```
http://localhost:3001
```

---

### Health Check

**GET /health**

Response:

```json
{
  "status": "healthy",
  "service": "user-service"
}
```

---

### Register

**POST /api/auth/register**

Request:

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe"
}
```

Curl (Linux/macOS/Git Bash):

```bash
curl -X POST http://localhost:3001/api/auth/register   -H "Content-Type: application/json"   -d '{"email":"john.doe@example.com","password":"SecurePass123","firstName":"John","lastName":"Doe"}'
```

PowerShell example omitted for brevity.

Successful response:

```json
{
  "message": "User registered successfully",
  "token": "<JWT_TOKEN>",
  "user": { ... }
}
```

Save the token for authenticated requests.

---

### Login

**POST /api/auth/login**

Request:

```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123"
}
```

Response includes a JWT.

---

### Get Current User

**GET /api/users/me**

Headers:

```
Authorization: Bearer <JWT_TOKEN>
```

Response returns the authenticated user's profile.

---

### Update Current User

**PUT /api/users/me**

Sample request body:

```json
{
  "firstName": "John",
  "lastName": "Smith",
  "addresses": [
    {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "isDefault": true
    }
  ]
}
```

---

## Error Handling

Examples:

```json
{ "message": "User already exists" }
```

```json
{ "message": "Invalid credentials" }
```

```json
{ "message": "No token provided" }
```

```json
{ "errors": [ { "msg": "Invalid value", "path": "email" } ] }
```

---

## Docker

Dockerfile:

```Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "src/index.js"]
```

Build:

```bash
docker build -t user-service .
```

Run:

```bash
docker run -d -p 3001:3001 --env-file .env --name user-service user-service
```

---

## Terraform and AWS (High Level)

Terraform will handle:

- VPC creation  
- Subnets  
- IGW and NAT gateway  
- Route tables and security groups  
- ECS/EKS (future)  

Run:

```bash
cd ecommerce-platform/infra/terraform
terraform init
terraform plan
terraform apply
```

Make sure AWS CLI is configured.

---

## Troubleshooting

- **User.findOne is not a function** → Ensure proper model export  
- **Mongo authentication errors** → Verify URI and credentials  
- **Connection timeouts** → Check IP whitelist and cluster readiness  
- **nodemon not recognized** → Install with `npm install --save-dev nodemon`

---

## Roadmap

Upcoming additions:

- Product Service (CRUD, categories, search)  
- Order Service (FastAPI)  
- Inventory, payments, workflow  
- Shared infrastructure (Compose, logging, gateway)  
- Cloud deployment (ECR, ECS/EKS, CI/CD)

---

This README will evolve as the platform grows.
