#!/usr/bin/env python3
"""
Simple test script for the SecureCart API
"""

import requests
import json

BASE_URL = 'http://localhost:5002/api'

def test_health_check():
    """Test health check endpoint"""
    print("Testing health check...")
    response = requests.get(f'{BASE_URL}/health')
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_get_products():
    """Test products endpoint"""
    print("Testing products endpoint...")
    response = requests.get(f'{BASE_URL}/products')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Total products: {data.get('total', 0)}")
    print(f"Products returned: {len(data.get('products', []))}")
    print()

def test_get_categories():
    """Test categories endpoint"""
    print("Testing categories endpoint...")
    response = requests.get(f'{BASE_URL}/categories')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Categories returned: {len(data.get('categories', []))}")
    print()

def test_get_cart():
    """Test cart endpoint"""
    print("Testing cart endpoint...")
    response = requests.get(f'{BASE_URL}/cart')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Cart items: {len(data.get('cartItems', []))}")
    print()

def test_search():
    """Test search endpoint"""
    print("Testing search endpoint...")
    response = requests.get(f'{BASE_URL}/search?q=headphones')
    print(f"Status: {response.status_code}")
    data = response.json()
    print(f"Search results: {len(data.get('products', []))}")
    print()

def test_add_to_cart():
    """Test adding item to cart"""
    print("Testing add to cart...")
    cart_item = {
        "productId": 1,
        "name": "Test Product",
        "price": 99.99,
        "quantity": 1,
        "color": "Black",
        "size": "M"
    }
    response = requests.post(f'{BASE_URL}/cart', json=cart_item)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("Item added to cart successfully")
    print()

if __name__ == '__main__':
    print("SecureCart API Test Suite")
    print("=" * 40)
    
    try:
        test_health_check()
        test_get_products()
        test_get_categories()
        test_get_cart()
        test_search()
        test_add_to_cart()
        
        print("All tests completed!")
        
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API server.")
        print("Make sure the server is running on http://localhost:5000")
    except Exception as e:
        print(f"Error: {e}")
