import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nepal-red to-nepal-blue flex items-center justify-center text-white text-sm shadow-sm">
                🇳🇵
              </div>
              <span className="text-base font-bold text-nepal-red">Mirrago Fashion</span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Nepal&apos;s first AI-powered fashion e-commerce platform
            </p>
            <div className="flex gap-3 mt-4">
              <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-nepal-red hover:text-white transition text-xs" aria-label="Facebook">f</a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-nepal-red hover:text-white transition text-xs" aria-label="Instagram">ig</a>
              <a href="#" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-nepal-red hover:text-white transition text-xs" aria-label="Twitter">𝕏</a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Shop</h3>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-gray-500 hover:text-nepal-red transition text-sm">All Products</Link></li>
              <li><Link href="/products?category=Women" className="text-gray-500 hover:text-nepal-red transition text-sm">Women</Link></li>
              <li><Link href="/products?category=Men" className="text-gray-500 hover:text-nepal-red transition text-sm">Men</Link></li>
              <li><Link href="/products?category=Accessories" className="text-gray-500 hover:text-nepal-red transition text-sm">Accessories</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-500 hover:text-nepal-red transition text-sm">Contact Us</a></li>
              <li><a href="#" className="text-gray-500 hover:text-nepal-red transition text-sm">Shipping Info</a></li>
              <li><a href="#" className="text-gray-500 hover:text-nepal-red transition text-sm">Returns</a></li>
              <li><a href="#" className="text-gray-500 hover:text-nepal-red transition text-sm">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Payment & Delivery</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-md">eSewa</span>
              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-md">Khalti</span>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2 text-sm">Warehouses</h3>
            <div className="flex flex-wrap gap-1.5">
              {['Kathmandu', 'Birgunj', 'Nepalgunj', 'Pokhara', 'Biratnagar'].map((city) => (
                <span key={city} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-gray-400 text-sm">&copy; {new Date().getFullYear()} Mirrago Fashion Nepal. Built with ❤️ in Nepal 🇳🇵</p>
          <div className="flex gap-4 text-sm">
            <Link href="#" className="text-gray-400 hover:text-gray-600 transition">Privacy</Link>
            <Link href="#" className="text-gray-400 hover:text-gray-600 transition">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
