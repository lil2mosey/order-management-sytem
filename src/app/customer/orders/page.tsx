'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import { ShoppingBag, Clock, CheckCircle, XCircle, Search, Calendar } from 'lucide-react';

// Define the Order interface based on your actual data structure
interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  quantity: number;
  status: 'Pending' | 'Done';
  payment: 'Paid' | 'Unpaid';
  amount: number;
  price: number;
  createdAt: any; // Firestore timestamp
}

export default function CustomerOrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    if (user?.role === 'seller') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        console.log('Fetching orders for user:', user.uid);
        
        // Query orders where customerId matches the logged-in user
        const ordersQuery = query(
          collection(db, 'orders'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        console.log('Orders found:', ordersSnapshot.size);
        
        const ordersData = ordersSnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Order data:', data); // Debug log
          
          return {
            id: doc.id,
            orderId: data.orderId || '',
            customerId: data.customerId || '',
            customerName: data.customerName || '',
            item: data.item || '',
            quantity: data.quantity || 0,
            status: data.status || 'Pending',
            payment: data.payment || 'Unpaid',
            amount: data.amount || 0,
            price: data.price || 0,
            createdAt: data.createdAt // Keep as is, we'll format when displaying
          } as Order;
        });
        
        setOrders(ordersData);
        setFilteredOrders(ordersData);
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoadingOrders(false);
      }
    };

    if (user) {
      fetchOrders();
    }
  }, [user]);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment === paymentFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, paymentFilter, orders]);

  // Helper function to format date from Firestore timestamp
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Date not available';
    
    try {
      // Handle Firestore timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Handle regular Date object
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // Handle string or number
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date not available';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Done':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentColor = (payment: string) => {
    return payment === 'Paid' ? 'text-green-600' : 'text-red-600';
  };

  const getPaymentIcon = (payment: string) => {
    return payment === 'Paid' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
  };

  const getStatusIcon = (status: string) => {
    return status === 'Done' ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />;
  };

  if (loading || loadingOrders) {
    return <LoadingSpinner />;
  }

  // Calculate stats
  const totalSpent = filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const pendingCount = filteredOrders.filter(o => o.status === 'Pending').length;
  const completedCount = filteredOrders.filter(o => o.status === 'Done').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Orders</h1>
              <p className="text-gray-600 text-lg">View and track all your orders</p>
            </div>
            <Link 
              href="/customer/new-order" 
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2 shadow-md w-full sm:w-auto justify-center"
            >
              <ShoppingBag className="h-5 w-5" />
              New Order
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Orders</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{filteredOrders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Pending</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{pendingCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Completed</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{completedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
            <p className="text-gray-500 text-sm">Total Spent</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">KES {totalSpent.toLocaleString()}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Order ID or Item..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Done">Completed</option>
              </select>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
              >
                <option value="all">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || statusFilter !== 'all' || paymentFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">Active Filters:</span>
                {searchTerm && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')} className="ml-1 hover:text-yellow-900">×</button>
                  </span>
                )}
                {paymentFilter !== 'all' && (
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Payment: {paymentFilter}
                    <button onClick={() => setPaymentFilter('all')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPaymentFilter('all');
                  }}
                  className="text-sm text-red-600 hover:text-red-800 ml-2 font-medium"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Your Orders ({filteredOrders.length})
            </h2>
          </div>
          
          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-gray-50 rounded-lg">
                <ShoppingBag className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg mb-2">No orders found</p>
                <p className="text-gray-400 mb-6">
                  {orders.length > 0 
                    ? 'No orders match your filters. Try adjusting your search criteria.'
                    : "You haven't placed any orders yet."}
                </p>
                {orders.length === 0 && (
                  <Link 
                    href="/customer/new-order" 
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    Place Your First Order
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order) => (
                  <div key={order.id} className="border-2 border-gray-100 rounded-lg p-6 hover:border-blue-200 transition bg-white shadow-sm">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                      {/* Left side - Order Info */}
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                          <h3 className="text-lg font-bold text-gray-900">Order #{order.orderId}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 border w-fit ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Item</p>
                            <p className="font-medium text-gray-900">{order.item}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Quantity</p>
                            <p className="font-medium text-gray-900">{order.quantity}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Unit Price</p>
                            <p className="font-medium text-gray-900">KES {order.price?.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Total</p>
                            <p className="font-bold text-blue-600">KES {order.amount?.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(order.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Right side - Payment Status */}
                      <div className="lg:text-right border-t lg:border-t-0 pt-4 lg:pt-0 w-full lg:w-auto">
                        <p className="text-sm text-gray-500 mb-2">Payment Status</p>
                        <p className={`font-bold flex items-center lg:justify-end gap-1 text-lg ${getPaymentColor(order.payment)}`}>
                          {getPaymentIcon(order.payment)}
                          {order.payment}
                        </p>
                        {order.payment === 'Unpaid' && (
                          <button className="mt-3 w-full lg:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary Footer */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md p-4 border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-sm">
              <span className="text-gray-600">Showing {filteredOrders.length} of {orders.length} orders</span>
              <span className="font-bold text-gray-900">
                Total: KES {filteredOrders.reduce((sum, o) => sum + (o.amount || 0), 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}