#!/usr/bin/env python3
"""
Database seeding script for SecureCart
Populates database tables with data from JSON files
"""

import json
import os
import sys
from datetime import datetime
from werkzeug.security import generate_password_hash

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Product, Category, Review, CartItem, Address, Order, User, PaymentMethod

def load_json_data(filename):
    """Load data from JSON file"""
    try:
        with open(f'data/{filename}', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: {filename} not found")
        return {}

def clear_database():
    """Clear all data from database tables"""
    print("Clearing existing data...")
    
    # Delete in reverse order of dependencies
    Order.query.delete()
    CartItem.query.delete()
    Review.query.delete()
    Product.query.delete()
    Category.query.delete()
    Address.query.delete()
    PaymentMethod.query.delete()
    User.query.delete()
    
    db.session.commit()
    print("Database cleared successfully")

def seed_users():
    """Seed sample users"""
    print("Seeding users...")
    
    sample_users = [
        {
            'email': 'admin@securecart.com',
            'password': 'admin123',
            'first_name': 'Admin',
            'last_name': 'User',
            'phone': '+1 (555) 000-0000',
            'is_active': True,
            'is_verified': True
        },
        {
            'email': 'john.doe@example.com',
            'password': 'password123',
            'first_name': 'John',
            'last_name': 'Doe',
            'phone': '+1 (555) 123-4567',
            'is_active': True,
            'is_verified': True
        },
        {
            'email': 'jane.smith@example.com',
            'password': 'password123',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'phone': '+1 (555) 987-6543',
            'is_active': True,
            'is_verified': True
        },
        {
            'email': 'test@example.com',
            'password': 'test123',
            'first_name': 'Test',
            'last_name': 'User',
            'phone': '+1 (555) 111-2222',
            'is_active': True,
            'is_verified': False
        }
    ]
    
    for user_data in sample_users:
        user = User(
            email=user_data['email'],
            first_name=user_data['first_name'],
            last_name=user_data['last_name'],
            phone=user_data['phone'],
            is_active=user_data['is_active'],
            is_verified=user_data['is_verified']
        )
        user.set_password(user_data['password'])
        db.session.add(user)
    
    db.session.commit()
    print(f"Seeded {len(sample_users)} users")

def seed_categories():
    """Seed categories from JSON file"""
    print("Seeding categories...")
    
    categories_data = load_json_data('categories.json')
    if not categories_data.get('categories'):
        print("No categories data found")
        return
    
    for cat_data in categories_data['categories']:
        category = Category(
            id=cat_data['id'],
            name=cat_data['name'],
            description=cat_data['description'],
            product_count=cat_data['productCount'],
            image=cat_data['image'],
            icon=cat_data['icon'],
            featured=cat_data['featured']
        )
        db.session.add(category)
    
    db.session.commit()
    print(f"Seeded {len(categories_data['categories'])} categories")

def seed_products():
    """Seed products from JSON file"""
    print("Seeding products...")
    
    products_data = load_json_data('products.json')
    if not products_data.get('products'):
        print("No products data found")
        return
    
    for prod_data in products_data['products']:
        product = Product(
            id=prod_data['id'],
            name=prod_data['name'],
            price=prod_data['price'],
            original_price=prod_data.get('originalPrice'),
            rating=prod_data['rating'],
            reviews_count=prod_data['reviews'],
            image=prod_data['image'],
            images=prod_data.get('images', []),
            category=prod_data['category'],
            brand=prod_data['brand'],
            description=prod_data['description'],
            features=prod_data.get('features', []),
            colors=prod_data.get('colors', []),
            sizes=prod_data.get('sizes', []),
            in_stock=prod_data['inStock'],
            sku=prod_data['sku'],
            weight=prod_data['weight']
        )
        db.session.add(product)
    
    db.session.commit()
    print(f"Seeded {len(products_data['products'])} products")

def seed_reviews():
    """Seed reviews from JSON file"""
    print("Seeding reviews...")
    
    reviews_data = load_json_data('reviews.json')
    if not reviews_data.get('reviews'):
        print("No reviews data found")
        return
    
    for rev_data in reviews_data['reviews']:
        review = Review(
            id=rev_data['id'],
            product_id=rev_data['productId'],
            user=rev_data['user'],
            rating=rev_data['rating'],
            date=datetime.strptime(rev_data['date'], '%Y-%m-%d').date(),
            comment=rev_data['comment'],
            verified=rev_data['verified'],
            helpful=rev_data['helpful']
        )
        db.session.add(review)
    
    db.session.commit()
    print(f"Seeded {len(reviews_data['reviews'])} reviews")

def seed_addresses():
    """Seed addresses from JSON file"""
    print("Seeding addresses...")
    
    addresses_data = load_json_data('addresses.json')
    if not addresses_data.get('addresses'):
        print("No addresses data found")
        return
    
    # Get the first user to associate addresses with
    user = User.query.first()
    if not user:
        print("No users found, skipping addresses")
        return
    
    for addr_data in addresses_data['addresses']:
        address = Address(
            id=addr_data['id'],
            user_id=user.id,
            type=addr_data['type'],
            name=addr_data['name'],
            address=addr_data['address'],
            city=addr_data['city'],
            state=addr_data['state'],
            zip_code=addr_data['zipCode'],
            country=addr_data['country'],
            phone=addr_data['phone'],
            is_default=addr_data['isDefault']
        )
        db.session.add(address)
    
    db.session.commit()
    print(f"Seeded {len(addresses_data['addresses'])} addresses")

def seed_cart_items():
    """Seed cart items from JSON file"""
    print("Seeding cart items...")
    
    cart_data = load_json_data('cart.json')
    if not cart_data.get('cartItems'):
        print("No cart items data found")
        return
    
    # Get the first user to associate cart items with
    user = User.query.first()
    if not user:
        print("No users found, skipping cart items")
        return
    
    for cart_data_item in cart_data['cartItems']:
        cart_item = CartItem(
            id=cart_data_item['id'],
            user_id=user.id,
            product_id=cart_data_item['productId'],
            name=cart_data_item['name'],
            price=cart_data_item['price'],
            original_price=cart_data_item.get('originalPrice'),
            image=cart_data_item['image'],
            quantity=cart_data_item['quantity'],
            color=cart_data_item.get('color'),
            size=cart_data_item.get('size')
        )
        db.session.add(cart_item)
    
    db.session.commit()
    print(f"Seeded {len(cart_data['cartItems'])} cart items")

def seed_payment_methods():
    """Seed sample payment methods"""
    print("Seeding payment methods...")
    
    # Get the first user to associate payment methods with
    user = User.query.first()
    if not user:
        print("No users found, skipping payment methods")
        return
    
    sample_payment_methods = [
        {
            'card_number': '4111111111111111',
            'card_holder_name': 'John Doe',
            'expiry_month': 12,
            'expiry_year': 2025,
            'card_type': 'visa',
            'is_default': True
        },
        {
            'card_number': '5555555555554444',
            'card_holder_name': 'John Doe',
            'expiry_month': 6,
            'expiry_year': 2026,
            'card_type': 'mastercard',
            'is_default': False
        }
    ]
    
    for pm_data in sample_payment_methods:
        payment_method = PaymentMethod(
            user_id=user.id,
            card_holder_name=pm_data['card_holder_name'],
            expiry_month=pm_data['expiry_month'],
            expiry_year=pm_data['expiry_year'],
            card_type=pm_data['card_type'],
            is_default=pm_data['is_default']
        )
        payment_method.set_card_number(pm_data['card_number'])
        db.session.add(payment_method)
    
    db.session.commit()
    print(f"Seeded {len(sample_payment_methods)} payment methods")

def seed_database():
    """Main function to seed the database"""
    with app.app_context():
        print("Starting database seeding...")
        
        # Create all tables if they don't exist
        db.create_all()
        print("Database tables created/verified")
        
        # Clear existing data
        clear_database()
        
        # Seed data in order
        seed_users()
        seed_categories()
        seed_products()
        seed_reviews()
        seed_addresses()
        seed_cart_items()
        seed_payment_methods()
        
        # Print summary
        print("\n" + "="*50)
        print("DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print("="*50)
        print(f"Users: {User.query.count()}")
        print(f"Categories: {Category.query.count()}")
        print(f"Products: {Product.query.count()}")
        print(f"Reviews: {Review.query.count()}")
        print(f"Addresses: {Address.query.count()}")
        print(f"Cart Items: {CartItem.query.count()}")
        print(f"Payment Methods: {PaymentMethod.query.count()}")
        print("="*50)
        
        # Print sample login credentials
        print("\nSample Login Credentials:")
        print("Admin: admin@securecart.com / admin123")
        print("User: john.doe@example.com / password123")
        print("User: jane.smith@example.com / password123")
        print("Test: test@example.com / test123")

if __name__ == '__main__':
    seed_database()
