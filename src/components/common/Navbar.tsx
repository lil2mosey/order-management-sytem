'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (!user || pathname === '/auth/login' || pathname === '/auth/signup') return null;

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <nav className="bg-gray-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link href={user.role === 'seller' ? '/dashboard' : '/customer'} className="text-xl font-bold">
          OMS Dashboard
        </Link>
        
        <div className="flex items-center gap-6">
          {user.role === 'seller' ? (
            <>
              <Link href="/dashboard" className="hover:text-gray-300">Dashboard</Link>
              <Link href="/dashboard/orders" className="hover:text-gray-300">Orders</Link>
              <Link href="/dashboard/inventory" className="hover:text-gray-300">Inventory</Link>
              <Link href="/dashboard/messages" className="hover:text-gray-300">Messages</Link>
              <Link href="/dashboard/payments" className="hover:text-gray-300">Payments</Link>
            </>
          ) : (
            <>
              <Link href="/customer" className="hover:text-gray-300">Dashboard</Link>
              <Link href="/customer/orders" className="hover:text-gray-300">My Orders</Link>
            </>
          )}
          
          <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-600">
            <span className="text-sm">{user.name} ({user.role})</span>
            <button 
              onClick={handleLogout}
              className="bg-red-600 px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}