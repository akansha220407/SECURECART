#!/usr/bin/env python3
"""
Script to verify that the database has been seeded correctly
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db
from models import Product, Category, Review, CartItem, Address, Order, User, PaymentMethod

def verify_database():
    """Verify that the database has been seeded correctly"""
    with app.app_context():
        print("Verifying database seeding...")
        print("="*50)
        
        # Check users
        users = User.query.all()
        print(f"Users ({len(users)}):")
        for user in users:
            print(f"  - {user.email} ({user.first_name} {user.last_name})")
        
        # Check categories
        categories = Category.query.all()
        print(f"\nCategories ({len(categories)}):")
        for category in categories:
            print(f"  - {category.name} ({category.id})")
        
        # Check products
        products = Product.query.all()
        print(f"\nProducts ({len(products)}):")
        for product in products:
            print(f"  - {product.name} (₹{product.price}) - {product.category}")
        
        # Check reviews
        reviews = Review.query.all()
        print(f"\nReviews ({len(reviews)}):")
        for review in reviews:
            print(f"  - {review.user} rated product {review.product_id} with {review.rating} stars")
        
        # Check addresses
        addresses = Address.query.all()
        print(f"\nAddresses ({len(addresses)}):")
        for address in addresses:
            print(f"  - {address.name} - {address.address}, {address.city}")
        
        # Check cart items
        cart_items = CartItem.query.all()
        print(f"\nCart Items ({len(cart_items)}):")
        for item in cart_items:
            print(f"  - {item.name} x{item.quantity} (₹{item.price})")
        
        # Check payment methods
        payment_methods = PaymentMethod.query.all()
        print(f"\nPayment Methods ({len(payment_methods)}):")
        for pm in payment_methods:
            print(f"  - {pm.card_holder_name} - {pm.card_type} ending in {pm.last_four_digits}")
        
        print("\n" + "="*50)
        print("Database verification completed!")

if __name__ == '__main__':
    verify_database()
