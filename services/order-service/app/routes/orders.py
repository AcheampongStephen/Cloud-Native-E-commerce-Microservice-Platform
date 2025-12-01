from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.database import get_db
from app.middleware.auth import get_current_user, get_current_admin_user, TokenData
from app.services.order_service import OrderService
from app.schemas.order import (
    OrderCreate, OrderResponse, OrderUpdate, 
    OrderListResponse, OrderStatusUpdate
)
from app.models.order import OrderStatus
import math

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    order_data: OrderCreate,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new order"""
    try:
        order_service = OrderService(db)
        
        # Get user name from email (simplified - in production, fetch from User Service)
        user_name = current_user.email.split('@')[0].title()
        
        order = await order_service.create_order(
            order_data=order_data,
            user_id=current_user.user_id,
            user_email=current_user.email,
            user_name=user_name
        )
        
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail="Failed to create order")

@router.get("/", response_model=OrderListResponse)
def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = None,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's orders"""
    order_service = OrderService(db)
    skip = (page - 1) * limit
    
    orders, total = order_service.get_user_orders(
        user_id=current_user.user_id,
        skip=skip,
        limit=limit
    )
    
    return OrderListResponse(
        orders=orders,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit)
    )

@router.get("/all", response_model=OrderListResponse)
def get_all_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[OrderStatus] = None,
    current_user: TokenData = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all orders (Admin only)"""
    order_service = OrderService(db)
    skip = (page - 1) * limit
    
    orders, total = order_service.get_all_orders(
        skip=skip,
        limit=limit,
        status=status
    )
    
    return OrderListResponse(
        orders=orders,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit)
    )

@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order by ID"""
    order_service = OrderService(db)
    order = order_service.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is admin
    if order.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    return order

@router.get("/number/{order_number}", response_model=OrderResponse)
def get_order_by_number(
    order_number: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order by order number"""
    order_service = OrderService(db)
    order = order_service.get_order_by_number(order_number)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is admin
    if order.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this order")
    
    return order

@router.put("/{order_id}", response_model=OrderResponse)
def update_order(
    order_id: str,
    update_data: OrderUpdate,
    current_user: TokenData = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update order (Admin only)"""
    order_service = OrderService(db)
    
    try:
        order = order_service.update_order(order_id, update_data)
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: str,
    status_update: OrderStatusUpdate,
    current_user: TokenData = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update order status (Admin only)"""
    order_service = OrderService(db)
    
    update_data = OrderUpdate(status=status_update.status)
    order = order_service.update_order(order_id, update_data)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@router.delete("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel order"""
    order_service = OrderService(db)
    order = order_service.get_order_by_id(order_id)
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if user owns the order or is admin
    if order.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to cancel this order")
    
    try:
        order = order_service.cancel_order(order_id)
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
