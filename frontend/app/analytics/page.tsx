'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, DollarSign, Warehouse, Loader2, AlertTriangle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080/api';

interface AnalyticsData {
  metrics: {
    total_revenue: number;
    total_orders: number;
    average_order_value: number;
    total_customers: number;
    orders_by_status: Record<string, number>;
  };
  revenue_over_time: Array<{ date: string; revenue: number; orders: number }>;
  top_products: Array<{ name: string; category: string; units_sold: number; revenue: number }>;
  warehouses: Array<{ city: string; code: string; inventory_levels_count: number }>;
  payment_gateways: Array<{ gateway: string; attempts: number; successful: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_URL}/analytics?period=${period}`);

        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const result = await response.json();
        setData(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load analytics';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  const formatCurrency = (amount: number) => `NPR ${amount.toLocaleString()}`;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading analytics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Failed to Load Analytics</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, revenue_over_time, top_products, warehouses, payment_gateways } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                period === p
                  ? 'bg-nepal-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<DollarSign className="w-6 h-6" />}
          label="Total Revenue"
          value={formatCurrency(metrics.total_revenue)}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          icon={<Package className="w-6 h-6" />}
          label="Total Orders"
          value={metrics.total_orders.toString()}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Avg Order Value"
          value={formatCurrency(metrics.average_order_value)}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          icon={<Users className="w-6 h-6" />}
          label="New Customers"
          value={metrics.total_customers.toString()}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Revenue Over Time */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Revenue Over Time</h2>
          {revenue_over_time.length > 0 ? (
            <div className="space-y-3">
              {revenue_over_time.slice(-7).map((day) => (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-24">{day.date}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className="bg-nepal-red h-full rounded-full transition-all"
                      style={{
                        width: `${revenue_over_time.length > 0 ? (day.revenue / Math.max(...revenue_over_time.map((d) => d.revenue))) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-24 text-right">
                    {formatCurrency(day.revenue)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No revenue data yet</p>
          )}
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Orders by Status</h2>
          {Object.keys(metrics.orders_by_status).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(metrics.orders_by_status).map(([status, count]) => {
                const total = Object.values(metrics.orders_by_status).reduce((a, b) => a + b, 0);
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                const statusColors: Record<string, string> = {
                  pending: 'bg-yellow-500',
                  processing: 'bg-blue-500',
                  shipped: 'bg-purple-500',
                  delivered: 'bg-green-500',
                  cancelled: 'bg-red-500',
                };
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-sm capitalize w-24 text-gray-600">{status}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className={`${statusColors[status] || 'bg-gray-500'} h-full rounded-full transition-all`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {count} ({percent}%)
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No order data yet</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Top Products by Revenue</h2>
          {top_products.length > 0 ? (
            <div className="space-y-3">
              {top_products.slice(0, 5).map((product, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.category} · {product.units_sold} sold</p>
                  </div>
                  <span className="font-bold text-nepal-red">{formatCurrency(product.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No sales data yet</p>
          )}
        </div>

        {/* Warehouse Inventory */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Warehouse Inventory</h2>
          <div className="space-y-3">
            {warehouses.map((wh) => (
              <div key={wh.code} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <Warehouse className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{wh.city}</p>
                    <p className="text-sm text-gray-500">{wh.code}</p>
                  </div>
                </div>
                <span className="font-medium">{wh.inventory_levels_count} items in stock</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Gateway Performance */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Payment Gateway Performance</h2>
        {payment_gateways.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-6">
            {payment_gateways.map((gw) => {
              const successRate = gw.attempts > 0 ? Math.round((gw.successful / gw.attempts) * 100) : 0;
              return (
                <div key={gw.gateway} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold capitalize">{gw.gateway}</h3>
                    <span className="text-sm text-gray-500">{gw.attempts} attempts</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-green-500 h-full rounded-full transition-all"
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                    <span className="font-medium text-sm">{successRate}% success</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{gw.successful} successful transactions</p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No payment data yet</p>
        )}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bgColor} ${color}`}>{icon}</div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
