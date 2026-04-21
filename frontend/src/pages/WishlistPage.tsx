import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';

const WishlistPage: React.FC = () => {
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = async (productId: number) => {
    const product = wishlistItems.find((item) => item.id === productId);
    if (!product) return;

    await addToCart({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      originalPrice: product.originalPrice,
      image: product.image,
      color: product.colors[0],
      size: product.sizes[0],
    });
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your wishlist is empty</h1>
          <p className="text-gray-600 mb-6">Save your favorite products and come back to them anytime.</p>
          <Link to="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Wishlist</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {wishlistItems.map((product) => (
            <div key={product.id} className="bg-white rounded-lg shadow-md p-5 flex gap-4">
              <Link to={`/product/${product.id}`} className="shrink-0">
                <img src={product.image} alt={product.name} className="w-28 h-28 object-cover rounded-lg" />
              </Link>
              <div className="flex-1">
                <Link to={`/product/${product.id}`} className="text-lg font-semibold text-gray-900 hover:text-blue-600">
                  {product.name}
                </Link>
                <p className="text-sm text-gray-600 mt-1">{product.category}</p>
                <p className="text-xl font-bold text-gray-900 mt-3">Rs. {product.price.toFixed(2)}</p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 inline-flex items-center gap-2"
                  >
                    <ShoppingCart className="h-4 w-4" />
                    Add to Cart
                  </button>
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 inline-flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage;
