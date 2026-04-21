import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiService, CartItem } from '../services/apiService';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItems: CartItem[];
  cartItemCount: number;
  cartTotal: number;
  loading: boolean;
  error: string | null;
  addToCart: (item: {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    originalPrice?: number;
    image?: string;
    color?: string;
    size?: string;
  }) => Promise<void>;
  updateCartItem: (id: number, updates: { quantity: number }) => Promise<void>;
  removeFromCart: (id: number) => Promise<void>;
  clearCart: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  const cartItemCount = cartItems.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);

  const fetchCartItems = async () => {
    if (!isAuthenticated) {
      setCartItems([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getCart();
      setCartItems(response.cartItems);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cart items');
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (item: {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    originalPrice?: number;
    image?: string;
    color?: string;
    size?: string;
  }) => {
    if (!isAuthenticated) {
      throw new Error('Please log in to add items to cart');
    }

    try {
      const response = await apiService.addToCart(item);
      setCartItems(response.cartItems);
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    }
  };

  const updateCartItem = async (id: number, updates: { quantity: number }) => {
    if (!isAuthenticated) {
      throw new Error('Please log in to update cart');
    }

    try {
      await apiService.updateCartItem(id, updates);
      setCartItems(items =>
        items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update cart item');
      throw err;
    }
  };

  const removeFromCart = async (id: number) => {
    if (!isAuthenticated) {
      throw new Error('Please log in to remove items from cart');
    }

    try {
      await apiService.removeFromCart(id);
      setCartItems(items => items.filter(item => item.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to remove item from cart');
      throw err;
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const refreshCart = async () => {
    await fetchCartItems();
  };

  useEffect(() => {
    fetchCartItems();
  }, [isAuthenticated]);

  const value: CartContextType = {
    cartItems,
    cartItemCount,
    cartTotal,
    loading,
    error,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
