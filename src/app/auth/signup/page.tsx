'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { UserRole } from '@/types';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password, name, role);
    } catch (error) {
      // Error is handled in auth context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-96 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
            Create Account
          </h1>
          <p className="text-gray-600 font-medium">Join our platform today</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-bold mb-2 text-base">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-gray-50 text-gray-900 font-medium text-base placeholder:text-gray-400"
              placeholder="John Doe"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2 text-base">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-gray-50 text-gray-900 font-medium text-base placeholder:text-gray-400"
              placeholder="your@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-2 text-base">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition bg-gray-50 text-gray-900 font-medium text-base pr-12 placeholder:text-gray-400"
                placeholder="••••••••"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-indigo-600 transition"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-6 w-6" />
                ) : (
                  <EyeIcon className="h-6 w-6" />
                )}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Minimum 6 characters
            </p>
          </div>
          
          <div>
            <label className="block text-gray-700 font-bold mb-3 text-base">
              I am a:
            </label>
            <div className="flex gap-6 bg-gray-50 p-4 rounded-xl">
              <label className="flex items-center cursor-pointer flex-1">
                <input
                  type="radio"
                  value="customer"
                  checked={role === 'customer'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mr-3 w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900 font-bold text-base">Customer</span>
              </label>
              <label className="flex items-center cursor-pointer flex-1">
                <input
                  type="radio"
                  value="seller"
                  checked={role === 'seller'}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="mr-3 w-5 h-5 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-gray-900 font-bold text-base">Seller</span>
              </label>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : 'Sign Up'}
          </button>
        </form>
        
        <p className="text-center mt-8 text-gray-600 font-medium">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}