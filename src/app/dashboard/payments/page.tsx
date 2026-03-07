'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import MpesaPaymentModal from './components/mpesapaymentmodal';
import { 
  CreditCard, 
  Download, 
  Printer, 
  Search,
  Calendar,
  User,
  Hash,
  DollarSign,
  TrendingUp,
  Filter,
  X,
  Clock,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Package
} from 'lucide-react';
import toast from 'react-hot-toast';

// Define the Order interface based on your actual data structure
export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  itemId?: string; // Add this field to link to inventory
  quantity: number;
  amount: number;
  price?: number;
  payment: 'Paid' | 'Unpaid';
  status: string;
  createdAt: any;
  mpesaReceipt?: string;
  phoneNumber?: string;
}
export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // M-Pesa modal state
  const [isMpesaModalOpen, setIsMpesaModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.item?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply payment filter
    if (paymentFilter !== 'all') {
      filtered = filtered.filter(order => order.payment === paymentFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(order => {
        const orderDate = formatDateObject(order.createdAt);
        if (!orderDate) return false;

        switch(dateFilter) {
          case 'today':
            return orderDate >= today;
          case 'week':
            return orderDate >= thisWeek;
          case 'month':
            return orderDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    setFilteredOrders(filtered);
    
    // Recalculate totals
    const paidTotal = filtered
      .filter(o => o.payment === 'Paid')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    setTotalRevenue(paidTotal);
    
    const unpaidTotal = filtered
      .filter(o => o.payment === 'Unpaid')
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    setPendingRevenue(unpaidTotal);
    
  }, [searchTerm, paymentFilter, dateFilter, orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Fetch orders sorted by date
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(ordersQuery);
      console.log('Orders found:', querySnapshot.size);
      
      const ordersData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          orderId: data.orderId || 'N/A',
          customerId: data.customerId || '',
          customerName: data.customerName || 'Unknown',
          amount: data.amount || 0,
          price: data.price || 0,
          quantity: data.quantity || 1,
          item: data.item || 'Unknown Item',
          payment: data.payment || 'Unpaid',
          status: data.status || 'Pending',
          createdAt: data.createdAt || new Date(),
          mpesaReceipt: data.mpesaReceipt || '',
          phoneNumber: data.phoneNumber || ''
        } as Order;
      });
      
      setOrders(ordersData);
      setFilteredOrders(ordersData);
      
      const paidTotal = ordersData
        .filter(o => o.payment === 'Paid')
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      setTotalRevenue(paidTotal);
      
      const unpaidTotal = ordersData
        .filter(o => o.payment === 'Unpaid')
        .reduce((sum, o) => sum + (o.amount || 0), 0);
      setPendingRevenue(unpaidTotal);
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date from Firestore timestamp
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
      return new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Helper function to get Date object from timestamp
  const formatDateObject = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate();
      }
      if (timestamp instanceof Date) {
        return timestamp;
      }
      return new Date(timestamp);
    } catch (error) {
      return null;
    }
  };

  const handleInitiateMpesaPayment = (order: Order) => {
    setSelectedOrderForPayment(order);
    setIsMpesaModalOpen(true);
  };

  const handleMpesaSuccess = async (response: any) => {
    // Refresh the orders list
    await fetchOrders();
    
    toast.success(
      <div className="flex flex-col">
        <span className="font-bold">✓ STK Push Sent!</span>
        <span className="text-sm">Please check your phone to complete the payment</span>
      </div>,
      { duration: 6000 }
    );
  };

  const handleMarkAsPaid = async (order: Order) => {
    try {
      // Update order in Firestore
      const orderRef = doc(db, 'orders', order.id);
      await updateDoc(orderRef, {
        payment: 'Paid',
        status: 'Completed',
        updatedAt: new Date()
      });
      
      toast.success('Order marked as paid successfully');
      fetchOrders(); // Refresh the list
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  };

  const handlePrintReceipt = (order: Order) => {
    setSelectedOrder(order);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Order #${order.orderId}</title>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                padding: 40px; 
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
              }
              .receipt { 
                max-width: 400px; 
                margin: 0 auto; 
                background: white;
                border: 2px solid #333; 
                padding: 30px;
                box-shadow: 0 4px 8px rgba(0,0,0,0.1);
              }
              h1 { 
                text-align: center; 
                color: #000;
                font-size: 24px;
                margin-bottom: 20px;
                border-bottom: 2px solid #000;
                padding-bottom: 10px;
              }
              .details { margin: 20px 0; }
              .row { 
                display: flex; 
                justify-content: space-between; 
                margin: 10px 0;
                padding: 5px 0;
                border-bottom: 1px dashed #ccc;
              }
              .row strong { color: #333; }
              .footer { 
                margin-top: 30px; 
                text-align: center; 
                color: #000;
                font-style: italic;
                border-top: 2px solid #000;
                padding-top: 15px;
              }
              .status-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
              }
              .status-paid {
                background: #d4edda;
                color: #155724;
              }
              .status-unpaid {
                background: #fff3cd;
                color: #856404;
              }
              .item-details {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <h1>${order.payment === 'Paid' ? 'PAYMENT RECEIPT' : 'ORDER INVOICE'}</h1>
              
              <div class="item-details">
                <div class="row">
                  <strong>Item:</strong> 
                  <span>${order.item}</span>
                </div>
                <div class="row">
                  <strong>Quantity:</strong> 
                  <span>${order.quantity}</span>
                </div>
                <div class="row">
                  <strong>Unit Price:</strong> 
                  <span>KES ${order.price?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>
              
              <div class="details">
                <div class="row">
                  <strong>Order ID:</strong> 
                  <span>${order.orderId}</span>
                </div>
                <div class="row">
                  <strong>Customer:</strong> 
                  <span>${order.customerName}</span>
                </div>
                <div class="row">
                  <strong>Total Amount:</strong> 
                  <span style="font-size: 20px; font-weight: bold; color: #2e7d32;">KES ${order.amount.toLocaleString()}</span>
                </div>
                <div class="row">
                  <strong>Payment Status:</strong> 
                  <span class="status-badge ${order.payment === 'Paid' ? 'status-paid' : 'status-unpaid'}">
                    ${order.payment}
                  </span>
                </div>
                <div class="row">
                  <strong>Order Status:</strong> 
                  <span>${order.status}</span>
                </div>
                <div class="row">
                  <strong>Date:</strong> 
                  <span>${formatDate(order.createdAt)}</span>
                </div>
                ${order.mpesaReceipt ? `
                <div class="row">
                  <strong>M-PESA Receipt:</strong> 
                  <span>${order.mpesaReceipt}</span>
                </div>
                ` : ''}
              </div>
              <div class="footer">
                <p>Thank you for your business!</p>
                <p style="font-size: 12px; margin-top: 10px;">This is a computer generated receipt</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Order ID', 'Customer', 'Item', 'Quantity', 'Amount (KES)', 'Payment Status', 'Order Status', 'Date', 'M-PESA Receipt'];
      const csvData = filteredOrders.map(o => [
        o.orderId,
        o.customerName,
        o.item,
        o.quantity,
        o.amount,
        o.payment,
        o.status,
        formatDate(o.createdAt),
        o.mpesaReceipt || ''
      ]);
      
      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export successful!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export data');
    }
  };

  const getPaymentStatusColor = (payment: string) => {
    switch(payment) {
      case 'Paid':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Unpaid':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPaymentFilter('all');
    setDateFilter('all');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Get unique values for filters
  const paymentStatuses = ['all', ...new Set(orders.map(o => o.payment))];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* M-Pesa Modal */}
        <MpesaPaymentModal
          isOpen={isMpesaModalOpen}
          onClose={() => {
            setIsMpesaModalOpen(false);
            setSelectedOrderForPayment(null);
          }}
          order={selectedOrderForPayment}
          onSuccess={handleMpesaSuccess}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Payment Management</h1>
            <p className="text-black mt-1">Track and manage all order payments</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-yellow-600 text-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-sm font-medium block">Pending Revenue</span>
              <span className="text-2xl font-bold">KES {pendingRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-sm">
              <span className="text-sm font-medium block">Total Revenue</span>
              <span className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-black">{orders.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Paid Orders</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders.filter(o => o.payment === 'Paid').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Unpaid Orders</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders.filter(o => o.payment === 'Unpaid').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Avg Order Value</p>
                <p className="text-2xl font-bold text-black">
                  KES {orders.length > 0 
                    ? Math.round(orders.reduce((sum, o) => sum + o.amount, 0) / orders.length).toLocaleString() 
                    : 0}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-black mb-2">Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Order ID, Customer or Item..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                />
              </div>
            </div>

            {/* Payment Filter */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                aria-label="Payment Status Filter"
              >
                {paymentStatuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Status' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Date Range</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                aria-label="Date Range Filter"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || paymentFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-black">Active Filters:</span>
                {searchTerm && (
                  <span className="bg-blue-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-blue-200">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {paymentFilter !== 'all' && (
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 border ${
                    paymentFilter === 'Paid' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                  }`}>
                    Status: {paymentFilter}
                    <button onClick={() => setPaymentFilter('all')} className="ml-1 hover:text-opacity-75">×</button>
                  </span>
                )}
                {dateFilter !== 'all' && (
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-purple-200">
                    Date: {dateFilter}
                    <button onClick={() => setDateFilter('all')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                <button 
                  onClick={clearFilters}
                  className="text-sm text-red-600 hover:text-red-800 ml-2 font-medium flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Orders/Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Order ID
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Customer
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Item
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Amount
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Payment
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Date
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-black font-medium">No orders found</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {orders.length > 0 
                          ? 'No orders match your filters' 
                          : 'No orders available'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr 
                      key={order.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                      } ${order.payment === 'Unpaid' ? 'bg-yellow-50/30' : ''}`}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-black">#{order.orderId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-black">{order.customerName}</div>
                          <div className="text-xs text-gray-500">{order.customerId?.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-black">{order.item}</div>
                          {order.price && (
                            <div className="text-xs text-gray-500">@ KES {order.price}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-black">{order.quantity}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-black">KES {order.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(order.payment)}`}>
                          {order.payment}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          order.status === 'Completed' 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black text-sm">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          {order.payment === 'Unpaid' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleInitiateMpesaPayment(order);
                                }}
                                className="text-green-600 hover:text-green-800 font-medium flex items-center gap-1 text-sm"
                              >
                                <Smartphone className="h-4 w-4" />
                                M-PESA
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsPaid(order);
                                }}
                                className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 text-sm"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Mark Paid
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintReceipt(order);
                            }}
                            className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1 text-sm"
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with Export and Summary */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-black">
            Showing {filteredOrders.length} of {orders.length} orders
            {pendingRevenue > 0 && (
              <span className="ml-2 text-yellow-600 font-medium">
                (KES {pendingRevenue.toLocaleString()} pending)
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={clearFilters}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium flex items-center gap-2 text-black"
            >
              <Filter className="h-4 w-4" />
              Reset Filters
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 shadow-sm"
              disabled={filteredOrders.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}