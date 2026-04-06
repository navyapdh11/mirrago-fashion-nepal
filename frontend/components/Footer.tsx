import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🇳🇵</span>
              <span className="text-lg font-bold">Mirrago Fashion</span>
            </div>
            <p className="text-gray-400">
              Nepal&apos;s first AI-powered fashion e-commerce platform
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-gray-400 hover:text-white transition">All Products</Link></li>
              <li><Link href="/products?category=Women" className="text-gray-400 hover:text-white transition">Women</Link></li>
              <li><Link href="/products?category=Men" className="text-gray-400 hover:text-white transition">Men</Link></li>
              <li><Link href="/products?category=Accessories" className="text-gray-400 hover:text-white transition">Accessories</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white transition">Contact Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Shipping Info</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">Returns</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white transition">FAQ</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Warehouses</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li>Kathmandu</li>
              <li>Birgunj</li>
              <li>Nepalgunj</li>
              <li>Pokhara</li>
              <li>Biratnagar</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; {new Date().getFullYear()} Mirrago Fashion Nepal. Built with ❤️ in Nepal 🇳🇵</p>
        </div>
      </div>
    </footer>
  );
}
