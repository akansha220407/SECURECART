// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5002/api',
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
};

// API Endpoints
export const API_ENDPOINTS = {
  PRODUCTS: '/products',
  CATEGORIES: '/categories',
  CART: '/cart',
  REVIEWS: '/reviews',
  ADDRESSES: '/addresses',
  ORDERS: '/orders',
  SEARCH: '/search',
  HEALTH: '/health',
} as const;
