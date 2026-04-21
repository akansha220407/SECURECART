import productsData from './products.json';
import categoriesData from './categories.json';
import reviewsData from './reviews.json';
import cartData from './cart.json';
import addressesData from './addresses.json';

// Types
export interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  category: string;
  brand: string;
  description: string;
  features: string[];
  colors: string[];
  sizes: string[];
  inStock: boolean;
  sku: string;
  weight: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  productCount: number;
  image: string;
  icon: string;
  featured: boolean;
}

export interface Review {
  id: number;
  productId: number;
  user: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
  helpful: number;
}

export interface CartItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  color?: string;
  size?: string;
}

export interface Address {
  id: number;
  type: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

// Data Service Class
class DataService {
  // Products
  getAllProducts(): Product[] {
    return productsData.products;
  }

  getProductById(id: number): Product | undefined {
    return productsData.products.find(product => product.id === id);
  }

  getProductsByCategory(category: string): Product[] {
    return productsData.products.filter(product => 
      product.category.toLowerCase() === category.toLowerCase()
    );
  }

  getFeaturedProducts(limit: number = 6): Product[] {
    return productsData.products.slice(0, limit);
  }

  searchProducts(query: string): Product[] {
    const lowercaseQuery = query.toLowerCase();
    return productsData.products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.description.toLowerCase().includes(lowercaseQuery) ||
      product.category.toLowerCase().includes(lowercaseQuery) ||
      product.brand.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Categories
  getAllCategories(): Category[] {
    return categoriesData.categories;
  }

  getCategoryById(id: string): Category | undefined {
    return categoriesData.categories.find(category => category.id === id);
  }

  getFeaturedCategories(): Category[] {
    return categoriesData.categories.filter(category => category.featured);
  }

  // Reviews
  getAllReviews(): Review[] {
    return reviewsData.reviews;
  }

  getReviewsByProductId(productId: number): Review[] {
    return reviewsData.reviews.filter(review => review.productId === productId);
  }

  getAverageRating(productId: number): number {
    const reviews = this.getReviewsByProductId(productId);
    if (reviews.length === 0) return 0;
    
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return Math.round((totalRating / reviews.length) * 10) / 10;
  }

  // Cart
  getCartItems(): CartItem[] {
    return cartData.cartItems;
  }

  getCartItemById(id: number): CartItem | undefined {
    return cartData.cartItems.find(item => item.id === id);
  }

  getCartTotal(): number {
    return cartData.cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  getCartItemCount(): number {
    return cartData.cartItems.reduce((count, item) => count + item.quantity, 0);
  }

  // Addresses
  getAllAddresses(): Address[] {
    return addressesData.addresses;
  }

  getAddressById(id: number): Address | undefined {
    return addressesData.addresses.find(address => address.id === id);
  }

  getDefaultAddress(): Address | undefined {
    return addressesData.addresses.find(address => address.isDefault);
  }

  // Utility functions
  calculateDiscount(originalPrice: number, currentPrice: number): number {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  formatPrice(price: number): string {
    return `$${price.toFixed(2)}`;
  }

  // Mock API functions (for future backend integration)
  async fetchProducts(): Promise<Product[]> {
    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getAllProducts());
      }, 500);
    });
  }

  async fetchProductById(id: number): Promise<Product | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getProductById(id));
      }, 300);
    });
  }

  async fetchCategories(): Promise<Category[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getAllCategories());
      }, 200);
    });
  }

  async fetchReviewsByProductId(productId: number): Promise<Review[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.getReviewsByProductId(productId));
      }, 400);
    });
  }
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;
