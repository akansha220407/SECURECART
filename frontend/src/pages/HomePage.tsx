import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { apiService, Product, Category } from '../services/apiService';

const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [featuredResponse, categoriesResponse] = await Promise.all([
          apiService.getFeaturedProducts(6),
          apiService.getCategories()
        ]);
        
        setFeaturedProducts(featuredResponse.products);
        setCategories(categoriesResponse.categories.filter(cat => cat.featured));
      } catch (err) {
        console.error('Error fetching data:', err);
        // If API fails, show some mock data for demo purposes
        setFeaturedProducts([
          {
            id: 1,
            name: "Wireless Bluetooth Headphones",
            price: 7469.17,
            originalPrice: 10787.17,
            image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop",
            images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop"],
            rating: 4.5,
            reviews: 128,
            brand: "TechSound",
            category: "Electronics",
            description: "High-quality wireless headphones with noise cancellation",
            features: ["Noise Cancellation", "Wireless", "Long Battery Life"],
            colors: ["Black", "White", "Blue"],
            sizes: ["One Size"],
            inStock: true,
            sku: "WBH-001",
            weight: "0.5"
          },
          {
            id: 2,
            name: "Smart Fitness Watch",
            price: 16599.17,
            originalPrice: 20749.17,
            image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop",
            images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop"],
            rating: 4.8,
            reviews: 89,
            brand: "FitTech",
            category: "Electronics",
            description: "Advanced fitness tracking with heart rate monitor",
            features: ["Heart Rate Monitor", "GPS", "Water Resistant"],
            colors: ["Black", "Silver", "Gold"],
            sizes: ["One Size"],
            inStock: true,
            sku: "SFW-002",
            weight: "0.3"
          },
          {
            id: 3,
            name: "Premium Coffee Maker",
            price: 12449.17,
            originalPrice: 16599.17,
            image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop",
            images: ["https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop"],
            rating: 4.6,
            reviews: 67,
            brand: "BrewMaster",
            category: "Home & Kitchen",
            description: "Professional-grade coffee maker for the perfect brew",
            features: ["Programmable", "Thermal Carafe", "Auto Shut-off"],
            colors: ["Black", "Silver", "Red"],
            sizes: ["12 Cup"],
            inStock: true,
            sku: "PCM-003",
            weight: "2.5"
          }
        ]);
        setCategories([
          {
            id: "1",
            name: "Electronics",
            image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop",
            productCount: 45,
            featured: true,
            description: "Latest gadgets and electronic devices",
            icon: "📱"
          },
          {
            id: "2",
            name: "Clothing",
            image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop",
            productCount: 32,
            featured: true,
            description: "Fashion and apparel for all seasons",
            icon: "👕"
          },
          {
            id: "3",
            name: "Home & Garden",
            image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop",
            productCount: 28,
            featured: true,
            description: "Everything for your home and garden",
            icon: "🏠"
          },
          {
            id: "4",
            name: "Sports & Fitness",
            image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
            productCount: 19,
            featured: true,
            description: "Sports equipment and fitness gear",
            icon: "⚽"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                Discover Amazing
                <span className="block text-yellow-300">Products</span>
              </h1>
              <p className="text-xl text-blue-100">
                Shop the latest trends with unbeatable prices. Free shipping on orders over ₹4,150!
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/category/electronics"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-flex items-center justify-center"
                >
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/category/clothing"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors inline-flex items-center justify-center"
                >
                  View Categories
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1607082349566-187342175e2f?w=600&h=400&fit=crop"
                alt="Shopping"
                className="rounded-lg shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Explore our wide range of products across different categories
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.id}`}
                className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden"
              >
                <div className="relative">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-gray-600">{category.productCount} products</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Handpicked products that our customers love
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              to="/category/electronics"
              className="inline-flex items-center bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              View All Products
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Promotional Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why Choose SecureCart?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Free Shipping</h3>
                    <p className="text-gray-600">Free shipping on all orders over ₹4,150</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">30-Day Returns</h3>
                    <p className="text-gray-600">Easy returns and exchanges within 30 days</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">24/7 Support</h3>
                    <p className="text-gray-600">Round-the-clock customer support</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold">✓</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Secure Payments</h3>
                    <p className="text-gray-600">100% secure payment processing</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop"
                alt="Customer Service"
                className="rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
