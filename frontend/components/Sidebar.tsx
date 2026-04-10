'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ShoppingBag,
  Shirt,
  User,
  ShoppingCart,
  Search,
  X,
  Menu,
  ChevronLeft,
  ChevronRight,
  Package,
  Heart,
  BarChart3,
  LogOut,
  Settings,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = () => setUserMenuOpen(false);
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
    };
  }, [userMenuOpen]);

  const navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'All Products', href: '/products', icon: ShoppingBag },
    { label: 'Women', href: '/products?category=Women', icon: Shirt },
    { label: 'Men', href: '/products?category=Men', icon: Shirt },
    { label: 'Accessories', href: '/products?category=Accessories', icon: Package },
    { label: 'AI Try-On', href: '/products?tryon=true', icon: Sparkles },
  ];

  const bottomItems: NavItem[] = [
    { label: 'Orders', href: '/orders', icon: Package },
    { label: 'Favorites', href: '/favorites', icon: Heart },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery)}`;
      setSearchQuery('');
      setSearchOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white shadow-md text-gray-700 hover:text-nepal-red transition"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 lg:z-30
          bg-white shadow-xl flex flex-col transition-all duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
          w-72 lg:w-auto
        `}
      >
        {/* Logo / Brand */}
        <div className={`flex items-center ${collapsed ? 'lg:justify-center px-3' : 'px-5'} py-5 border-b border-gray-100`}>
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nepal-red to-nepal-blue flex items-center justify-center text-white text-lg shadow-md">
              🇳🇵
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <span className="text-lg font-bold text-nepal-red block leading-tight">Mirrago</span>
                <span className="text-xs text-gray-500 font-medium">Fashion Nepal</span>
              </div>
            )}
          </Link>
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex ml-auto w-8 h-8 items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-nepal-red transition shrink-0"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
          {/* Close button (mobile only) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className={`px-3 py-3 ${collapsed ? 'lg:justify-center lg:flex' : ''}`}>
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  autoFocus
                  className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-nepal-red/40 focus:border-nepal-red transition"
                />
                <button
                  type="button"
                  onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-nepal-red transition ${collapsed ? 'lg:justify-center' : ''}`}
            >
              <Search className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Search</span>}
            </button>
          )}
        </div>

        {/* Main navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                  ${active
                    ? 'bg-gradient-to-r from-nepal-red/10 to-nepal-blue/5 text-nepal-red font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-nepal-red'}
                  ${collapsed ? 'lg:justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-nepal-red rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-nepal-red' : 'text-gray-400 group-hover:text-nepal-red'} transition`} />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
                {item.badge && !collapsed && (
                  <span className="ml-auto bg-nepal-red text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-gray-100 px-3 py-3 space-y-1">
          {/* Cart link with badge */}
          <Link
            href="/cart"
            className={`
              group flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-nepal-red transition relative
              ${collapsed ? 'lg:justify-center' : ''}
            `}
            title={collapsed ? 'Cart' : undefined}
          >
            <div className="relative">
              <ShoppingCart className="w-5 h-5 shrink-0 text-gray-400 group-hover:text-nepal-red transition" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-nepal-red text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-sm min-w-[18px]">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="text-sm font-medium">Cart</span>
                {totalItems > 0 && (
                  <span className="ml-auto text-xs text-gray-400">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                )}
              </>
            )}
          </Link>

          {/* Bottom nav items */}
          {bottomItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative
                  ${active
                    ? 'bg-gradient-to-r from-nepal-red/10 to-nepal-blue/5 text-nepal-red font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-nepal-red'}
                  ${collapsed ? 'lg:justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-nepal-red rounded-r-full" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-nepal-red' : 'text-gray-400 group-hover:text-nepal-red'} transition`} />
                {!collapsed && <span className="text-sm truncate">{item.label}</span>}
              </Link>
            );
          })}

          {/* User menu */}
          {user ? (
            <div className="relative pt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-nepal-red transition ${collapsed ? 'lg:justify-center' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nepal-red to-nepal-blue flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                {!collapsed && (
                  <>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name || 'User'}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Settings className="w-4 h-4 text-gray-400" />
                  </>
                )}
              </button>
              {!collapsed && userMenuOpen && (
                <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-10">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="w-4 h-4" /> Profile
                  </Link>
                  <Link
                    href="/orders"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Package className="w-4 h-4" /> My Orders
                  </Link>
                  <button
                    onClick={async () => { await logout(); setUserMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-nepal-red hover:bg-red-50 transition text-left"
                  >
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`mt-2 flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gradient-to-r from-nepal-red to-nepal-crimson text-white font-medium text-sm hover:opacity-90 transition shadow-md ${collapsed ? 'lg:justify-center' : ''}`}
              title={collapsed ? 'Login' : undefined}
            >
              <User className="w-5 h-5 shrink-0" />
              {!collapsed && <span>Login</span>}
            </Link>
          )}
        </div>
      </aside>

      {/* Spacer for main content - desktop only */}
      <div
        className={`hidden lg:block shrink-0 transition-all duration-300 ease-in-out ${collapsed ? 'lg:w-20' : 'lg:w-64'}`}
      />
    </>
  );
}
