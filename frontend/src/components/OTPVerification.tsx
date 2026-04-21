import React, { useState, useEffect } from 'react';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';

interface OTPVerificationProps {
  email: string;
  onSuccess: (user: any) => void | Promise<void>;
  onBack: () => void;
  onError: (error: string) => void;
}

const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  onSuccess,
  onBack,
  onError,
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const { verifyOTP } = useAuth();

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleOTPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      onError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const user = await verifyOTP(email, otp);
      await onSuccess(user);
    } catch (error: any) {
      onError(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setResendLoading(true);
    setMessage('');

    try {
      await authService.resendOTP(email);
      setMessage('OTP resent successfully!');
      setResendCooldown(60); // 60 second cooldown
    } catch (error: any) {
      onError(error.message || 'Failed to resend OTP');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 6-digit verification code to
          </p>
          <p className="text-center text-sm font-medium text-gray-900">{email}</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleVerifyOTP}>
          <div>
            <label htmlFor="otp" className="sr-only">
              Verification Code
            </label>
            <div className="relative">
              <input
                id="otp"
                name="otp"
                type="text"
                required
                value={otp}
                onChange={handleOTPChange}
                placeholder="Enter 6-digit code"
                className="appearance-none rounded-lg relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                maxLength={6}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
          </div>

          {message && (
            <div className={`flex items-center justify-center space-x-2 text-sm ${
              message.includes('success') ? 'text-green-600' : 'text-red-600'
            }`}>
              {message.includes('success') ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{message}</span>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to login
            </button>

            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendLoading || resendCooldown > 0}
              className="flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-1"></div>
                  Sending...
                </div>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <div className="flex items-center">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend code
                </div>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">
                Didn't receive the code?
              </span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Check your spam folder or try resending the code.
              <br />
              The code will expire in 10 minutes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
