'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { UserRole } from '@/types';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, name, role);
      // Redirect handled by AuthContext
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-96 border border-gray-200">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">Create Account</h1>
        <p className="text-center text-gray-500 mb-6">Join our platform today</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="John Doe"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition"
              placeholder="••••••••"
              required
              minLength={6}
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 6 characters</p>
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">I am a:</label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="customer"
                  checked={role === 'customer'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mr-2 w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Customer</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  value="seller"
                  checked={role === 'seller'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mr-2 w-4 h-4 text-blue-600"
                />
                <span className="text-gray-700">Seller</span>
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 shadow-md"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}