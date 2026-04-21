import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, Shield, CheckCircle, Plus, Trash2, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiService, PaymentMethod, CartItem } from '../services/apiService';
import { useCart } from '../contexts/CartContext';

const PaymentPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { clearCart } = useCart();
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);
  const [processingMessage, setProcessingMessage] = useState('');
  const processingDurationSeconds = 12;
  
  // Form states
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [useNewCard, setUseNewCard] = useState(false);
  const [newCardForm, setNewCardForm] = useState({
    cardNumber: '',
    cardHolderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardType: 'visa'
  });
  const [saveNewCard, setSaveNewCard] = useState(true);

  // Get checkout data from session storage
  const [checkoutData, setCheckoutData] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Get checkout data from session storage
    const storedCheckoutData = sessionStorage.getItem('checkoutData');
    if (!storedCheckoutData) {
      navigate('/checkout');
      return;
    }

    setCheckoutData(JSON.parse(storedCheckoutData));
    fetchData();
  }, [isAuthenticated, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentMethodsResponse, cartResponse] = await Promise.all([
        apiService.getPaymentMethods(),
        apiService.getCart()
      ]);
      
      setPaymentMethods(paymentMethodsResponse.paymentMethods || []);
      setCartItems(cartResponse.cartItems || []);
      
      // Select default payment method if available
      const defaultMethod = paymentMethodsResponse.paymentMethods?.find(pm => pm.isDefault);
      if (defaultMethod) {
        setSelectedPaymentMethod(defaultMethod);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCardInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      // Format card number
      const formatted = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      const matches = formatted.match(/\d{4,16}/g);
      const match = (matches && matches[0]) || '';
      const parts = [];
      for (let i = 0, len = match.length; i < len; i += 4) {
        parts.push(match.substring(i, i + 4));
      }
      const formattedValue = parts.length ? parts.join(' ') : formatted;
      
      // Detect card type
      let cardType = 'visa';
      if (formatted.startsWith('4')) cardType = 'visa';
      else if (formatted.startsWith('5')) cardType = 'mastercard';
      else if (formatted.startsWith('3')) cardType = 'amex';
      
      setNewCardForm(prev => ({
        ...prev,
        cardNumber: formattedValue,
        cardType
      }));
    } else if (name === 'expiryMonth' || name === 'expiryYear') {
      setNewCardForm(prev => ({
        ...prev,
        [name]: value
      }));
    } else if (name === 'cvv') {
      setNewCardForm(prev => ({
        ...prev,
        cvv: value.replace(/\D/g, '').substring(0, 4)
      }));
    } else {
      setNewCardForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleAddNewCard = async () => {
    try {
      setError(null);
      
      // Validate form
      const { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv, cardType } = newCardForm;
      if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
        setError('Please fill in all card details');
        return;
      }

      if (cardNumber.replace(/\s/g, '').length < 13) {
        setError('Please enter a valid card number');
        return;
      }

      const cardData = {
        cardNumber: cardNumber.replace(/\s/g, ''),
        cardHolderName,
        expiryMonth: parseInt(expiryMonth),
        expiryYear: parseInt(expiryYear),
        cardType
      };

      const response = await apiService.addPaymentMethod(cardData);
      setPaymentMethods(prev => [...prev, response.paymentMethod]);
      setSelectedPaymentMethod(response.paymentMethod);
      setUseNewCard(false);
      setNewCardForm({
        cardNumber: '',
        cardHolderName: '',
        expiryMonth: '',
        expiryYear: '',
        cvv: '',
        cardType: 'visa'
      });
    } catch (err: any) {
      setError(err.message || 'Failed to add payment method');
    }
  };

  const validateNewCardForm = () => {
    const { cardNumber, cardHolderName, expiryMonth, expiryYear, cvv } = newCardForm;

    if (!cardNumber || !cardHolderName || !expiryMonth || !expiryYear || !cvv) {
      setError('Please fill in all card details');
      return false;
    }

    if (cardNumber.replace(/\s/g, '').length < 13) {
      setError('Please enter a valid card number');
      return false;
    }

    if (cvv.length < 3) {
      setError('Please enter a valid CVV');
      return false;
    }

    return true;
  };

  const handleDeletePaymentMethod = async (paymentMethodId: number) => {
    try {
      await apiService.deletePaymentMethod(paymentMethodId);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
      if (selectedPaymentMethod?.id === paymentMethodId) {
        setSelectedPaymentMethod(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment method');
    }
  };

  const handleSetDefaultPaymentMethod = async (paymentMethodId: number) => {
    try {
      await apiService.setDefaultPaymentMethod(paymentMethodId);
      setPaymentMethods(prev => 
        prev.map(pm => ({
          ...pm,
          isDefault: pm.id === paymentMethodId
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Failed to set default payment method');
    }
  };

  const handleProcessPayment = async () => {
    if (!selectedPaymentMethod && !useNewCard) {
      setError('Please select a payment method');
      return;
    }

    if (useNewCard && !selectedPaymentMethod && !validateNewCardForm()) {
      return;
    }

    if (!checkoutData) {
      setError('Checkout data not found. Please start over.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProcessingTime(0);
      setProcessingMessage('Initializing payment...');

      // Simulate 5-minute payment processing
      const totalTime = processingDurationSeconds;
      const messages = [
        'Initializing payment...',
        'Validating payment method...',
        'Processing with bank...',
        'Verifying transaction...',
        'Securing payment data...',
        'Finalizing transaction...',
        'Payment successful!'
      ];

      let currentTime = 0;
      const interval = setInterval(() => {
        currentTime += 1;
        setProcessingTime(currentTime);
        
        // Update message based on progress
        const progress = currentTime / totalTime;
        const messageIndex = Math.min(Math.floor(progress * messages.length), messages.length - 1);
        setProcessingMessage(messages[messageIndex]);

        if (currentTime >= totalTime) {
          clearInterval(interval);
          // Process the actual payment after simulation
          processActualPayment();
        }
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setIsProcessing(false);
    }
  };

  const processActualPayment = async () => {
    try {
      let paymentLabel = selectedPaymentMethod?.maskedCardNumber || '';

      if (!selectedPaymentMethod && useNewCard) {
        const lastFourDigits = newCardForm.cardNumber.replace(/\s/g, '').slice(-4);
        paymentLabel = `Card ending ${lastFourDigits}`;

        if (saveNewCard) {
          const response = await apiService.addPaymentMethod({
            cardNumber: newCardForm.cardNumber.replace(/\s/g, ''),
            cardHolderName: newCardForm.cardHolderName,
            expiryMonth: parseInt(newCardForm.expiryMonth),
            expiryYear: parseInt(newCardForm.expiryYear),
            cardType: newCardForm.cardType
          });
          paymentLabel = response.paymentMethod.maskedCardNumber;
          setPaymentMethods(prev => [...prev, response.paymentMethod]);
          setSelectedPaymentMethod(response.paymentMethod);
        }
      }

      // Create order
      const shippingAddress = {
        id: 0,
        name: `${checkoutData.shippingInfo.firstName} ${checkoutData.shippingInfo.lastName}`,
        address: checkoutData.shippingInfo.address,
        city: checkoutData.shippingInfo.city,
        state: checkoutData.shippingInfo.state,
        zipCode: checkoutData.shippingInfo.zipCode,
        country: checkoutData.shippingInfo.country,
        phone: checkoutData.shippingInfo.phone,
        type: 'shipping' as const,
        isDefault: false
      };
      
      const billingAddress = {
        id: 0,
        name: `${checkoutData.shippingInfo.firstName} ${checkoutData.shippingInfo.lastName}`,
        address: checkoutData.shippingInfo.address,
        city: checkoutData.shippingInfo.city,
        state: checkoutData.shippingInfo.state,
        zipCode: checkoutData.shippingInfo.zipCode,
        country: checkoutData.shippingInfo.country,
        phone: checkoutData.shippingInfo.phone,
        type: 'billing' as const,
        isDefault: false
      };

      const orderData = {
        items: cartItems,
        shippingAddress,
        billingAddress,
        paymentMethod: paymentLabel,
        shippingMethod: checkoutData.shippingMethod
      };

      const orderResponse = await apiService.createOrder(orderData);
      
      // Clear cart
      await apiService.clearCart();
      clearCart();
      
      // Clear checkout data
      sessionStorage.removeItem('checkoutData');
      
      // Show success message briefly
      setProcessingMessage('Payment successful! Redirecting...');
      
      // Redirect to order confirmation after a brief delay
      setTimeout(() => {
        navigate(`/order/${orderResponse.id}`);
      }, 2000);
      
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No checkout data found</h2>
          <p className="text-gray-600 mb-4">Please start the checkout process again.</p>
          <Link
            to="/checkout"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Checkout
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = checkoutData.shippingMethod === 'express' ? 1327.11 : checkoutData.shippingMethod === 'overnight' ? 2489.17 : 497.17;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Processing Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="text-center space-y-6">
              {/* Processing Icon */}
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              
              {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-blue-600 h-4 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(processingTime / processingDurationSeconds) * 100}%` }}
                  ></div>
                </div>
              
              {/* Progress Text */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{processingMessage}</h3>
                  <p className="text-sm text-gray-600">
                    Time remaining: 0:{Math.max(0, processingDurationSeconds - processingTime).toString().padStart(2, '0')}
                  </p>
                </div>
              
              {/* Security Notice */}
              <div className="text-xs text-gray-500">
                <Shield className="h-4 w-4 inline mr-1" />
                Your payment is being processed securely
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link to="/checkout" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Checkout
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Payment</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center mb-6">
                <CreditCard className="h-6 w-6 text-blue-600 mr-3" />
                <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Saved Payment Methods */}
              {paymentMethods.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Saved Payment Methods</h3>
                  <div className="space-y-3">
                    {paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedPaymentMethod?.id === method.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedPaymentMethod(method);
                          setUseNewCard(false);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <CreditCard className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{method.cardHolderName}</h4>
                              <p className="text-sm text-gray-600">{method.maskedCardNumber}</p>
                              <p className="text-sm text-gray-600">
                                Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {method.isDefault && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefaultPaymentMethod(method.id);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              Set Default
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePaymentMethod(method.id);
                              }}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Card */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Add New Card</h3>
                  <button
                    onClick={() => setUseNewCard(!useNewCard)}
                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {useNewCard ? 'Cancel' : 'Add New Card'}
                  </button>
                </div>

                {useNewCard && (
                  <div className="space-y-4 p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={newCardForm.cardNumber}
                        onChange={handleNewCardInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        name="cardHolderName"
                        value={newCardForm.cardHolderName}
                        onChange={handleNewCardInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Month *
                        </label>
                        <select
                          name="expiryMonth"
                          value={newCardForm.expiryMonth}
                          onChange={handleNewCardInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Month</option>
                          {Array.from({ length: 12 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {(i + 1).toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Year *
                        </label>
                        <select
                          name="expiryYear"
                          value={newCardForm.expiryYear}
                          onChange={handleNewCardInputChange}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Year</option>
                          {Array.from({ length: 10 }, (_, i) => (
                            <option key={i} value={new Date().getFullYear() + i}>
                              {new Date().getFullYear() + i}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CVV *
                      </label>
                      <input
                        type="text"
                        name="cvv"
                        value={newCardForm.cvv}
                        onChange={handleNewCardInputChange}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="saveNewCard"
                        checked={saveNewCard}
                        onChange={(e) => setSaveNewCard(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="saveNewCard" className="text-sm text-gray-700">
                        Save this card for future purchases
                      </label>
                    </div>

                    <button
                      onClick={handleAddNewCard}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Add Card
                    </button>
                  </div>
                )}
              </div>

              {/* Process Payment Button */}
              <div className="mt-8 pt-6 border-t">
                {isProcessing ? (
                  <div className="space-y-4">
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${(processingTime / processingDurationSeconds) * 100}%` }}
                      ></div>
                    </div>
                    
                    {/* Progress Text */}
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{processingMessage}</p>
                      <p className="text-sm text-gray-600">
                        {Math.floor(processingTime / 60)}:{(processingTime % 60).toString().padStart(2, '0')} / 0:{processingDurationSeconds.toString().padStart(2, '0')}
                      </p>
                    </div>
                    
                    {/* Processing Animation */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-blue-600 font-medium">Processing your payment...</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleProcessPayment}
                    disabled={(!selectedPaymentMethod && !useNewCard) || isProcessing}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Pay ₹{total.toFixed(2)}</span>
                  </button>
                )}
              </div>

              {/* Security Notice */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Your payment information is secure and encrypted</span>
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>

              {/* Order Items */}
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center space-x-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-gray-900">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-semibold">₹{shipping.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-semibold">₹{tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Security Features */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">Security Features</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>SSL encrypted checkout</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Fraud protection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
