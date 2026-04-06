import Link from 'next/link';
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react';

export const metadata = {
  title: 'Checkout | Mirrago Fashion Nepal',
  description: 'Complete your purchase securely',
};

export default function CheckoutPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <Link href="/cart" className="inline-flex items-center gap-2 text-nepal-blue hover:text-nepal-red mb-8 transition">
        <ArrowLeft className="w-4 h-4" />
        Back to Cart
      </Link>

      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Shipping Info */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Shipping Information</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input type="text" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="tel" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent" placeholder="+977-98XXXXXXXX" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Address</label>
                <input type="text" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <select className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent">
                  <option>Kathmandu</option>
                  <option>Birgunj</option>
                  <option>Nepalgunj</option>
                  <option>Pokhara</option>
                  <option>Biratnagar</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-nepal-red focus:border-transparent" />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Payment Method</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="border-2 rounded-lg p-4 cursor-pointer hover:border-nepal-red transition flex items-center gap-3">
                <input type="radio" name="payment" value="esewa" className="accent-nepal-red" defaultChecked />
                <Wallet className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold">eSewa</p>
                  <p className="text-sm text-gray-500">Pay with eSewa wallet</p>
                </div>
              </label>
              <label className="border-2 rounded-lg p-4 cursor-pointer hover:border-nepal-red transition flex items-center gap-3">
                <input type="radio" name="payment" value="khalti" className="accent-nepal-red" />
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

          {/* Submit */}
          <button className="w-full bg-nepal-red text-white py-4 rounded-lg font-bold text-lg hover:bg-nepal-crimson transition">
            Place Order
          </button>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-6 rounded-lg shadow h-fit">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="text-center py-8 text-gray-500">
            <p>Your cart is empty</p>
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>NPR 0</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Shipping</span>
              <span>NPR 100</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Tax (13%)</span>
              <span>NPR 0</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>NPR 100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
