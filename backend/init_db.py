#!/usr/bin/env python3
"""
Database initialization script for SecureCart
Migrates data from JSON files to SQLite database
"""

import json
import os
from datetime import datetime
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
    
    created_count = 0

    for user_data in sample_users:
        existing_user = User.query.filter_by(email=user_data['email']).first()
        if existing_user:
            continue

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
        created_count += 1

    db.session.commit()
    print(f"Seeded {created_count} new users")

def init_database():
    """Initialize database with data from JSON files"""
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Database tables created successfully")

        reset_db = os.environ.get('SECURECART_RESET_DB', '0') == '1'
        if reset_db:
            clear_database()
            db.create_all()
            print("Database reset requested via SECURECART_RESET_DB=1")
        else:
            print("Preserving existing users, carts, orders, and addresses.")
        
        # Seed users first
        seed_users()
        
        # Load JSON data
        products_data = load_json_data('products.json')
        categories_data = load_json_data('categories.json')
        reviews_data = load_json_data('reviews.json')
        cart_data = load_json_data('cart.json')
        addresses_data = load_json_data('addresses.json')
        
        # Insert categories
        if categories_data.get('categories') and Category.query.count() == 0:
            print("Inserting categories...")
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
            print(f"Inserted {len(categories_data['categories'])} categories")
        elif Category.query.count() > 0:
            print("Categories already exist, skipping seed")
        
        # Insert products
        if products_data.get('products') and Product.query.count() == 0:
            print("Inserting products...")
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
            print(f"Inserted {len(products_data['products'])} products")
        elif Product.query.count() > 0:
            print("Products already exist, skipping seed")
        
        # Insert reviews
        if reviews_data.get('reviews') and Review.query.count() == 0:
            print("Inserting reviews...")
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
            print(f"Inserted {len(reviews_data['reviews'])} reviews")
        elif Review.query.count() > 0:
            print("Reviews already exist, skipping seed")
        
        # Seed sample cart items only for a brand-new database
        if cart_data.get('cartItems') and CartItem.query.count() == 0:
            print("Inserting cart items...")
            # Get the first user to associate cart items with
            user = User.query.first()
            for cart_data_item in cart_data['cartItems']:
                cart_item = CartItem(
                    id=cart_data_item['id'],
                    user_id=user.id if user else None,
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
            print(f"Inserted {len(cart_data['cartItems'])} cart items")
        elif CartItem.query.count() > 0:
            print("Cart items already exist, skipping sample cart seed")
        
        # Seed sample addresses only for a brand-new database
        if addresses_data.get('addresses') and Address.query.count() == 0:
            print("Inserting addresses...")
            # Get the first user to associate addresses with
            user = User.query.first()
            for addr_data in addresses_data['addresses']:
                address = Address(
                    id=addr_data['id'],
                    user_id=user.id if user else None,
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
            print(f"Inserted {len(addresses_data['addresses'])} addresses")
        elif Address.query.count() > 0:
            print("Addresses already exist, skipping sample address seed")
        
        # Commit all changes
        db.session.commit()
        print("Database initialization completed successfully!")
        
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
        print("="*50)
        
        # Print sample login credentials
        print("\nSample Login Credentials:")
        print("Admin: admin@securecart.com / admin123")
        print("User: john.doe@example.com / password123")
        print("User: jane.smith@example.com / password123")
        print("Test: test@example.com / test123")

if __name__ == '__main__':
    init_database()
