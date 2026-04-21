from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
import os
from datetime import datetime, timedelta
import uuid
import re
from dotenv import load_dotenv
from sqlalchemy import inspect, text
from models import db, Product, Category, Review, CartItem, Address, Order, User, PaymentMethod, OTP
from email_service import init_email_service, create_otp, verify_otp, send_otp_email

load_dotenv()

app = Flask(__name__)


def parse_allowed_origins():
    origins = os.getenv(
        'ALLOWED_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000,https://localhost:3000,https://127.0.0.1:3000'
    )
    return [origin.strip() for origin in origins.split(',') if origin.strip()]


CORS(app, resources={r"/api/*": {"origins": parse_allowed_origins()}})

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///securecart.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'securecart-dev-secret-key')

# JWT configuration
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'securecart-dev-jwt-secret')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_HOURS', 24)))
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'

# Initialize database, JWT, and email service
db.init_app(app)
migrate = Migrate(app, db)
jwt = JWTManager(app)
init_email_service(app)


def ensure_database_schema():
    inspector = inspect(db.engine)
    review_columns = {column['name'] for column in inspector.get_columns('reviews')}
    if 'images' not in review_columns:
        with db.engine.begin() as connection:
            connection.execute(text('ALTER TABLE reviews ADD COLUMN images JSON'))

# Create tables
with app.app_context():
    db.create_all()
    ensure_database_schema()

# Helper functions
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'\d', password):
        return False, "Password must contain at least one number"
    return True, "Password is valid"


def validate_cart_quantity(quantity):
    try:
        quantity = int(quantity)
    except (TypeError, ValueError):
        return False, "Quantity must be a valid number"

    if quantity < 1:
        return False, "Quantity must be at least 1"

    if quantity > 10:
        return False, "Quantity cannot exceed 10 for a single item"

    return True, ""

# Authentication API Routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['email', 'password', 'firstName', 'lastName']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate email format
    if not validate_email(data['email']):
        return jsonify({'error': 'Invalid email format'}), 400
    
    # Validate password strength
    is_valid, message = validate_password(data['password'])
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Check if user already exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'User with this email already exists'}), 409
    
    # Create new user
    user = User(
        email=data['email'],
        first_name=data['firstName'],
        last_name=data['lastName'],
        phone=data.get('phone')
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'Registration successful. Please log in to receive your OTP on email.',
            'requiresLogin': True,
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create user'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user with optional 2FA"""
    data = request.get_json() or {}
    
    # Validate required fields
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 401
    
    # Check if OTP is provided (2FA step)
    if data.get('otp'):
        # Verify OTP
        is_valid, message = verify_otp(data['email'], data['otp'], 'login')
        if not is_valid:
            return jsonify({'error': message}), 401
        
        # OTP verified, create access token
        access_token = create_access_token(identity=user.id)
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict_with_token(access_token)
        })
    else:
        # First step: send OTP
        otp_code = create_otp(user.id, user.email, 'login')
        if not otp_code:
            return jsonify({'error': 'Failed to generate OTP'}), 500
        
        # Send OTP email
        if send_otp_email(user.email, otp_code, 'login'):
            response = {
                'message': 'OTP sent to your email',
                'requiresOTP': True,
                'email': user.email
            }
            return jsonify(response)
        else:
            return jsonify({'error': 'Failed to send OTP email'}), 500

@app.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()})

@app.route('/api/auth/refresh', methods=['POST'])
@jwt_required()
def refresh_token():
    """Refresh access token"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Create new access token
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    })

@app.route('/api/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard token)"""
    return jsonify({'message': 'Logout successful'})

@app.route('/api/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    data = request.get_json()
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Validate required fields
    if not data.get('currentPassword') or not data.get('newPassword'):
        return jsonify({'error': 'Current password and new password are required'}), 400
    
    # Verify current password
    if not user.check_password(data['currentPassword']):
        return jsonify({'error': 'Current password is incorrect'}), 401
    
    # Validate new password
    is_valid, message = validate_password(data['newPassword'])
    if not is_valid:
        return jsonify({'error': message}), 400
    
    # Update password
    user.set_password(data['newPassword'])
    db.session.commit()
    
    return jsonify({'message': 'Password changed successfully'})

# 2FA specific endpoints
@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    """Send OTP for login (alternative endpoint)"""
    data = request.get_json() or {}
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Find user
    user = User.query.filter_by(email=data['email']).first()
    
    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 401
    
    # Generate and send OTP
    otp_code = create_otp(user.id, user.email, 'login')
    if not otp_code:
        return jsonify({'error': 'Failed to generate OTP'}), 500
    
    if send_otp_email(user.email, otp_code, 'login'):
        response = {
            'message': 'OTP sent to your email',
            'email': user.email
        }
        return jsonify(response)
    else:
        return jsonify({'error': 'Failed to send OTP email'}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp_endpoint():
    """Verify OTP and complete login"""
    data = request.get_json() or {}
    
    if not data.get('email') or not data.get('otp'):
        return jsonify({'error': 'Email and OTP are required'}), 400
    
    # Verify OTP
    is_valid, message = verify_otp(data['email'], data['otp'], 'login')
    if not is_valid:
        return jsonify({'error': message}), 401
    
    # Get user and create token
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    access_token = create_access_token(identity=user.id)
    
    user.is_verified = True
    user.last_login = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict_with_token(access_token)
    })

