import Link from 'next/link';
import { ShoppingBag, ArrowRight, Minus, Plus, X } from 'lucide-react';

export const metadata = {
  title: 'Shopping Cart | Mirrago Fashion Nepal',
  description: 'Review your cart and proceed to checkout',
};

export default function CartPage() {
  // TODO: Connect to mobile cart API
  const cartItems: any[] = [];
  const subtotal = 0;

  if (cartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-24 h-24 mx-auto text-gray-300 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-gray-600 mb-8">
          Looks like you haven&apos;t added any items to your cart yet.
        </p>
        <Link 
          href="/products" 
          className="bg-nepal-red text-white px-8 py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition inline-flex items-center gap-2"
        >
          Continue Shopping
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({cartItems.length} items)</h1>
      
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item) => (
            <div key={item.id} className="flex gap-4 bg-white p-4 rounded-lg shadow">
              <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold">{item.product?.name}</h3>
                <p className="text-gray-600 text-sm">{item.product?.category}</p>
                <p className="text-nepal-red font-bold mt-1">
                  NPR {item.product?.price.toLocaleString()}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button className="p-1 border rounded hover:bg-gray-100">
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-medium">{item.quantity}</span>
                  <button className="p-1 border rounded hover:bg-gray-100">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button className="ml-auto text-gray-500 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>NPR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>NPR 100</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (13%)</span>
              <span>NPR {Math.round(subtotal * 0.13).toLocaleString()}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>NPR {(subtotal + 100 + Math.round(subtotal * 0.13)).toLocaleString()}</span>
            </div>
          </div>
          <Link 
            href="/checkout"
            className="w-full bg-nepal-red text-white py-3 rounded-lg font-semibold hover:bg-nepal-crimson transition flex items-center justify-center gap-2"
          >
            Proceed to Checkout
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-gray-500 mt-3 text-center">
            Secure checkout powered by eSewa & Khalti
          </p>
        </div>
      </div>
    </div>
  );
}
