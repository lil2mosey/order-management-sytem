'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import LoadingSpinner from '@/components/common/LoadingSpinner';
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
  X
} from 'lucide-react';

// Define the Payment interface based on your actual data structure
interface Payment {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: 'M-Pesa' | 'Cash' | 'Bank' | string;
  date: any; // Firestore timestamp
  status?: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    fetchPayments();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...payments];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.method === methodFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thisWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      filtered = filtered.filter(payment => {
        const paymentDate = formatDateObject(payment.date);
        if (!paymentDate) return false;

        switch(dateFilter) {
          case 'today':
            return paymentDate >= today;
          case 'week':
            return paymentDate >= thisWeek;
          case 'month':
            return paymentDate >= thisMonth;
          default:
            return true;
        }
      });
    }

    setFilteredPayments(filtered);
    
    // Recalculate total for filtered payments
    const filteredTotal = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);
    setTotalRevenue(filteredTotal);
  }, [searchTerm, methodFilter, dateFilter, payments]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Create query with ordering
      const paymentsQuery = query(
        collection(db, 'payments'),
        orderBy('date', 'desc')
      );
      
      const querySnapshot = await getDocs(paymentsQuery);
      console.log('Payments found:', querySnapshot.size);
      
      const paymentsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Payment data:', data);
        
        return {
          id: doc.id,
          orderId: data.orderId || 'N/A',
          customerName: data.customerName || 'Unknown',
          amount: data.amount || 0,
          method: data.method || 'Cash',
          date: data.date || new Date(),
          status: data.status || 'Completed'
        } as Payment;
      });
      
      setPayments(paymentsData);
      setFilteredPayments(paymentsData);
      
      const total = paymentsData.reduce((sum, p) => sum + (p.amount || 0), 0);
      setTotalRevenue(total);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format date from Firestore timestamp
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    
    try {
      // Handle Firestore timestamp
      if (timestamp?.toDate) {
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

  const handlePrintReceipt = (payment: Payment) => {
    setSelectedPayment(payment);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt - Order #${payment.orderId}</title>
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
                margin: 15px 0;
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
              .method-badge {
                background: #e0e0e0;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <div class="receipt">
              <h1>PAYMENT RECEIPT</h1>
              <div class="details">
                <div class="row">
                  <strong>Order ID:</strong> 
                  <span>${payment.orderId}</span>
                </div>
                <div class="row">
                  <strong>Customer:</strong> 
                  <span>${payment.customerName}</span>
                </div>
                <div class="row">
                  <strong>Amount:</strong> 
                  <span style="font-size: 20px; font-weight: bold; color: #2e7d32;">KES ${payment.amount.toLocaleString()}</span>
                </div>
                <div class="row">
                  <strong>Method:</strong> 
                  <span class="method-badge">${payment.method}</span>
                </div>
                <div class="row">
                  <strong>Date:</strong> 
                  <span>${formatDate(payment.date)}</span>
                </div>
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
      
      // Small delay to ensure content is loaded
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Order ID', 'Customer', 'Amount (KES)', 'Method', 'Date', 'Status'];
      const csvData = filteredPayments.map(p => [
        p.orderId,
        p.customerName,
        p.amount,
        p.method,
        formatDate(p.date),
        p.status || 'Completed'
      ]);
      
      const csv = [headers, ...csvData].map(row => row.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const getMethodColor = (method: string) => {
    switch(method.toLowerCase()) {
      case 'm-pesa':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cash':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bank':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setMethodFilter('all');
    setDateFilter('all');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Get unique payment methods for filter
  const paymentMethods = ['all', ...new Set(payments.map(p => p.method))];

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Payment Management</h1>
            <p className="text-black mt-1">Track and manage all payment transactions</p>
          </div>
          <div className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-sm">
            <span className="text-sm font-medium block">Total Revenue</span>
            <span className="text-2xl font-bold">KES {totalRevenue.toLocaleString()}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-black mb-2">Search Payments</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-black" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Order ID or Customer..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                />
              </div>
            </div>

            {/* Method Filter */}
            <div>
              <label className="block text-sm font-medium text-black mb-2">Payment Method</label>
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
              >
                {paymentMethods.map(method => (
                  <option key={method} value={method}>
                    {method === 'all' ? 'All Methods' : method}
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
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || methodFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-black">Active Filters:</span>
                {searchTerm && (
                  <span className="bg-blue-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-blue-200">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')} className="ml-1 hover:text-blue-900">×</button>
                  </span>
                )}
                {methodFilter !== 'all' && (
                  <span className="bg-purple-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-purple-200">
                    Method: {methodFilter}
                    <button onClick={() => setMethodFilter('all')} className="ml-1 hover:text-purple-900">×</button>
                  </span>
                )}
                {dateFilter !== 'all' && (
                  <span className="bg-green-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1 border border-green-200">
                    Date: {dateFilter}
                    <button onClick={() => setDateFilter('all')} className="ml-1 hover:text-green-900">×</button>
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-xs text-black mb-1">Total Transactions</p>
            <p className="text-2xl font-bold text-black">{filteredPayments.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-xs text-black mb-1">Average Payment</p>
            <p className="text-2xl font-bold text-black">
              KES {filteredPayments.length > 0 
                ? Math.round(totalRevenue / filteredPayments.length).toLocaleString() 
                : 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-xs text-black mb-1">Highest Payment</p>
            <p className="text-2xl font-bold text-black">
              KES {filteredPayments.length > 0 
                ? Math.max(...filteredPayments.map(p => p.amount)).toLocaleString() 
                : 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-xs text-black mb-1">This Month</p>
            <p className="text-2xl font-bold text-black">
              KES {filteredPayments
                .filter(p => {
                  const date = formatDateObject(p.date);
                  if (!date) return false;
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && 
                         date.getFullYear() === now.getFullYear();
                })
                .reduce((sum, p) => sum + p.amount, 0)
                .toLocaleString()}
            </p>
          </div>
        </div>
        
        {/* Payments Table */}
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
                      <DollarSign className="h-4 w-4" />
                      Amount
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Method
                    </div>
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
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <CreditCard className="h-12 w-12 text-black mx-auto mb-3" />
                      <p className="text-black font-medium">No payments found</p>
                      <p className="text-sm text-black mt-1">
                        {payments.length > 0 
                          ? 'No payments match your filters' 
                          : 'No payment records available'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr 
                      key={payment.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedPayment?.id === payment.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedPayment(payment)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-black">#{payment.orderId}</span>
                      </td>
                      <td className="px-6 py-4 text-black">{payment.customerName}</td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-black">KES {payment.amount.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getMethodColor(payment.method)}`}>
                          {payment.method}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-black">{formatDate(payment.date)}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrintReceipt(payment);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <Printer className="h-4 w-4" />
                          Print
                        </button>
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
            Showing {filteredPayments.length} of {payments.length} payments
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
              disabled={filteredPayments.length === 0}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Payment Methods Summary */}
        {filteredPayments.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {paymentMethods.filter(m => m !== 'all').map(method => {
              const methodPayments = filteredPayments.filter(p => p.method === method);
              const methodTotal = methodPayments.reduce((sum, p) => sum + p.amount, 0);
              const methodCount = methodPayments.length;
              
              if (methodCount === 0) return null;
              
              return (
                <div key={method} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-black">{method}</p>
                      <p className="text-xs text-black mt-1">{methodCount} transactions</p>
                    </div>
                    <span className="text-lg font-bold text-black">
                      KES {methodTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full"
                      style={{ 
                        width: `${totalRevenue > 0 ? (methodTotal / totalRevenue) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}