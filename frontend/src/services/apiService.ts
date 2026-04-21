// API Service for SecureCart Backend Integration
import { API_CONFIG } from '../config/api';
import { authService } from './authService';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Types (same as dataService)
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
  images: string[];
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

export interface Order {
  id: string;
  items: CartItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  subtotal: number;
  shipping: number;
  shippingMethod?: string;
  tax: number;
  total: number;
  status: string;
  createdAt: string;
  orderNumber: string;
  expectedDeliveryDate?: string;
}

export interface PaymentMethod {
  id: number;
  cardHolderName: string;
  cardType: string;
  lastFourDigits: string;
  maskedCardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

// API Response Types (for future use)
// interface ApiResponse<T> {
//   data?: T;
//   error?: string;
//   message?: string;
// }

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

interface CategoriesResponse {
  categories: Category[];
}

interface CartResponse {
  cartItems: CartItem[];
}

interface ReviewsResponse {
  reviews: Review[];
}

interface AddressesResponse {
  addresses: Address[];
}

// API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const errorMessage =
        data?.error ||
        data?.message ||
        `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }
    return data as T;
  }

  // Generic HTTP methods
  private async get<T>(endpoint: string): Promise<T> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers,
      });
      return await this.parseResponse<T>(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async post<T>(endpoint: string, data: any): Promise<T> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      };
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      return await this.parseResponse<T>(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async put<T>(endpoint: string, data: any): Promise<T> {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      };
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });
      return await this.parseResponse<T>(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  private async delete<T>(endpoint: string): Promise<T> {
    try {
      const headers = authService.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
      });
      return await this.parseResponse<T>(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Products API
  async getProducts(params?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    page?: number;
    per_page?: number;
  }): Promise<ProductsResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/products?${queryString}` : '/products';
    return this.get<ProductsResponse>(endpoint);
  }

  async getProductById(id: number): Promise<Product> {
    return this.get<Product>(`/products/${id}`);
  }

  async getFeaturedProducts(limit: number = 6): Promise<{ products: Product[] }> {
    return this.get<{ products: Product[] }>(`/products/featured?limit=${limit}`);
  }

  // Categories API
  async getCategories(): Promise<CategoriesResponse> {
    return this.get<CategoriesResponse>('/categories');
  }

  async getCategoryById(id: string): Promise<Category> {
    return this.get<Category>(`/categories/${id}`);
  }

  async getProductsByCategory(categoryId: string): Promise<{ products: Product[] }> {
    return this.get<{ products: Product[] }>(`/categories/${categoryId}/products`);
  }

  // Reviews API
  async getProductReviews(productId: number): Promise<ReviewsResponse> {
    return this.get<ReviewsResponse>(`/products/${productId}/reviews`);
  }

  async createReview(review: {
    productId: number;
    user: string;
    rating: number;
    comment: string;
    images?: string[];
  }): Promise<Review> {
    return this.post<Review>('/reviews', review);
  }

  // Cart API
  async getCart(): Promise<CartResponse> {
    return this.get<CartResponse>('/cart');
  }

  async addToCart(item: {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    originalPrice?: number;
    image?: string;
    color?: string;
    size?: string;
  }): Promise<CartResponse> {
    return this.post<CartResponse>('/cart', item);
  }

  async updateCartItem(itemId: number, data: { quantity: number }): Promise<CartItem> {
    return this.put<CartItem>(`/cart/${itemId}`, data);
  }

  async removeFromCart(itemId: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/cart/${itemId}`);
  }

  async clearCart(): Promise<{ message: string }> {
    return this.delete<{ message: string }>('/cart/clear');
  }

  async getCartTotal(): Promise<{ total: number }> {
    return this.get<{ total: number }>('/cart/total');
  }

  // Addresses API
  async getAddresses(): Promise<AddressesResponse> {
    return this.get<AddressesResponse>('/addresses');
  }

  async createAddress(address: {
    type: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    isDefault?: boolean;
  }): Promise<Address> {
    return this.post<Address>('/addresses', address);
  }

  async updateAddress(addressId: number, address: Partial<Address>): Promise<Address> {
    return this.put<Address>(`/addresses/${addressId}`, address);
  }

  async deleteAddress(addressId: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/addresses/${addressId}`);
  }

  // Orders API
  async getOrders(): Promise<{ orders: Order[] }> {
    return this.get<{ orders: Order[] }>('/orders');
  }

  async getOrderById(orderId: string): Promise<Order> {
    return this.get<Order>(`/orders/${orderId}`);
  }

  async createOrder(order: {
    items: CartItem[];
    shippingAddress: Address;
    billingAddress: Address;
    paymentMethod: string;
    shippingMethod?: string;
  }): Promise<Order> {
    return this.post<Order>('/orders', order);
  }

  // Search API
  async searchProducts(query: string): Promise<{ products: Product[] }> {
    return this.get<{ products: Product[] }>(`/search?q=${encodeURIComponent(query)}`);
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.get<{ status: string; timestamp: string; version: string }>('/health');
  }

  // Payment Methods
  async getPaymentMethods(): Promise<{ paymentMethods: PaymentMethod[] }> {
    return this.get<{ paymentMethods: PaymentMethod[] }>('/payment-methods');
  }

  async addPaymentMethod(paymentData: {
    cardNumber: string;
    cardHolderName: string;
    expiryMonth: number;
    expiryYear: number;
    cardType: string;
  }): Promise<{ message: string; paymentMethod: PaymentMethod }> {
    return this.post<{ message: string; paymentMethod: PaymentMethod }>('/payment-methods', paymentData);
  }

  async updatePaymentMethod(paymentMethodId: number, paymentData: {
    cardHolderName?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
  }): Promise<{ message: string; paymentMethod: PaymentMethod }> {
    return this.put<{ message: string; paymentMethod: PaymentMethod }>(`/payment-methods/${paymentMethodId}`, paymentData);
  }

  async deletePaymentMethod(paymentMethodId: number): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/payment-methods/${paymentMethodId}`);
  }

  async setDefaultPaymentMethod(paymentMethodId: number): Promise<{ message: string }> {
    return this.post<{ message: string }>(`/payment-methods/${paymentMethodId}/set-default`, {});
  }

  // Utility functions
  calculateDiscount(originalPrice: number, currentPrice: number): number {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }

  formatPrice(price: number): string {
    return `₹${price.toFixed(2)}`;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