@app.route('/api/auth/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP for login"""
    data = request.get_json() or {}
    
    if not data.get('email'):
        return jsonify({'error': 'Email is required'}), 400
    
    # Find user
    user = User.query.filter_by(email=data['email']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Generate new OTP
    otp_code = create_otp(user.id, user.email, 'login')
    if not otp_code:
        return jsonify({'error': 'Failed to generate OTP'}), 500
    
    if send_otp_email(user.email, otp_code, 'login'):
        response = {
            'message': 'OTP resent to your email',
            'email': user.email
        }
        return jsonify(response)
    else:
        return jsonify({'error': 'Failed to send OTP email'}), 500

# Products API Routes
@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products with optional filtering"""
    query = Product.query
    
    # Filter by category
    category = request.args.get('category')
    if category:
        query = query.filter(Product.category.ilike(f'%{category}%'))
    
    # Filter by search query
    search = request.args.get('search')
    if search:
        query = query.filter(
            db.or_(
                Product.name.ilike(f'%{search}%'),
                Product.description.ilike(f'%{search}%'),
                Product.brand.ilike(f'%{search}%')
            )
        )
    
    # Filter by price range
    min_price = request.args.get('min_price')
    max_price = request.args.get('max_price')
    if min_price:
        query = query.filter(Product.price >= float(min_price))
    if max_price:
        query = query.filter(Product.price <= float(max_price))
    
    # Pagination
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 12))
    
    products_paginated = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )
    
    products = [product.to_dict() for product in products_paginated.items]
    
    return jsonify({
        'products': products,
        'total': products_paginated.total,
        'page': page,
        'per_page': per_page,
        'total_pages': products_paginated.pages
    })

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product by ID"""
    product = Product.query.get(product_id)
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    return jsonify(product.to_dict())

@app.route('/api/products/featured', methods=['GET'])
def get_featured_products():
    """Get featured products"""
    limit = request.args.get('limit', 6, type=int)
    
    # Get products with highest ratings or most popular
    products = Product.query.order_by(Product.rating.desc()).limit(limit).all()
    return jsonify({'products': [product.to_dict() for product in products]})

# Categories API Routes
@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    categories = Category.query.all()
    categories_data = [category.to_dict() for category in categories]
    return jsonify({'categories': categories_data})

@app.route('/api/categories/<category_id>', methods=['GET'])
def get_category(category_id):
    """Get a specific category by ID"""
    category = Category.query.get(category_id)
    
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    return jsonify(category.to_dict())

@app.route('/api/categories/<category_id>/products', methods=['GET'])
def get_products_by_category(category_id):
    """Get products by category"""
    products = Product.query.filter(Product.category.ilike(f'%{category_id}%')).all()
    products_data = [product.to_dict() for product in products]
    
    return jsonify({'products': products_data})

# Reviews API Routes
@app.route('/api/products/<int:product_id>/reviews', methods=['GET'])
def get_product_reviews(product_id):
    """Get reviews for a specific product"""
    reviews = Review.query.filter_by(product_id=product_id).all()
    reviews_data = [review.to_dict() for review in reviews]
    
    return jsonify({'reviews': reviews_data})

@app.route('/api/reviews', methods=['POST'])
def create_review():
    """Create a new review"""
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['productId', 'user', 'rating', 'comment']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    if not isinstance(data['rating'], int) or data['rating'] < 1 or data['rating'] > 5:
        return jsonify({'error': 'Rating must be between 1 and 5'}), 400

    review_images = data.get('images', [])
    if not isinstance(review_images, list):
        return jsonify({'error': 'Review images must be a list'}), 400
    if len(review_images) > 4:
        return jsonify({'error': 'You can upload up to 4 review images'}), 400
    
    # Create new review
    new_review = Review(
        product_id=data['productId'],
        user=data['user'],
        rating=data['rating'],
        comment=data['comment'],
        images=review_images,
        verified=False,
        helpful=0
    )
    
    db.session.add(new_review)

    product = Product.query.get(data['productId'])
    if product:
        existing_reviews = Review.query.filter_by(product_id=data['productId']).all()
        total_rating = sum(review.rating for review in existing_reviews) + data['rating']
        total_reviews = len(existing_reviews) + 1
        product.reviews_count = total_reviews
        product.rating = round(total_rating / total_reviews, 1)

    db.session.commit()
    
    return jsonify(new_review.to_dict()), 201

# Cart API Routes
@app.route('/api/cart', methods=['GET'])
@jwt_required()
def get_cart():
    """Get cart items for authenticated user"""
    user_id = get_jwt_identity()
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    cart_data = [item.to_dict() for item in cart_items]
    return jsonify({'cartItems': cart_data})

@app.route('/api/cart', methods=['POST'])
@jwt_required()
def add_to_cart():
    """Add item to cart for authenticated user"""
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    # Validate required fields
    required_fields = ['productId', 'name', 'price', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    is_valid_quantity, quantity_error = validate_cart_quantity(data['quantity'])
    if not is_valid_quantity:
        return jsonify({'error': quantity_error}), 400
    
    # Check if item already exists in cart for this user
    existing_item = CartItem.query.filter_by(
        user_id=user_id,
        product_id=data['productId'],
        color=data.get('color'),
        size=data.get('size')
    ).first()
    
    if existing_item:
        updated_quantity = existing_item.quantity + int(data['quantity'])
        is_valid_quantity, quantity_error = validate_cart_quantity(updated_quantity)
        if not is_valid_quantity:
            return jsonify({'error': quantity_error}), 400
        existing_item.quantity = updated_quantity
        db.session.commit()
    else:
        new_item = CartItem(
            user_id=user_id,
            product_id=data['productId'],
            name=data['name'],
            price=data['price'],
            original_price=data.get('originalPrice'),
            image=data.get('image'),
            quantity=int(data['quantity']),
            color=data.get('color'),
            size=data.get('size')
        )
        db.session.add(new_item)
        db.session.commit()
    
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    cart_data = [item.to_dict() for item in cart_items]
    return jsonify({'cartItems': cart_data})

@app.route('/api/cart/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_cart_item(item_id):
    """Update cart item quantity for authenticated user"""
    data = request.get_json()
    user_id = get_jwt_identity()
    
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'Cart item not found'}), 404
    
    if 'quantity' in data:
        is_valid_quantity, quantity_error = validate_cart_quantity(data['quantity'])
        if not is_valid_quantity:
            return jsonify({'error': quantity_error}), 400
        item.quantity = int(data['quantity'])
        db.session.commit()
    
    return jsonify(item.to_dict())

@app.route('/api/cart/<int:item_id>', methods=['DELETE'])
@jwt_required()
def remove_from_cart(item_id):
    """Remove item from cart for authenticated user"""
    user_id = get_jwt_identity()
    
    item = CartItem.query.filter_by(id=item_id, user_id=user_id).first()
    if not item:
        return jsonify({'error': 'Cart item not found'}), 404
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Item removed from cart'})

@app.route('/api/cart/clear', methods=['DELETE'])
@jwt_required()
def clear_cart():
    """Clear all items from cart for authenticated user"""
    user_id = get_jwt_identity()
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({'message': 'Cart cleared'})

@app.route('/api/cart/total', methods=['GET'])
@jwt_required()
def get_cart_total():
    """Get cart total for authenticated user"""
    user_id = get_jwt_identity()
    cart_items = CartItem.query.filter_by(user_id=user_id).all()
    total = sum(item.price * item.quantity for item in cart_items)
    return jsonify({'total': total})

# Addresses API Routes
@app.route('/api/addresses', methods=['GET'])
@jwt_required()
def get_addresses():
    """Get all addresses for authenticated user"""
    user_id = get_jwt_identity()
    addresses = Address.query.filter_by(user_id=user_id).all()
    addresses_data = [address.to_dict() for address in addresses]
    return jsonify({'addresses': addresses_data})

@app.route('/api/addresses', methods=['POST'])
@jwt_required()
def create_address():
    """Create a new address for authenticated user"""
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    # Validate required fields
    required_fields = ['type', 'name', 'address', 'city', 'state', 'zipCode', 'country', 'phone']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # If this is set as default, unset other defaults for this user
    if data.get('isDefault', False):
        Address.query.filter_by(user_id=user_id).update({'is_default': False})
    
    new_address = Address(
        user_id=user_id,
        type=data['type'],
        name=data['name'],
        address=data['address'],
        city=data['city'],
        state=data['state'],
        zip_code=data['zipCode'],
        country=data['country'],
        phone=data['phone'],
        is_default=data.get('isDefault', False)
    )
    
    db.session.add(new_address)
    db.session.commit()
    
    return jsonify(new_address.to_dict()), 201

@app.route('/api/addresses/<int:address_id>', methods=['PUT'])
@jwt_required()
def update_address(address_id):
    """Update an address for authenticated user"""
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return jsonify({'error': 'Address not found'}), 404
    
    # Update fields
    if 'type' in data:
        address.type = data['type']
    if 'name' in data:
        address.name = data['name']
    if 'address' in data:
        address.address = data['address']
    if 'city' in data:
        address.city = data['city']
    if 'state' in data:
        address.state = data['state']
    if 'zipCode' in data:
        address.zip_code = data['zipCode']
    if 'country' in data:
        address.country = data['country']
    if 'phone' in data:
        address.phone = data['phone']
    if 'isDefault' in data:
        address.is_default = data['isDefault']
        # If this is set as default, unset other defaults for this user
        if data['isDefault']:
            Address.query.filter(Address.id != address_id, Address.user_id == user_id).update({'is_default': False})
    
    db.session.commit()
    return jsonify(address.to_dict())

@app.route('/api/addresses/<int:address_id>', methods=['DELETE'])
@jwt_required()
def delete_address(address_id):
    """Delete an address for authenticated user"""
    user_id = get_jwt_identity()
    
    address = Address.query.filter_by(id=address_id, user_id=user_id).first()
    if not address:
        return jsonify({'error': 'Address not found'}), 404
    
    db.session.delete(address)
    db.session.commit()
    return jsonify({'message': 'Address deleted'})

# Orders API Routes
@app.route('/api/orders', methods=['POST'])
@jwt_required()
def create_order():
    """Create a new order for authenticated user"""
    data = request.get_json() or {}
    user_id = get_jwt_identity()
    
    # Validate required fields
    required_fields = ['items', 'shippingAddress', 'billingAddress', 'paymentMethod']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    if not data['items']:
        return jsonify({'error': 'Cannot place an order with an empty cart'}), 400

    shipping_method = data.get('shippingMethod', 'standard')
    shipping_prices = {
        'standard': 497.17,
        'express': 1327.11,
        'overnight': 2489.17
    }
    
    # Calculate totals
    subtotal = sum(item['price'] * item['quantity'] for item in data['items'])
    shipping = shipping_prices.get(shipping_method, shipping_prices['standard'])
    tax = subtotal * 0.08  # 8% tax
    total = subtotal + shipping + tax
    
    # Create order
    order = Order(
        id=str(uuid.uuid4()),
        user_id=user_id,
        items=data['items'],
        shipping_address=data['shippingAddress'],
        billing_address=data['billingAddress'],
        payment_method=data['paymentMethod'],
        subtotal=subtotal,
        shipping=shipping,
        tax=tax,
        total=total,
        status='confirmed',
        order_number=f"ORD-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8]}"
    )
    
    db.session.add(order)
    
    # Clear cart after order creation for this user
    CartItem.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    
    order_data = order.to_dict()
    order_data['shippingMethod'] = shipping_method
    expected_delivery_offsets = {
        'standard': 6,
        'express': 3,
        'overnight': 1
    }
    expected_delivery = datetime.utcnow() + timedelta(days=expected_delivery_offsets.get(shipping_method, 6))
    order_data['expectedDeliveryDate'] = expected_delivery.date().isoformat()
    return jsonify(order_data), 201

@app.route('/api/orders', methods=['GET'])
@jwt_required()
def get_user_orders():
    """Get orders for authenticated user"""
    user_id = get_jwt_identity()
    orders = Order.query.filter_by(user_id=user_id).order_by(Order.created_at.desc()).all()
    orders_data = [order.to_dict() for order in orders]
    return jsonify({'orders': orders_data})

@app.route('/api/orders/<order_id>', methods=['GET'])
@jwt_required()
def get_order_by_id(order_id):
    """Get a specific order by ID for authenticated user"""
    user_id = get_jwt_identity()
    order = Order.query.filter_by(id=order_id, user_id=user_id).first()
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    return jsonify(order.to_dict())

# Search API Routes
@app.route('/api/search', methods=['GET'])
def search():
    """Search products"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'products': []})
    
    products = Product.query.filter(
        db.or_(
            Product.name.ilike(f'%{query}%'),
            Product.description.ilike(f'%{query}%'),
            Product.category.ilike(f'%{query}%'),
            Product.brand.ilike(f'%{query}%')
        )
    ).all()
    
    results = [product.to_dict() for product in products]
    return jsonify({'products': results})

# Health check
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })

# Payment Methods endpoints
@app.route('/api/payment-methods', methods=['GET'])
@jwt_required()
def get_payment_methods():
    """Get payment methods for authenticated user"""
    user_id = get_jwt_identity()
    payment_methods = PaymentMethod.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify({'paymentMethods': [pm.to_dict() for pm in payment_methods]})

@app.route('/api/payment-methods', methods=['POST'])
@jwt_required()
def add_payment_method():
    """Add a new payment method"""
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    # Validate required fields
    required_fields = ['cardNumber', 'cardHolderName', 'expiryMonth', 'expiryYear', 'cardType']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    # Validate card number (basic validation)
    card_number = data['cardNumber'].replace(' ', '').replace('-', '')
    if not card_number.isdigit() or len(card_number) < 13 or len(card_number) > 19:
        return jsonify({'error': 'Invalid card number'}), 400

    if not data['cardHolderName'].strip():
        return jsonify({'error': 'Card holder name is required'}), 400
    
    # Validate expiry date
    current_year = datetime.now().year
    current_month = datetime.now().month
    if data['expiryYear'] < current_year or (data['expiryYear'] == current_year and data['expiryMonth'] < current_month):
        return jsonify({'error': 'Card has expired'}), 400
    
    try:
        # Create new payment method
        payment_method = PaymentMethod(
            user_id=user_id,
            card_holder_name=data['cardHolderName'],
            expiry_month=data['expiryMonth'],
            expiry_year=data['expiryYear'],
            card_type=data['cardType']
        )
        payment_method.set_card_number(card_number)
        
        # If this is the first payment method, make it default
        existing_methods = PaymentMethod.query.filter_by(user_id=user_id, is_active=True).count()
        if existing_methods == 0:
            payment_method.is_default = True
        
        db.session.add(payment_method)
        db.session.commit()
        
        return jsonify({
            'message': 'Payment method added successfully',
            'paymentMethod': payment_method.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to add payment method'}), 500

@app.route('/api/payment-methods/<int:payment_method_id>', methods=['PUT'])
@jwt_required()
def update_payment_method(payment_method_id):
    """Update a payment method"""
    user_id = get_jwt_identity()
    payment_method = PaymentMethod.query.filter_by(id=payment_method_id, user_id=user_id).first()
    
    if not payment_method:
        return jsonify({'error': 'Payment method not found'}), 404
    
    data = request.get_json() or {}
    
    try:
        # Update fields
        if 'cardHolderName' in data:
            payment_method.card_holder_name = data['cardHolderName']
        if 'expiryMonth' in data:
            payment_method.expiry_month = data['expiryMonth']
        if 'expiryYear' in data:
            payment_method.expiry_year = data['expiryYear']
        if 'isDefault' in data and data['isDefault']:
            # Remove default from other payment methods
            PaymentMethod.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
            payment_method.is_default = True
        
        db.session.commit()
        return jsonify({
            'message': 'Payment method updated successfully',
            'paymentMethod': payment_method.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update payment method'}), 500

@app.route('/api/payment-methods/<int:payment_method_id>', methods=['DELETE'])
@jwt_required()
def delete_payment_method(payment_method_id):
    """Delete a payment method"""
    user_id = get_jwt_identity()
    payment_method = PaymentMethod.query.filter_by(id=payment_method_id, user_id=user_id).first()
    
    if not payment_method:
        return jsonify({'error': 'Payment method not found'}), 404
    
    try:
        # Soft delete
        payment_method.is_active = False
        db.session.commit()
        
        return jsonify({'message': 'Payment method deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to delete payment method'}), 500

@app.route('/api/payment-methods/<int:payment_method_id>/set-default', methods=['POST'])
@jwt_required()
def set_default_payment_method(payment_method_id):
    """Set a payment method as default"""
    user_id = get_jwt_identity()
    payment_method = PaymentMethod.query.filter_by(id=payment_method_id, user_id=user_id).first()
    
    if not payment_method:
        return jsonify({'error': 'Payment method not found'}), 404
    
    try:
        # Remove default from other payment methods
        PaymentMethod.query.filter_by(user_id=user_id, is_default=True).update({'is_default': False})
        
        # Set this one as default
        payment_method.is_default = True
        db.session.commit()
        
        return jsonify({'message': 'Default payment method updated successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to update default payment method'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5002)
