<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\Payment;
use App\Models\AiRecommendation;
use App\Services\AIRecommendationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function __construct(
        protected AIRecommendationService $recommendationService,
    ) {
    }

    /**
     * GET /api/analytics/dashboard - Main analytics dashboard
     * Matches frontend AnalyticsDashboardPage expectations
     */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $days = 30; // Default to 30 days
        $since = now()->subDays($days);
        $previousSince = now()->subDays($days * 2);

        // Core metrics
        $totalRevenue = Order::where('user_id', $user->id)
            ->where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since)
            ->sum('total');

        $totalOrders = Order::where('user_id', $user->id)
            ->where('created_at', '>=', $since)
            ->count();

        $totalProducts = Product::active()->count();
        $totalUsers = DB::table('users')->where('created_at', '>=', $since)->count();

        // Previous period for comparison
        $previousRevenue = Order::where('user_id', $user->id)
            ->where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$previousSince, $since])
            ->sum('total');

        $previousOrders = Order::where('user_id', $user->id)
            ->whereBetween('created_at', [$previousSince, $since])
            ->count();

        $previousProducts = Product::active()->where('created_at', '<', $since)->count();
        $previousUsers = DB::table('users')->whereBetween('created_at', [$previousSince, $since])->count();

        // Calculate percentage changes
        $orderChange = $previousOrders > 0 ? round((($totalOrders - $previousOrders) / $previousOrders) * 100) : 0;
        $revenueChange = $previousRevenue > 0 ? round((($totalRevenue - $previousRevenue) / $previousRevenue) * 100) : 0;
        $productsChange = $previousProducts > 0 ? round((($totalProducts - $previousProducts) / $previousProducts) * 100) : 0;
        $usersChange = $previousUsers > 0 ? round((($totalUsers - $previousUsers) / $previousUsers) * 100) : 0;

        // Recent orders
        $recentOrders = Order::where('user_id', $user->id)
            ->with(['items.product'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn($order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'status' => $order->status,
                'total' => (float) $order->total,
                'created_at' => $order->created_at->toIso8601String(),
                'customer_name' => $order->customer_name,
            ]);

        // Top products by revenue (global, not user-specific)
        $topProducts = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->where('order_items.created_at', '>=', $since)
            ->selectRaw('products.id, products.name, products.primary_image_url, SUM(order_items.quantity) as total_sold, SUM(order_items.total) as revenue')
            ->groupBy('products.id', 'products.name', 'products.primary_image_url')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'total_sold' => (int) $p->total_sold,
                'revenue' => (float) $p->revenue,
                'image_url' => $p->primary_image_url,
            ]);

        // Sales by category
        $salesByCategory = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->where('order_items.created_at', '>=', $since)
            ->selectRaw('products.category, COUNT(*) as count, SUM(order_items.total) as revenue')
            ->groupBy('products.category')
            ->orderByDesc('revenue')
            ->get()
            ->map(fn($c) => [
                'category' => $c->category,
                'count' => (int) $c->count,
                'revenue' => (float) $c->revenue,
            ]);

        // Top shipping cities
        $shippingCities = Order::where('created_at', '>=', $since)
            ->selectRaw('shipping_city as city, COUNT(*) as orders')
            ->groupBy('shipping_city')
            ->orderByDesc('orders')
            ->limit(5)
            ->get();

        // AI recommendations stats
        $totalRecommendations = AiRecommendation::where('created_at', '>=', $since)->count();
        $accepted = AiRecommendation::where('created_at', '>=', $since)
            ->where('accepted', true)
            ->count();
        $acceptanceRate = $totalRecommendations > 0 ? round(($accepted / $totalRecommendations) * 100) : 0;

        // Try-on usage (from mirrago_sessions)
        $tryOnUsage = DB::table('mirrago_sessions')
            ->where('created_at', '>=', $since)
            ->count();

        return response()->json([
            'overview' => [
                'total_orders' => $totalOrders,
                'total_revenue' => (float) $totalRevenue,
                'total_products' => $totalProducts,
                'total_users' => $totalUsers,
                'order_change' => $orderChange,
                'revenue_change' => $revenueChange,
                'products_change' => $productsChange,
                'users_change' => $usersChange,
            ],
            'recent_orders' => $recentOrders,
            'top_products' => $topProducts,
            'sales_by_category' => $salesByCategory,
            'shipping_cities' => $shippingCities,
            'ai_recommendations_stats' => [
                'total_recommendations' => $totalRecommendations,
                'accepted' => $accepted,
                'acceptance_rate' => $acceptanceRate,
                'try_on_usage' => $tryOnUsage,
            ],
        ]);
    }

    /**
     * GET /api/analytics/revenue - Revenue-specific metrics
     */
    public function revenue(Request $request): JsonResponse
    {
        $days = $request->integer('days', 30);
        $since = now()->subDays($days);

        // Current period vs previous period comparison
        $currentRevenue = Order::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since)
            ->sum('total');

        $previousSince = now()->subDays($days * 2)->subDays($days);
        $previousRevenue = Order::where('status', '!=', 'cancelled')
            ->whereBetween('created_at', [$previousSince, $since])
            ->sum('total');

        $revenueGrowth = $previousRevenue > 0
            ? round((($currentRevenue - $previousRevenue) / $previousRevenue) * 100, 2)
            : 0;

        $currentOrders = Order::where('created_at', '>=', $since)->count();
        $previousOrders = Order::whereBetween('created_at', [$previousSince, $since])->count();

        $currentAOV = $currentOrders > 0 ? round($currentRevenue / $currentOrders, 2) : 0;
        $previousAOV = $previousOrders > 0 ? round($previousRevenue / $previousOrders, 2) : 0;

        // Daily revenue breakdown
        $dailyRevenue = Order::where('status', '!=', 'cancelled')
            ->where('created_at', '>=', $since)
            ->selectRaw('DATE(created_at) as date, SUM(total) as revenue, COUNT(*) as orders, AVG(total) as aov')
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Revenue by payment gateway
        $revenueByGateway = Payment::where('status', 'completed')
            ->where('created_at', '>=', $since)
            ->join('orders', 'payments.order_id', '=', 'orders.id')
            ->selectRaw('payments.gateway, SUM(orders.total) as revenue, COUNT(*) as transactions')
            ->groupBy('payments.gateway')
            ->get();

        return response()->json([
            'period_days' => $days,
            'current_revenue' => round($currentRevenue, 2),
            'previous_revenue' => round($previousRevenue, 2),
            'revenue_growth_percent' => $revenueGrowth,
            'current_orders' => $currentOrders,
            'previous_orders' => $previousOrders,
            'current_aov' => $currentAOV,
            'previous_aov' => $previousAOV,
            'daily_revenue' => $dailyRevenue,
            'revenue_by_gateway' => $revenueByGateway,
        ]);
    }

    /**
     * GET /api/analytics/products - Product performance analytics
     */
    public function products(Request $request): JsonResponse
    {
        $days = $request->integer('days', 30);
        $since = now()->subDays($days);

        // Best sellers
        $bestSellers = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->where('order_items.created_at', '>=', $since)
            ->selectRaw('products.id, products.name, products.category, products.price, SUM(order_items.quantity) as units_sold, SUM(order_items.total) as revenue')
            ->groupBy('products.id', 'products.name', 'products.category', 'products.price')
            ->orderByDesc('units_sold')
            ->limit(10)
            ->get();

        // Worst sellers (products with no sales)
        $worstSellers = Product::active()
            ->whereNotIn('id', function ($query) use ($since) {
                $query->select('product_id')
                    ->from('order_items')
                    ->where('created_at', '>=', $since);
            })
            ->select('id', 'name', 'category', 'price')
            ->limit(10)
            ->get();

        // Category performance
        $categoryPerformance = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->where('order_items.created_at', '>=', $since)
            ->selectRaw('products.category, COUNT(DISTINCT products.id) as products_sold, SUM(order_items.quantity) as units_sold, SUM(order_items.total) as revenue, AVG(order_items.total) as avg_item_value')
            ->groupBy('products.category')
            ->orderByDesc('revenue')
            ->get();

        // Inventory summary
        $inventorySummary = DB::table('inventory_levels')
            ->join('warehouses', 'inventory_levels.warehouse_id', '=', 'warehouses.id')
            ->selectRaw('warehouses.city, warehouses.code, SUM(inventory_levels.stock_qty) as total_stock, SUM(inventory_levels.reserved_qty) as reserved, SUM(CASE WHEN inventory_levels.stock_qty <= inventory_levels.reorder_level THEN 1 ELSE 0 END) as low_stock_items')
            ->groupBy('warehouses.id', 'warehouses.city', 'warehouses.code')
            ->get();

        return response()->json([
            'period_days' => $days,
            'best_sellers' => $bestSellers,
            'worst_sellers' => $worstSellers,
            'category_performance' => $categoryPerformance,
            'inventory_summary' => $inventorySummary,
        ]);
    }
}
