'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useRequireAuth, type UserProfile } from '@/context/AuthContext';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Edit2,
  Save,
  X,
  LogOut,
  Package,
  Loader2,
  ShoppingBag,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

interface Order {
  id: number;
  order_number: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shipping_address: string;
  shipping_city: string;
  payment_status: string | null;
  created_at: string;
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

async function fetchWithToken<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
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

export default function ProfilePage() {
  const { user, token, logout, isAuthenticated, isLoading: authLoading, updateProfile } = useAuth();
  const router = useRouter();

  useRequireAuth('/login');

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');

  // Load orders
  const loadOrders = useCallback(async () => {
    if (!token) return;
    setOrdersLoading(true);
    setOrdersError('');
    try {
      const data = await fetchWithToken<Order[]>('/orders', token);
      setOrders(data);
    } catch {
      setOrdersError('Failed to load order history.');
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && token) {
      loadOrders();
    }
  }, [isAuthenticated, token, loadOrders]);

  // Initialize edit fields
  useEffect(() => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || '');
    }
  }, [user]);

  // Redirect if not authenticated (after hydration)
  if (!authLoading && !isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleSaveProfile = async () => {
    setSaveError('');
    setIsSaving(true);

    try {
      await updateProfile({ name: editName, phone: editPhone || null });
      setIsEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (user) {
      setEditName(user.name);
      setEditPhone(user.phone || '');
    }
    setIsEditing(false);
    setSaveError('');
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-nepal-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-nepal-red/10 flex items-center justify-center">
            <User className="w-6 h-6 text-nepal-red" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-500 text-sm">Manage your account settings</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-gray-600 hover:text-nepal-red transition px-4 py-2 border border-gray-300 rounded-lg hover:border-nepal-red"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            {/* Avatar */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-nepal-red to-nepal-blue flex items-center justify-center text-white text-2xl font-bold mb-3">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{user.name}</h2>
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>

            {/* Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4 text-nepal-blue flex-shrink-0" />
                <span className="text-sm">{user.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-4 h-4 text-nepal-blue flex-shrink-0" />
                <span className="text-sm">{user.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-4 h-4 text-nepal-blue flex-shrink-0" />
                <span className="text-sm">
                  Joined {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Edit Profile */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-nepal-red" />
                Edit Profile
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-nepal-blue text-sm font-medium hover:text-nepal-darkblue transition"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {saveError}
                  </div>
                )}

                <div>
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nepal-blue focus:border-nepal-blue outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nepal-blue focus:border-nepal-blue outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-2 bg-nepal-blue text-white px-5 py-2 rounded-lg font-medium hover:bg-nepal-darkblue transition disabled:opacity-60"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Name</span>
                  <p className="font-medium text-gray-900">{user.name}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Email</span>
                  <p className="font-medium text-gray-900">{user.email}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Phone</span>
                  <p className="font-medium text-gray-900">{user.phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Member Since</span>
                  <p className="font-medium text-gray-900">
                    {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order History */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Package className="w-5 h-5 text-nepal-red" />
              Order History
            </h3>

            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 text-nepal-red animate-spin" />
              </div>
            ) : ordersError ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>{ordersError}</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium">No orders yet</p>
                <p className="text-sm mt-1">Start shopping to see your orders here</p>
                <button
                  onClick={() => router.push('/products')}
                  className="mt-4 text-nepal-red font-medium hover:text-nepal-crimson transition"
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="font-semibold text-gray-900">#{order.order_number}</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Subtotal</span>
                        <p className="font-medium">NPR {order.subtotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Shipping</span>
                        <p className="font-medium">NPR {order.shipping.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Payment</span>
                        <p className="font-medium">{order.payment_status || 'Pending'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Total</span>
                        <p className="font-bold text-nepal-red">NPR {order.total.toLocaleString()}</p>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-3">
                      Shipping to: {order.shipping_city}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
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
