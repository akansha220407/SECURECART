import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, ShoppingCart, Heart, Truck, Shield, RotateCcw } from 'lucide-react';
import { apiService, Product, Review } from '../services/apiService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useWishlist } from '../contexts/WishlistContext';

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { addToCart } = useCart();
  const { isAuthenticated, user } = useAuth();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) return;

      try {
        setLoading(true);
        const [productResponse, reviewsResponse] = await Promise.all([
          apiService.getProductById(Number(productId)),
          apiService.getProductReviews(Number(productId)),
        ]);

        setProduct(productResponse);
        setReviews(reviewsResponse.reviews);
      } catch (err) {
        setError('Failed to load product data');
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
          <p className="text-gray-600">The product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const discountPercentage = apiService.calculateDiscount(product.originalPrice || 0, product.price);
  const sizeRequired = product.sizes.length > 1;
  const colorRequired = product.colors.length > 1;

  const validateSelections = () => {
    if (sizeRequired && !selectedSize) {
      setError('Please select a size before continuing.');
      return false;
    }
    if (colorRequired && !selectedColor) {
      setError('Please select a color before continuing.');
      return false;
    }
    return true;
  };

  const buildCartPayload = () => ({
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity,
    originalPrice: product.originalPrice,
    image: product.image,
    color: selectedColor || undefined,
    size: selectedSize || undefined,
  });

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/product/${product.id}` } } });
      return false;
    }

    if (!validateSelections()) {
      return false;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      setCartMessage(null);
      await addToCart(buildCartPayload());
      setCartMessage('Item added to cart successfully.');
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    const added = await handleAddToCart();
    if (added) {
      navigate('/cart');
    }
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !user) {
      navigate('/login', { state: { from: { pathname: `/product/${productId}` } } });
      return;
    }

    try {
      setReviewSubmitting(true);
      setError(null);
      const review = await apiService.createReview({
        productId: product.id,
        user: `${user.firstName} ${user.lastName}`.trim(),
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
      });

      setReviews((current) => [review, ...current]);
      setProduct((current) =>
        current
          ? {
              ...current,
              reviews: current.reviews + 1,
              rating: Number((((current.rating * current.reviews) + review.rating) / (current.reviews + 1)).toFixed(1)),
            }
          : current
      );
      setReviewComment('');
      setReviewRating(5);
      setReviewImages([]);
    } catch (err: any) {
      setError(err.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReviewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - reviewImages.length);
    if (files.length === 0) {
      return;
    }

    try {
      const imagePromises = files.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
            reader.readAsDataURL(file);
          })
      );

      const uploadedImages = await Promise.all(imagePromises);
      setReviewImages((current) => [...current, ...uploadedImages].slice(0, 4));
    } catch (uploadError: any) {
      setError(uploadError.message || 'Failed to load review image');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="relative">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
              {discountPercentage > 0 && (
                <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  -{discountPercentage}%
                </div>
              )}
              <button
                onClick={() => toggleWishlist(product)}
                className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50"
              >
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {product.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`border-2 rounded-lg overflow-hidden ${
                    selectedImage === index ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-20 object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-600 mb-4">{product.brand}</p>

              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-gray-600 ml-2">{product.rating}</span>
                <span className="text-gray-500 ml-2">({product.reviews} reviews)</span>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <span className="text-3xl font-bold text-gray-900">Rs. {product.price.toFixed(2)}</span>
                {product.originalPrice && (
                  <span className="text-xl text-gray-500 line-through">Rs. {product.originalPrice.toFixed(2)}</span>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-600">{product.description}</p>
            </div>

            {product.colors.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Color</h3>
                <div className="flex space-x-2">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 border rounded-lg ${
                        selectedColor === color
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.sizes.length > 1 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Size</h3>
                <div className="flex space-x-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border rounded-lg ${
                        selectedSize === size
                          ? 'border-blue-600 bg-blue-50 text-blue-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Quantity</h3>
              <div className="flex items-center space-x-4">
                <div className="flex border border-gray-300 rounded-lg">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-gray-50">
                    -
                  </button>
                  <span className="px-4 py-2 border-x border-gray-300">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 hover:bg-gray-50">
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-600">{product.inStock ? 'In Stock' : 'Out of Stock'}</span>
              </div>
            </div>

            <div className="space-y-4">
              {cartMessage && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                  {cartMessage}
                </div>
              )}
              <button
                onClick={handleAddToCart}
                disabled={isSubmitting || !product.inStock}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="h-5 w-5" />
                <span>{isSubmitting ? 'Adding...' : 'Add to Cart'}</span>
              </button>
              <button
                onClick={handleBuyNow}
                disabled={isSubmitting || !product.inStock}
                className="w-full border border-blue-600 text-blue-600 py-3 px-6 rounded-lg font-semibold hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buy Now
              </button>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Features</h3>
              <ul className="space-y-2">
                {product.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-gray-600">
                    <span className="w-2 h-2 bg-blue-600 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Free shipping</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">2 year warranty</span>
                </div>
                <div className="flex items-center space-x-2">
                  <RotateCcw className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">30 day returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Customer Reviews</h2>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Write a Review</h3>
            <form onSubmit={handleCreateReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <select
                  value={reviewRating}
                  onChange={(e) => setReviewRating(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <option key={rating} value={rating}>{rating} Star</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Share your experience with this product"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Review Images</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleReviewImageUpload}
                  className="block w-full text-sm text-gray-700"
                />
                {reviewImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {reviewImages.map((image, index) => (
                      <div key={`${image}-${index}`} className="relative">
                        <img src={image} alt={`Review upload ${index + 1}`} className="w-full h-24 object-cover rounded-lg border" />
                        <button
                          type="button"
                          onClick={() => setReviewImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
                          className="absolute top-1 right-1 bg-white/90 text-gray-700 rounded-full w-6 h-6 text-xs"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={reviewSubmitting || reviewComment.trim().length === 0}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {reviewSubmitting ? 'Submitting...' : isAuthenticated ? 'Submit Review' : 'Login to Review'}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold">{review.user.charAt(0)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.user}</h4>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{review.date}</span>
                </div>
                <p className="text-gray-600">{review.comment}</p>
                {review.images.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {review.images.map((image, imageIndex) => (
                      <img
                        key={`${review.id}-${imageIndex}`}
                        src={image}
                        alt={`${review.user} review ${imageIndex + 1}`}
                        className="w-full h-28 object-cover rounded-lg border border-gray-200"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
