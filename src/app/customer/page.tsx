'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Order, Message } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function CustomerPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch user's orders
        const ordersQuery = query(
          collection(db, 'orders'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);

        // Fetch user's messages
        const messagesQuery = query(
          collection(db, 'messages'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const messagesSnapshot = await getDocs(messagesQuery);
        const messagesData = messagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(messagesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        customerId: user?.uid,
        customerName: user?.name,
        message: newMessage,
        status: 'Unreplied',
        createdAt: new Date()
      });
      
      toast.success('Message sent successfully');
      setNewMessage('');
      
      // Refresh messages
      const messagesQuery = query(
        collection(db, 'messages'), 
        where('customerId', '==', user?.uid),
        orderBy('createdAt', 'desc')
      );
      const messagesSnapshot = await getDocs(messagesQuery);
      const messagesData = messagesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messagesData);
    } catch (error) {
      toast.error('Error sending message');
    }
  };

  if (loading || statsLoading) return <LoadingSpinner />;

  const totalSpent = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto p-6">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Welcome back, {user?.name}!</h1>
          <p className="text-gray-500">Here's an overview of your account</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm">Total Orders</p>
            <p className="text-3xl font-bold text-gray-800">{orders.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm">Pending Orders</p>
            <p className="text-3xl font-bold text-gray-800">{pendingOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
            <p className="text-gray-500 text-sm">Total Spent</p>
            <p className="text-3xl font-bold text-gray-800">KES {totalSpent.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Orders Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">My Orders</h2>
              <Link 
                href="/customer/new-order" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold shadow-md"
              >
                + New Order
              </Link>
            </div>
            
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No orders yet</p>
                <Link 
                  href="/customer/new-order" 
                  className="text-blue-600 hover:underline font-semibold"
                >
                  Place your first order
                </Link>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {orders.map((order) => (
                  <div key={order.id} className="border-2 border-gray-100 rounded-lg p-4 hover:border-blue-200 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">Order #{order.orderId}</p>
                        <p className="text-sm text-gray-600">{order.item} x {order.quantity}</p>
                        <p className="text-sm font-bold text-blue-600 mt-1">KES {order.amount?.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                          order.status === 'Done' 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                        }`}>
                          {order.status}
                        </span>
                        <p className={`text-sm font-bold mt-2 ${
                          order.payment === 'Paid' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {order.payment}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Messages Section */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Messages</h2>
            
            <div className="mb-6">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                rows={3}
                placeholder="Type your message to the seller..."
              />
              <button
                onClick={handleSendMessage}
                className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-semibold shadow-md"
              >
                Send Message
              </button>
            </div>
            
            <h3 className="font-semibold text-gray-700 mb-3">Message History</h3>
            {messages.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No messages yet</p>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="text-gray-800 italic">"{msg.message}"</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        msg.status === 'Unreplied' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {msg.status}
                      </span>
                      {msg.reply && (
                        <p className="text-sm text-blue-600">Reply: {msg.reply}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}