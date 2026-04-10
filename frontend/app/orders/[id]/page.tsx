'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Package,
  CheckCircle,
  Truck,
  Clock,
  MapPin,
  CreditCard,
  ArrowRight,
  Loader2,
  ShoppingBag,
  Phone,
  Mail,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  size: string | null;
  quantity: number;
  price: number;
  image_url: string | null;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_email: string;
  payment_method: string;
  payment_status: string | null;
  payment_url: string | null;
  created_at: string;
  items: OrderItem[];
}

function getStatusIcon(status: string): React.ReactNode {
  switch (status.toLowerCase()) {
    case 'pending':
      return <Clock className="w-6 h-6 text-yellow-600" />;
    case 'processing':
      return <Package className="w-6 h-6 text-blue-600" />;
    case 'shipped':
    case 'in_transit':
      return <Truck className="w-6 h-6 text-blue-600" />;
    case 'delivered':
    case 'completed':
      return <CheckCircle className="w-6 h-6 text-green-600" />;
    case 'cancelled':
    case 'refunded':
      return <CheckCircle className="w-6 h-6 text-red-600" />;
    default:
      return <Clock className="w-6 h-6 text-gray-600" />;
  }
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'processing':
      return 'bg-yellow-100 text-yellow-800';
    case 'shipped':
    case 'in_transit':
      return 'bg-blue-100 text-blue-800';
    case 'delivered':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
    case 'refunded':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

async function fetchOrder(token: string, orderId: string): Promise<Order> {
  const response = await fetch(`${API_URL}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export default function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const { token, isAuthenticated } = useAuth();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!token || !params.id) return;

    setIsLoading(true);
    setError('');

    try {
      const data = await fetchOrder(token, params.id);
      setOrder(data);
    } catch {
      setError('Failed to load order details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [token, params.id]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadOrder();
    } else if (!isLoading) {
      router.push('/login?redirect=/orders/' + params.id);
    }
  }, [isAuthenticated, token, loadOrder, router, params.id, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-nepal-red animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Order Not Found</h1>
        <p className="text-gray-600 mb-8">{error || 'We could not find the order you are looking for.'}</p>
        <button
          onClick={() => router.push('/products')}
          className="bg-nepal-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition inline-flex items-center gap-2"
        >
          Browse Products
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  const isPaymentPending = order.payment_status !== 'paid' && order.payment_url;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl p-8 mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-green-800 mb-2">Order Confirmed!</h1>
        <p className="text-green-700">
          Thank you for your order. Your order #{order.order_number} has been placed successfully.
        </p>
        {order.status.toLowerCase() === 'pending' && (
          <div className="mt-4 inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Order is being processed</span>
          </div>
        )}
      </div>

      {/* Payment CTA */}
      {isPaymentPending && (
        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Complete Your Payment</h3>
              <p className="text-gray-600 text-sm">
                Pay NPR {order.total.toLocaleString()} via {order.payment_method?.toUpperCase()}
              </p>
            </div>
            <a
              href={order.payment_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-nepal-red text-white px-6 py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition inline-flex items-center gap-2"
            >
              <CreditCard className="w-5 h-5" />
              Pay Now
            </a>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mb-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-nepal-red" />
              Order Items
            </h2>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0 last:pb-0">
                  <div className="w-20 h-20 bg-gray-100 rounded flex-shrink-0 overflow-hidden relative">
                    {item.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-3xl">👕</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.product_name}</h3>
                    {item.size && <p className="text-gray-600 text-sm">Size: {item.size}</p>}
                    <p className="text-gray-600 text-sm">Qty: {item.quantity}</p>
                    <p className="text-nepal-red font-bold mt-1">
                      NPR {(item.price * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-nepal-blue" />
              Shipping Information
            </h2>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Package className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium">{order.shipping_name}</p>
                  <p className="text-gray-600 text-sm">{order.shipping_address}</p>
                  <p className="text-gray-600 text-sm">{order.shipping_city}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-600 text-sm">
                <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{order.shipping_phone}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600 text-sm">
                <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{order.shipping_email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Order Status</h3>
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(order.status)}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status}
              </span>
            </div>

            <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Status</h3>
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-400" />
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.payment_status === 'paid'
                  ? 'bg-green-100 text-green-800'
                  : order.payment_status === 'failed'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {order.payment_status || 'Pending'}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <h3 className="text-lg font-bold mb-4">Order Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Subtotal</span>
                <span>NPR {order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Shipping</span>
                <span>NPR {order.shipping.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-sm">
                <span>Tax (13%)</span>
                <span>NPR {order.tax.toLocaleString()}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-nepal-red">NPR {order.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p><strong>Payment Method:</strong> {order.payment_method?.toUpperCase() || 'N/A'}</p>
              <p><strong>Order Date:</strong> {new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}</p>
              <p><strong>Order ID:</strong> #{order.id}</p>
            </div>
          </div>

          {/* Actions */}
          <button
            onClick={() => router.push('/profile')}
            className="w-full bg-nepal-blue text-white py-3 rounded-lg font-semibold hover:bg-nepal-darkblue transition flex items-center justify-center gap-2"
          >
            View All Orders
            <ArrowRight className="w-5 h-5" />
          </button>

          <button
            onClick={() => router.push('/products')}
            className="w-full border-2 border-nepal-red text-nepal-red py-3 rounded-lg font-semibold hover:bg-nepal-red hover:text-white transition flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ShoppingBag className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nepal Accent Bar */}
      <div className="mt-12 flex justify-center gap-2">
        <div className="w-8 h-1 rounded-full bg-nepal-red" />
        <div className="w-8 h-1 rounded-full bg-nepal-blue" />
      </div>
    </div>
  );
}
