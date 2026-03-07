'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedOrder) return;
    
    try {
      await updateDoc(doc(db, 'orders', selectedOrder.id), {
        status: selectedOrder.status,
        payment: selectedOrder.payment,
        customerName: selectedOrder.customerName
      });
      
      toast.success('Order updated successfully');
      setShowModal(false);
      fetchOrders();
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  const handleQuickComplete = async (order: Order) => {
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'Done'
      });
      toast.success('Order marked as completed');
      fetchOrders();
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <button 
          onClick={() => window.location.href = '/dashboard/orders/new'}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
        >
          New Order
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-gray-900">{order.orderId}</td>
                <td className="px-6 py-4 text-gray-900">{order.customerName}</td>
                <td className="px-6 py-4 text-gray-900">{order.item}</td>
                <td className="px-6 py-4 text-gray-900">{order.quantity}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    order.status === 'Done' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={order.payment === 'Paid' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                    {order.payment}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleEdit(order)}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleQuickComplete(order)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Complete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4 text-gray-700">Edit Order</h3>
            
            <div className="mb-4 text-gray-700">
              <label className="block text-sm font-medium mb-2 text-gray-700">Customer Name</label>
              <input
                type="text"
                aria-label="Customer name text-gray-700"
                value={selectedOrder.customerName}
                onChange={(e) => setSelectedOrder({...selectedOrder, customerName: e.target.value})}
                className="w-full p-2 border rounded text-gray-700"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">Status</label>
              <select
                aria-label="Order status"
                value={selectedOrder.status}
                onChange={(e) => setSelectedOrder({...selectedOrder, status: e.target.value as 'Pending' | 'Done'})}
                className="w-full p-2 border rounded text-gray-700"
              >
                <option value="Pending">Pending</option>
                <option value="Done">Done</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-700">Payment</label>
              <select
                aria-label="Order payment status"
                value={selectedOrder.payment}
                onChange={(e) => setSelectedOrder({...selectedOrder, payment: e.target.value as 'Paid' | 'Unpaid'})}
                className="w-full p-2 border rounded text-gray-700"
              >
                <option value="Paid text-gray-900">Paid</option>
                <option value="Unpaid text-gray-900">Unpaid</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700"
              >
                Save
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-800 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}