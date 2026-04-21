// Authentication Service for SecureCart
import { API_CONFIG } from '../config/api';

const API_BASE_URL = API_CONFIG.BASE_URL;

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthResponse {
  message: string;
  user: User & { token?: string };
  requiresOTP?: boolean;
  email?: string;
  requiresLogin?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  otp?: string;
}

export interface OTPRequest {
  email: string;
  password: string;
}

export interface OTPVerificationRequest {
  email: string;
  otp: string;
}

export interface OTPResponse {
  message: string;
  requiresOTP: boolean;
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Auth Service Class
class AuthService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic HTTP methods
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.error ||
          errorData?.message ||
          `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`Request to ${endpoint} failed:`, error);
      throw error;
    }
  }

  // Token management
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  setToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  removeToken(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('checkoutData');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // Authentication methods
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginRequest): Promise<AuthResponse | OTPResponse> {
    const response = await this.request<AuthResponse | OTPResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token after successful login (only if user object exists)
    if ('user' in response && response.user.token) {
      this.setToken(response.user.token);
    }

    return response;
  }

  async sendOTP(credentials: OTPRequest): Promise<{ message: string; email: string }> {
    return this.request<{ message: string; email: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async verifyOTP(otpData: OTPVerificationRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(otpData),
    });

    // Store token after successful verification
    if (response.user.token) {
      this.setToken(response.user.token);
    }

    return response;
  }

  async resendOTP(email: string): Promise<{ message: string; email: string }> {
    return this.request<{ message: string; email: string }>('/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async logout(): Promise<{ message: string }> {
    try {
      const response = await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
      });
      this.removeToken();
      return response;
    } catch (error) {
      // Even if the request fails, remove the token locally
      this.removeToken();
      throw error;
    }
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  async refreshToken(): Promise<{ access_token: string; user: User }> {
    const response = await this.request<{ access_token: string; user: User }>('/auth/refresh', {
      method: 'POST',
    });

    // Update stored token
    if (response.access_token) {
      this.setToken(response.access_token);
    }

    return response;
  }

  async changePassword(passwordData: ChangePasswordRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwordData),
    });
  }

  // Utility methods
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Auto-refresh token if needed
  async ensureValidToken(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      // Token might be expired, try to refresh
      try {
        await this.refreshToken();
        return true;
      } catch (refreshError) {
        // Refresh failed, user needs to login again
        this.removeToken();
        return false;
      }
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
