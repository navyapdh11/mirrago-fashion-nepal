'use client';

import Link from 'next/link';
import { ShoppingBag, ArrowRight, Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, totalPrice } = useCart();
  const shipping = items.length > 0 ? 100 : 0;
  const tax = Math.round(totalPrice * 0.13);
  const grandTotal = totalPrice + shipping + tax;

  if (items.length === 0) {
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
      <h1 className="text-3xl font-bold mb-8">Shopping Cart ({items.length} items)</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={`${item.product_id}-${item.size}`} className="flex gap-4 bg-white p-4 rounded-lg shadow">
              <div className="w-24 h-24 bg-gray-100 rounded flex-shrink-0 overflow-hidden relative">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-4xl">👕</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{item.name}</h3>
                {item.size && <p className="text-gray-600 text-sm">Size: {item.size}</p>}
                <p className="text-nepal-red font-bold mt-1">
                  NPR {item.price.toLocaleString()}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product_id, item.size, item.quantity - 1)}
                    className="p-1 border rounded hover:bg-gray-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product_id, item.size, item.quantity + 1)}
                    className="p-1 border rounded hover:bg-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.product_id, item.size)}
                    className="ml-auto text-gray-500 hover:text-red-500"
                    aria-label="Remove item"
                  >
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
              <span>NPR {totalPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>NPR {shipping.toLocaleString()}</span>
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
