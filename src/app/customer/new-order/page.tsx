'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  status: string;
}

export default function CustomerNewOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    item: '',
    quantity: 1,
    amount: 0,
    price: 0
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        price: doc.data().price || Math.floor(Math.random() * 5000) + 1000 // Default price if not set
      })) as InventoryItem[];
      setInventory(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleItemChange = (itemName: string) => {
    const item = inventory.find(i => i.name === itemName) || null;
    setSelectedItem(item);
    setFormData({
      ...formData,
      item: itemName,
      price: item?.price || 0,
      amount: (item?.price || 0) * formData.quantity
    });
  };

  const handleQuantityChange = (qty: number) => {
    setFormData({
      ...formData,
      quantity: qty,
      amount: (selectedItem?.price || 0) * qty
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderId = 'ORD' + Math.floor(100 + Math.random() * 900).toString();
      
      const order = {
        orderId,
        customerId: user?.uid,
        customerName: user?.name,
        item: formData.item,
        quantity: formData.quantity,
        price: formData.price,
        status: 'Pending' as const,
        payment: 'Unpaid' as const,
        amount: formData.amount,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'orders'), order);
      
      // Send notification message to seller
      await addDoc(collection(db, 'messages'), {
        customerId: user?.uid,
        customerName: user?.name,
        message: `New order placed: ${formData.item} x ${formData.quantity} - KES ${formData.amount}`,
        status: 'Unreplied',
        createdAt: new Date()
      });
      
      toast.success('Order placed successfully!');
      router.push('/customer');
    } catch (error) {
      toast.error('Error placing order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto p-6 max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Place New Order</h1>
        <p className="text-gray-500 mb-6">Fill in the details below to create your order</p>
        
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-800 font-semibold mb-2">Select Item</label>
              <select
                value={formData.item}
                onChange={(e) => handleItemChange(e.target.value)}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800 bg-white"
                required
              >
                <option value="" className="text-gray-400">Choose an item</option>
                {inventory.map(item => (
                  <option key={item.id} value={item.name} className="text-gray-800">
                    {item.name} - KES {item.price?.toLocaleString()} (Stock: {item.quantity})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-800 font-semibold mb-2">Quantity</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-800"
                min="1"
                max={selectedItem?.quantity || 99}
                required
              />
              {selectedItem && (
                <p className="text-sm text-gray-500 mt-1">Available stock: {selectedItem.quantity}</p>
              )}
            </div>
            
            <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <label className="block text-gray-800 font-semibold mb-2">Total Amount</label>
              <div className="text-3xl font-bold text-blue-600">
                KES {formData.amount.toLocaleString()}
              </div>
              {formData.price > 0 && (
                <p className="text-sm text-gray-600 mt-1">Unit price: KES {formData.price.toLocaleString()}</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || !selectedItem}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-blue-300 shadow-md text-lg"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}