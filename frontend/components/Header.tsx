'use client';

import Link from 'next/link';
import { ShoppingCart, Menu, X, User } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🇳🇵</span>
            <span className="text-xl font-bold text-nepal-red">Mirrago Fashion</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-nepal-red transition">Home</Link>
            <Link href="/products" className="text-gray-700 hover:text-nepal-red transition">Products</Link>
            <Link href="/products?category=Women" className="text-gray-700 hover:text-nepal-red transition">Women</Link>
            <Link href="/products?category=Men" className="text-gray-700 hover:text-nepal-red transition">Men</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link href="/cart" className="relative text-gray-700 hover:text-nepal-red transition">
              <ShoppingCart className="w-6 h-6" />
            </Link>
            <button className="text-gray-700 hover:text-nepal-red transition">
              <User className="w-6 h-6" />
            </button>
            <button 
              className="md:hidden text-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-3">
              <Link href="/" className="text-gray-700 hover:text-nepal-red py-2">Home</Link>
              <Link href="/products" className="text-gray-700 hover:text-nepal-red py-2">Products</Link>
              <Link href="/products?category=Women" className="text-gray-700 hover:text-nepal-red py-2">Women</Link>
              <Link href="/products?category=Men" className="text-gray-700 hover:text-nepal-red py-2">Men</Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
