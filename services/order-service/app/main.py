from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import order_router
from app.database.database import engine, Base
import os

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=os.getenv("APP_NAME", "Order Service"),
    version=os.getenv("APP_VERSION", "1.0.0"),
    description="Order management microservice for e-commerce platform"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "order-service",
        "version": os.getenv("APP_VERSION", "1.0.0")
    }

# Include routers
app.include_router(order_router)

@app.get("/")
async def root():
    return {
        "message": "Order Service API",
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "docs": "/docs"
    }
