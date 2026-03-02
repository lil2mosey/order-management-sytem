'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0 });

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
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter a material name');
      return;
    }

    try {
      const status = newItem.quantity < 20 ? 'Low' : 'Ok';
      
      await addDoc(collection(db, 'inventory'), {
        name: newItem.name,
        quantity: newItem.quantity,
        status,
        lowStockThreshold: 20
      });
      
      toast.success('Item added successfully');
      setShowModal(false);
      setNewItem({ name: '', quantity: 0 });
      fetchInventory();
    } catch (error) {
      toast.error('Error adding item');
    }
  };

  const handleUpdateStock = async (item: InventoryItem, newQuantity: number) => {
    try {
      const status = newQuantity < 20 ? 'Low' : 'Ok';
      
      await updateDoc(doc(db, 'inventory', item.id), {
        quantity: newQuantity,
        status
      });
      
      toast.success('Stock updated');
      fetchInventory();
    } catch (error) {
      toast.error('Error updating stock');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          Add Material
        </button>
      </div>
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Material</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">{item.name}</td>
                <td className="px-6 py-4">{item.quantity}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    item.status === 'Ok' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => {
                      const newQty = prompt('Enter new quantity:', item.quantity.toString());
                      if (newQty) handleUpdateStock(item, parseInt(newQty));
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Material Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Add New Material</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Material Name</label>
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="e.g. Gold Clasps"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Initial Quantity</label>
              <input
                type="number"
                value={newItem.quantity}
                onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded"
                min="0"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleAddItem}
                className="flex-1 bg-gray-800 text-white py-2 rounded hover:bg-gray-700"
              >
                Add
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300"
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