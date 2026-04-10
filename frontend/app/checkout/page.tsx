'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, Wallet, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  email: string;
}

interface FormErrors {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  email?: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated, token } = useAuth();

  const [shipping, setShipping] = useState<ShippingInfo>({
    fullName: '',
    phone: '',
    address: '',
    city: 'Kathmandu',
    email: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'esewa' | 'khalti'>('esewa');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');

  const shippingCost = items.length > 0 ? 100 : 0;
  const tax = Math.round(totalPrice * 0.13);
  const grandTotal = totalPrice + shippingCost + tax;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!shipping.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!shipping.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+977-?\d{10}$/.test(shipping.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Enter a valid Nepali phone number (+977-98XXXXXXXX)';
    }
    if (!shipping.address.trim()) newErrors.address = 'Address is required';
    if (!shipping.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shipping.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOrderError('');

    if (items.length === 0) {
      setOrderError('Your cart is empty');
      return;
    }

    if (!validateForm()) return;

    if (!isAuthenticated || !token) {
      router.push('/login?redirect=/checkout');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API endpoint
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size: item.size,
          })),
          shipping_info: shipping,
          payment_method: paymentMethod,
          subtotal: totalPrice,
          shipping: shippingCost,
          tax: tax,
          total: grandTotal,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || 'Failed to create order');
      }

      const order = await response.json();

      // Clear cart after successful order
      clearCart();

      // Redirect to payment or order confirmation
      if (order.payment_url) {
        window.location.href = order.payment_url;
      } else {
        router.push(`/orders/${order.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to place order. Please try again.';
      setOrderError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof ShippingInfo) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setShipping(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (items.length === 0 && !isSubmitting) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-gray-600 mb-8">Add items to your cart before checking out.</p>
        <Link
          href="/products"
          className="bg-nepal-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition inline-flex items-center gap-2"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link href="/cart" className="inline-flex items-center gap-2 text-nepal-blue hover:text-nepal-red mb-8 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Info */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Shipping Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    id="fullName"
                    type="text"
                    value={shipping.fullName}
                    onChange={handleChange('fullName')}
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent ${errors.fullName ? 'border-red-500' : ''}`}
                    placeholder="Ram Sharma"
                  />
                  {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    value={shipping.phone}
                    onChange={handleChange('phone')}
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent ${errors.phone ? 'border-red-500' : ''}`}
                    placeholder="+977-98XXXXXXXX"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium mb-1">Address</label>
                  <input
                    id="address"
                    type="text"
                    value={shipping.address}
                    onChange={handleChange('address')}
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent ${errors.address ? 'border-red-500' : ''}`}
                    placeholder="Street address"
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium mb-1">City</label>
                  <select
                    id="city"
                    value={shipping.city}
                    onChange={handleChange('city')}
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent"
                  >
                    <option>Kathmandu</option>
                    <option>Birgunj</option>
                    <option>Nepalgunj</option>
                    <option>Pokhara</option>
                    <option>Biratnagar</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={shipping.email}
                    onChange={handleChange('email')}
                    className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className={`border-2 rounded-lg p-4 cursor-pointer hover:border-nepal-red transition flex items-center gap-3 ${paymentMethod === 'esewa' ? 'border-nepal-red bg-green-50' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="esewa"
                    checked={paymentMethod === 'esewa'}
                    onChange={() => setPaymentMethod('esewa')}
                    className="accent-nepal-red"
                  />
                  <Wallet className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold">eSewa</p>
                    <p className="text-sm text-gray-500">Pay with eSewa wallet</p>
                  </div>
                </label>
                <label className={`border-2 rounded-lg p-4 cursor-pointer hover:border-nepal-red transition flex items-center gap-3 ${paymentMethod === 'khalti' ? 'border-nepal-red bg-purple-50' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="khalti"
                    checked={paymentMethod === 'khalti'}
                    onChange={() => setPaymentMethod('khalti')}
                    className="accent-nepal-red"
                  />
                  <CreditCard className="w-6 h-6 text-purple-600" />
                  <div>
                    <p className="font-semibold">Khalti</p>
                    <p className="text-sm text-gray-500">Pay with Khalti wallet</p>
                  </div>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Payment failover enabled - if one gateway fails, we automatically try the other
              </p>
            </div>

            {/* Error Display */}
            {orderError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {orderError}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full bg-nepal-red text-white py-4 rounded-lg font-bold text-lg hover:bg-nepal-crimson transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Order...
                </>
              ) : (
                `Place Order - NPR ${grandTotal.toLocaleString()}`
              )}
            </button>
          </div>

          {/* Order Summary */}
          <div className="bg-white p-6 rounded-lg shadow h-fit">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 mb-4">
              {items.map(item => (
                <div key={`${item.product_id}-${item.size}`} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.name} {item.size && `(${item.size})`} × {item.quantity}
                  </span>
                  <span className="font-medium">NPR {(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>NPR {totalPrice.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span>NPR {shippingCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax (13%)</span>
                <span>NPR {tax.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>NPR {grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
