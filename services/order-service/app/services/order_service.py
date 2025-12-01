from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.schemas.order import OrderCreate, OrderUpdate
from datetime import datetime
import httpx
import os
from typing import List, Optional
import random
import string

class OrderService:
    def __init__(self, db: Session):
        self.db = db
        self.product_service_url = os.getenv("PRODUCT_SERVICE_URL", "http://localhost:3002")
    
    def generate_order_number(self) -> str:
        """Generate unique order number"""
        timestamp = datetime.now().strftime("%Y%m%d")
        random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"ORD-{timestamp}-{random_str}"
    
    async def get_product_details(self, product_id: str) -> dict:
        """Fetch product details from Product Service"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(f"{self.product_service_url}/api/products/{product_id}")
                if response.status_code == 200:
                    return response.json()
                return None
            except Exception as e:
                print(f"Error fetching product: {e}")
                return None
    
    async def create_order(
        self, 
        order_data: OrderCreate, 
        user_id: str, 
        user_email: str, 
        user_name: str
    ) -> Order:
        """Create a new order"""
        
        # Fetch product details for all items
        items_data = []
        subtotal = 0.0
        
        for item in order_data.items:
            product = await self.get_product_details(item.product_id)
            if not product:
                raise ValueError(f"Product {item.product_id} not found")
            
            if product.get('stock', 0) < item.quantity:
                raise ValueError(f"Insufficient stock for {product['name']}")
            
            item_subtotal = product['price'] * item.quantity
            subtotal += item_subtotal
            
            items_data.append({
                'product_id': item.product_id,
                'product_name': product['name'],
                'product_sku': product['sku'],
                'product_image': product.get('images', [{}])[0].get('url') if product.get('images') else None,
                'unit_price': product['price'],
                'quantity': item.quantity,
                'subtotal': item_subtotal,
                'product_attributes': {
                    'brand': product.get('brand'),
                    'category': product.get('category')
                }
            })
        
        # Calculate totals
        tax = subtotal * 0.08  # 8% tax
        shipping_cost = 10.0 if subtotal < 100 else 0.0  # Free shipping over $100
        total = subtotal + tax + shipping_cost
        
        # Create order
        order = Order(
            order_number=self.generate_order_number(),
            user_id=user_id,
            customer_email=user_email,
            customer_name=user_name,
            subtotal=subtotal,
            tax=tax,
            shipping_cost=shipping_cost,
            total=total,
            shipping_address=order_data.shipping_address.dict(),
            billing_address=order_data.billing_address.dict() if order_data.billing_address else order_data.shipping_address.dict(),
            payment_method=order_data.payment_method,
            customer_notes=order_data.customer_notes,
            status=OrderStatus.PENDING,
            payment_status=PaymentStatus.PENDING
        )
        
        self.db.add(order)
        self.db.flush()
        
        # Create order items
        for item_data in items_data:
            order_item = OrderItem(
                order_id=order.id,
                **item_data
            )
            self.db.add(order_item)
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def get_order_by_id(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        return self.db.query(Order).filter(Order.id == order_id).first()
    
    def get_order_by_number(self, order_number: str) -> Optional[Order]:
        """Get order by order number"""
        return self.db.query(Order).filter(Order.order_number == order_number).first()
    
    def get_user_orders(
        self, 
        user_id: str, 
        skip: int = 0, 
        limit: int = 20
    ) -> tuple[List[Order], int]:
        """Get all orders for a user"""
        query = self.db.query(Order).filter(Order.user_id == user_id)
        total = query.count()
        orders = query.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()
        return orders, total
    
    def get_all_orders(
        self, 
        skip: int = 0, 
        limit: int = 20,
        status: Optional[OrderStatus] = None
    ) -> tuple[List[Order], int]:
        """Get all orders (admin)"""
        query = self.db.query(Order)
        
        if status:
            query = query.filter(Order.status == status)
        
        total = query.count()
        orders = query.order_by(desc(Order.created_at)).offset(skip).limit(limit).all()
        return orders, total
    
    def update_order(self, order_id: str, update_data: OrderUpdate) -> Optional[Order]:
        """Update order"""
        order = self.get_order_by_id(order_id)
        if not order:
            return None
        
        update_dict = update_data.dict(exclude_unset=True)
        
        for key, value in update_dict.items():
            setattr(order, key, value)
        
        # Update timestamps based on status
        if update_data.status == OrderStatus.CONFIRMED and not order.confirmed_at:
            order.confirmed_at = datetime.now()
        elif update_data.status == OrderStatus.SHIPPED and not order.shipped_at:
            order.shipped_at = datetime.now()
        elif update_data.status == OrderStatus.DELIVERED and not order.delivered_at:
            order.delivered_at = datetime.now()
        
        self.db.commit()
        self.db.refresh(order)
        
        return order
    
    def cancel_order(self, order_id: str) -> Optional[Order]:
        """Cancel order"""
        order = self.get_order_by_id(order_id)
        if not order:
            return None
        
        if order.status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise ValueError("Cannot cancel shipped or delivered orders")
        
        order.status = OrderStatus.CANCELLED
        self.db.commit()
        self.db.refresh(order)
        
        return order
