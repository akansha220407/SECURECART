from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
import json
from cryptography.fernet import Fernet
import base64
import os

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    addresses = db.relationship('Address', backref='user', lazy=True, cascade='all, delete-orphan')
    orders = db.relationship('Order', backref='user', lazy=True)
    
    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check if provided password matches hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert user to dictionary (excluding sensitive data)"""
        return {
            'id': self.id,
            'email': self.email,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'isActive': self.is_active,
            'isVerified': self.is_verified,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'lastLogin': self.last_login.isoformat() if self.last_login else None
        }
    
    def to_dict_with_token(self, token):
        """Convert user to dictionary with JWT token"""
        return {
            **self.to_dict(),
            'token': token
        }

class PaymentMethod(db.Model):
    __tablename__ = 'payment_methods'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    card_number_encrypted = db.Column(db.Text, nullable=False)
    card_holder_name = db.Column(db.String(100), nullable=False)
    expiry_month = db.Column(db.Integer, nullable=False)
    expiry_year = db.Column(db.Integer, nullable=False)
    card_type = db.Column(db.String(20), nullable=False)  # visa, mastercard, etc.
    last_four_digits = db.Column(db.String(4), nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='payment_methods')
    
    @staticmethod
    def get_encryption_key():
        """Get or create encryption key"""
        key = os.environ.get('ENCRYPTION_KEY')
        if not key:
            # Generate a new key if none exists (for development)
            key = Fernet.generate_key()
            os.environ['ENCRYPTION_KEY'] = key.decode()
        return key.encode() if isinstance(key, str) else key
    
    @staticmethod
    def encrypt_card_number(card_number):
        """Encrypt card number"""
        key = PaymentMethod.get_encryption_key()
        f = Fernet(key)
        return f.encrypt(card_number.encode()).decode()
    
    @staticmethod
    def decrypt_card_number(encrypted_card):
        """Decrypt card number"""
        key = PaymentMethod.get_encryption_key()
        f = Fernet(key)
        return f.decrypt(encrypted_card.encode()).decode()
    
    def set_card_number(self, card_number):
        """Set encrypted card number"""
        self.card_number_encrypted = self.encrypt_card_number(card_number)
        self.last_four_digits = card_number[-4:]
    
    def get_masked_card_number(self):
        """Get masked card number for display"""
        return f"**** **** **** {self.last_four_digits}"
    
    def to_dict(self):
        """Convert payment method to dictionary (without sensitive data)"""
        return {
            'id': self.id,
            'cardHolderName': self.card_holder_name,
            'cardType': self.card_type,
            'lastFourDigits': self.last_four_digits,
            'maskedCardNumber': self.get_masked_card_number(),
            'expiryMonth': self.expiry_month,
            'expiryYear': self.expiry_year,
            'isDefault': self.is_default,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Product(db.Model):
    __tablename__ = 'products'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float)
    rating = db.Column(db.Float, default=0.0)
    reviews_count = db.Column(db.Integer, default=0)
    image = db.Column(db.String(500))
    images = db.Column(db.JSON)  # Store as JSON array
    category = db.Column(db.String(100), nullable=False)
    brand = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    features = db.Column(db.JSON)  # Store as JSON array
    colors = db.Column(db.JSON)  # Store as JSON array
    sizes = db.Column(db.JSON)  # Store as JSON array
    in_stock = db.Column(db.Boolean, default=True)
    sku = db.Column(db.String(100), unique=True)
    weight = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    reviews = db.relationship('Review', backref='product', lazy=True, cascade='all, delete-orphan')
    cart_items = db.relationship('CartItem', backref='product', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'price': self.price,
            'originalPrice': self.original_price,
            'rating': self.rating,
            'reviews': self.reviews_count,
            'image': self.image,
            'images': self.images or [],
            'category': self.category,
            'brand': self.brand,
            'description': self.description,
            'features': self.features or [],
            'colors': self.colors or [],
            'sizes': self.sizes or [],
            'inStock': self.in_stock,
            'sku': self.sku,
            'weight': self.weight
        }

class Category(db.Model):
    __tablename__ = 'categories'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    product_count = db.Column(db.Integer, default=0)
    image = db.Column(db.String(500))
    icon = db.Column(db.String(50))
    featured = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'productCount': self.product_count,
            'image': self.image,
            'icon': self.icon,
            'featured': self.featured
        }

class Review(db.Model):
    __tablename__ = 'reviews'
    
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    user = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, default=datetime.utcnow().date)
    comment = db.Column(db.Text)
    images = db.Column(db.JSON)
    verified = db.Column(db.Boolean, default=False)
    helpful = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'productId': self.product_id,
            'user': self.user,
            'rating': self.rating,
            'date': self.date.isoformat() if self.date else None,
            'comment': self.comment,
            'images': self.images or [],
            'verified': self.verified,
            'helpful': self.helpful
        }

class CartItem(db.Model):
    __tablename__ = 'cart_items'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    product_id = db.Column(db.Integer, db.ForeignKey('products.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    price = db.Column(db.Float, nullable=False)
    original_price = db.Column(db.Float)
    image = db.Column(db.String(500))
    quantity = db.Column(db.Integer, default=1)
    color = db.Column(db.String(50))
    size = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'productId': self.product_id,
            'name': self.name,
            'price': self.price,
            'originalPrice': self.original_price,
            'image': self.image,
            'quantity': self.quantity,
            'color': self.color,
            'size': self.size
        }

class Address(db.Model):
    __tablename__ = 'addresses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    type = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(255), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    state = db.Column(db.String(100), nullable=False)
    zip_code = db.Column(db.String(20), nullable=False)
    country = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'name': self.name,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'zipCode': self.zip_code,
            'country': self.country,
            'phone': self.phone,
            'isDefault': self.is_default
        }

class OTP(db.Model):
    __tablename__ = 'otps'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    otp_code = db.Column(db.String(6), nullable=False)
    purpose = db.Column(db.String(50), nullable=False)  # 'login', 'password_reset', etc.
    is_used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='otps')
    
    def is_expired(self):
        """Check if OTP has expired"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Check if OTP is valid (not used and not expired)"""
        return not self.is_used and not self.is_expired()
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'purpose': self.purpose,
            'expiresAt': self.expires_at.isoformat() if self.expires_at else None,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }

class Order(db.Model):
    __tablename__ = 'orders'
    
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    items = db.Column(db.JSON)  # Store cart items as JSON
    shipping_address = db.Column(db.JSON)  # Store address as JSON
    billing_address = db.Column(db.JSON)  # Store address as JSON
    payment_method = db.Column(db.String(100), nullable=False)
    subtotal = db.Column(db.Float, nullable=False)
    shipping = db.Column(db.Float, default=0.0)
    tax = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(50), default='pending')
    order_number = db.Column(db.String(100), unique=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'items': self.items,
            'shippingAddress': self.shipping_address,
            'billingAddress': self.billing_address,
            'paymentMethod': self.payment_method,
            'subtotal': self.subtotal,
            'shipping': self.shipping,
            'tax': self.tax,
            'total': self.total,
            'status': self.status,
            'orderNumber': self.order_number,
            'createdAt': self.created_at.isoformat() if self.created_at else None
        }
