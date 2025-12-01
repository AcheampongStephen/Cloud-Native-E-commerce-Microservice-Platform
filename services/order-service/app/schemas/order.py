from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from app.models.order import OrderStatus, PaymentStatus

class AddressSchema(BaseModel):
    street: str
    city: str
    state: str
    zipCode: str
    country: str

class OrderItemCreate(BaseModel):
    product_id: str
    quantity: int = Field(gt=0)

class OrderItemResponse(BaseModel):
    id: str
    product_id: str
    product_name: str
    product_sku: str
    product_image: Optional[str] = None
    unit_price: float
    quantity: int
    subtotal: float
    product_attributes: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    items: List[OrderItemCreate]
    shipping_address: AddressSchema
    billing_address: Optional[AddressSchema] = None
    customer_notes: Optional[str] = None
    payment_method: Optional[str] = "credit_card"

class OrderUpdate(BaseModel):
    status: Optional[OrderStatus] = None
    payment_status: Optional[PaymentStatus] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    internal_notes: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

class OrderResponse(BaseModel):
    id: str
    order_number: str
    user_id: str
    customer_email: str
    customer_name: str
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal: float
    tax: float
    shipping_cost: float
    discount: float
    total: float
    shipping_address: Dict[str, Any]
    billing_address: Optional[Dict[str, Any]] = None
    payment_method: Optional[str] = None
    tracking_number: Optional[str] = None
    carrier: Optional[str] = None
    customer_notes: Optional[str] = None
    internal_notes: Optional[str] = None
    items: List[OrderItemResponse]
    created_at: datetime
    updated_at: Optional[datetime] = None
    confirmed_at: Optional[datetime] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    limit: int
    pages: int
