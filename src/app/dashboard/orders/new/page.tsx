'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { InventoryItem } from '@/types';

export default function NewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [formData, setFormData] = useState({
    customerName: '',
    item: '',
    quantity: 1,
    amount: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderId = 'ORD' + Math.floor(100 + Math.random() * 900).toString();
      
      const order = {
        orderId,
        customerId: user?.uid,
        customerName: formData.customerName,
        item: formData.item,
        quantity: formData.quantity,
        status: 'Pending' as const,
        payment: 'Unpaid' as const,
        amount: formData.amount,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'orders'), order);
      
      toast.success('Order created successfully!');
      router.push('/dashboard/orders');
    } catch (error) {
      toast.error('Error creating order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Create New Order</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Customer Name</label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full p-2 border rounded"
              placeholder="e.g. John"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Item</label>
            <select
              value={formData.item}
              onChange={(e) => setFormData({...formData, item: e.target.value})}
              className="w-full p-2 border rounded"
              required
            >
              <option value="">Select an item</option>
              {inventory.map(item => (
                <option key={item.id} value={item.name}>
                  {item.name} (Stock: {item.quantity})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Quantity</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})}
              className="w-full p-2 border rounded"
              min="1"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Amount (KES)</label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseInt(e.target.value) || 0})}
              className="w-full p-2 border rounded"
              min="0"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-800 text-white py-3 rounded hover:bg-gray-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating...' : 'Create Order'}
          </button>
        </form>
      </div>
    </div>
  );
}