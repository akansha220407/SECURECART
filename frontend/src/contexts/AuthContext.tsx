import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, LoginRequest, RegisterRequest, ChangePasswordRequest } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  loginWithOTP: (credentials: LoginRequest) => Promise<{ requiresOTP: boolean; email?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<User>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (passwordData: ChangePasswordRequest) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const response = await authService.getCurrentUser();
          setUser(response.user);
        } catch (error) {
          console.error('Failed to get current user:', error);
          authService.removeToken();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      
      // AuthContext should only handle successful logins
      // OTP flows should be handled in the LoginPage component
      if ('user' in response && response.user) {
        setUser(response.user);
      } else {
        throw new Error('Login failed - no user data received');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const loginWithOTP = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      
      if ('requiresOTP' in response && response.requiresOTP) {
        return { requiresOTP: true, email: response.email };
      } else if ('user' in response && response.user) {
        setUser(response.user);
        return { requiresOTP: false };
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (error) {
      console.error('Login with OTP failed:', error);
      throw error;
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const response = await authService.verifyOTP({ email, otp });
      setUser(response.user);
      return response.user;
    } catch (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await authService.register(userData);
      if (response.user?.token) {
        setUser(response.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
    }
  };

  const changePassword = async (passwordData: ChangePasswordRequest) => {
    try {
      await authService.changePassword(passwordData);
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (authService.isAuthenticated()) {
      try {
        const response = await authService.getCurrentUser();
        setUser(response.user);
      } catch (error) {
        console.error('Failed to refresh user:', error);
        setUser(null);
      }
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    loginWithOTP,
    verifyOTP,
    register,
    logout,
    changePassword,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
