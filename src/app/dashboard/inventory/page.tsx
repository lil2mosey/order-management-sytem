'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { InventoryItem, InventoryTransaction, StockAlert } from '@/types';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { 
  Package, 
  AlertTriangle, 
  Plus, 
  Edit, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  History,
  AlertCircle,
  DollarSign,
  Archive,
  Trash2,
  Search,
  Filter,
  X
} from 'lucide-react';

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [updateQuantity, setUpdateQuantity] = useState(0);
  const [updateType, setUpdateType] = useState<'restock' | 'adjustment' | 'return'>('restock');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 0,
    price: 0,
    cost: 0,
    lowStockThreshold: 20,
    criticalStockThreshold: 10,
    category: '',
    supplier: '',
    location: ''
  });

  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    criticalStockItems: 0,
    outOfStockItems: 0,
    totalValue: 0,
    totalCost: 0,
    potentialProfit: 0
  });

  // Categories for filter
  const categories = ['all', ...new Set(inventory.map(item => item.category).filter(Boolean))];

  useEffect(() => {
    fetchInventory();
    fetchTransactions();
    fetchAlerts();

    // Set up real-time listeners
    const unsubscribeInventory = onSnapshot(collection(db, 'inventory'), (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
      calculateStats(items);
      applyFilters(items);
    });

    const unsubscribeTransactions = onSnapshot(collection(db, 'inventoryTransactions'), (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryTransaction[];
      setTransactions(transactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    });

    const unsubscribeAlerts = onSnapshot(collection(db, 'stockAlerts'), (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockAlert[];
      setAlerts(alerts.filter(a => a.status === 'active'));
    });

    return () => {
      unsubscribeInventory();
      unsubscribeTransactions();
      unsubscribeAlerts();
    };
  }, []);

  // Apply filters when search or filters change
  useEffect(() => {
    applyFilters(inventory);
  }, [searchTerm, categoryFilter, statusFilter, inventory]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'inventory'));
      const items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryItem[];
      setInventory(items);
      calculateStats(items);
      applyFilters(items);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventoryTransactions'));
      const transactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as InventoryTransaction[];
      setTransactions(transactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'stockAlerts'));
      const alerts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockAlert[];
      setAlerts(alerts.filter(a => a.status === 'active'));
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const applyFilters = (items: InventoryItem[]) => {
    let filtered = [...items];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      switch(statusFilter) {
        case 'low':
          filtered = filtered.filter(item => 
            item.quantity > 0 && item.quantity < (item.lowStockThreshold || 20)
          );
          break;
        case 'critical':
          filtered = filtered.filter(item => 
            item.quantity > 0 && item.quantity < (item.criticalStockThreshold || 10)
          );
          break;
        case 'out':
          filtered = filtered.filter(item => item.quantity === 0);
          break;
        case 'ok':
          filtered = filtered.filter(item => 
            item.quantity >= (item.lowStockThreshold || 20)
          );
          break;
      }
    }

    setFilteredInventory(filtered);
  };

  const calculateStats = (items: InventoryItem[]) => {
    const totalItems = items.length;
    const lowStockItems = items.filter(item => 
      item.quantity > 0 && item.quantity < (item.lowStockThreshold || 20)
    ).length;
    const criticalStockItems = items.filter(item => 
      item.quantity > 0 && item.quantity < (item.criticalStockThreshold || 10)
    ).length;
    const outOfStockItems = items.filter(item => item.quantity === 0).length;
    const totalValue = items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
    const totalCost = items.reduce((sum, item) => sum + (item.cost || 0) * item.quantity, 0);

    setStats({
      totalItems,
      lowStockItems,
      criticalStockItems,
      outOfStockItems,
      totalValue,
      totalCost,
      potentialProfit: totalValue - totalCost
    });
  };

  const handleAddItem = async () => {
    if (!newItem.name) {
      toast.error('Please enter a material name');
      return;
    }

    try {
      // Determine initial status
      let status: 'Ok' | 'Low' | 'Critical' | 'Out of Stock' = 'Ok';
      if (newItem.quantity === 0) {
        status = 'Out of Stock';
      } else if (newItem.quantity < (newItem.criticalStockThreshold || 10)) {
        status = 'Critical';
      } else if (newItem.quantity < (newItem.lowStockThreshold || 20)) {
        status = 'Low';
      }

      const itemData = {
        ...newItem,
        status,
        totalValue: newItem.price * newItem.quantity,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'inventory'), itemData);

      // Create initial transaction
      const transaction: Omit<InventoryTransaction, 'id'> = {
        itemId: docRef.id,
        itemName: newItem.name,
        type: 'restock',
        quantity: newItem.quantity,
        previousQuantity: 0,
        newQuantity: newItem.quantity,
        referenceType: 'manual',
        notes: 'Initial stock addition',
        createdBy: 'system',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'inventoryTransactions'), transaction);

      toast.success('Item added successfully');
      setShowModal(false);
      setNewItem({
        name: '',
        description: '',
        quantity: 0,
        price: 0,
        cost: 0,
        lowStockThreshold: 20,
        criticalStockThreshold: 10,
        category: '',
        supplier: '',
        location: ''
      });
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Error adding item');
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem) return;

    try {
      const previousQuantity = selectedItem.quantity;
      let newQuantity = updateQuantity;
      let transactionType: 'restock' | 'adjustment' | 'return' = updateType;

      if (updateType === 'restock' && updateQuantity <= previousQuantity) {
        transactionType = 'adjustment';
      }

      // Determine new status
      let status: 'Ok' | 'Low' | 'Critical' | 'Out of Stock' = 'Ok';
      if (newQuantity === 0) {
        status = 'Out of Stock';
      } else if (newQuantity < (selectedItem.criticalStockThreshold || 10)) {
        status = 'Critical';
      } else if (newQuantity < (selectedItem.lowStockThreshold || 20)) {
        status = 'Low';
      }

      // Update inventory
      await updateDoc(doc(db, 'inventory', selectedItem.id), {
        quantity: newQuantity,
        status,
        totalValue: newQuantity * (selectedItem.price || 0),
        updatedAt: new Date()
      });

      // Create transaction record
      const transaction: Omit<InventoryTransaction, 'id'> = {
        itemId: selectedItem.id,
        itemName: selectedItem.name,
        type: transactionType,
        quantity: newQuantity - previousQuantity,
        previousQuantity,
        newQuantity,
        referenceType: 'manual',
        notes: `Manual ${transactionType}`,
        createdBy: 'system',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'inventoryTransactions'), transaction);

      // Check and create alerts if needed
      await checkAndCreateAlerts(selectedItem.id, selectedItem.name, newQuantity);

      toast.success(`Stock ${updateType === 'restock' ? 'increased' : 'updated'} successfully`);
      setShowUpdateModal(false);
      setSelectedItem(null);
      setUpdateQuantity(0);
    } catch (error) {
      console.error('Error updating stock:', error);
      toast.error('Error updating stock');
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;

    try {
      await deleteDoc(doc(db, 'inventory', selectedItem.id));
      
      toast.success('Item deleted successfully');
      setShowDeleteModal(false);
      setSelectedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Error deleting item');
    }
  };

  const checkAndCreateAlerts = async (itemId: string, itemName: string, quantity: number) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    // Check for critical stock
    if (quantity > 0 && quantity < (item.criticalStockThreshold || 10)) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: quantity,
        threshold: item.criticalStockThreshold || 10,
        type: 'critical',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
    // Check for low stock
    else if (quantity > 0 && quantity < (item.lowStockThreshold || 20)) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: quantity,
        threshold: item.lowStockThreshold || 20,
        type: 'low',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
    // Check for out of stock
    else if (quantity === 0) {
      const alert: Omit<StockAlert, 'id'> = {
        itemId,
        itemName,
        currentQuantity: 0,
        threshold: 0,
        type: 'out',
        status: 'active',
        createdAt: new Date()
      };
      await addDoc(collection(db, 'stockAlerts'), alert);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      await updateDoc(doc(db, 'stockAlerts', alertId), {
        status: 'resolved',
        resolvedAt: new Date()
      });
      toast.success('Alert resolved');
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleBulkRestock = async () => {
    const lowStockItems = inventory.filter(item => 
      item.quantity < (item.lowStockThreshold || 20)
    );
    
    if (lowStockItems.length === 0) {
      toast.success('All items have sufficient stock');
      return;
    }

    try {
      for (const item of lowStockItems) {
        const targetQuantity = (item.lowStockThreshold || 20) * 2;
        const restockAmount = targetQuantity - item.quantity;
        const newQuantity = item.quantity + restockAmount;
        
        // Update inventory
        await updateDoc(doc(db, 'inventory', item.id), {
          quantity: newQuantity,
          status: 'Ok',
          updatedAt: new Date()
        });

        // Create transaction
        const transaction: Omit<InventoryTransaction, 'id'> = {
          itemId: item.id,
          itemName: item.name,
          type: 'restock',
          quantity: restockAmount,
          previousQuantity: item.quantity,
          newQuantity,
          referenceType: 'manual',
          notes: 'Bulk restock of low items',
          createdBy: 'system',
          createdAt: new Date()
        };

        await addDoc(collection(db, 'inventoryTransactions'), transaction);
      }
      
      toast.success(`Restocked ${lowStockItems.length} items`);
    } catch (error) {
      console.error('Error bulk restocking:', error);
      toast.error('Error during bulk restock');
    }
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.quantity === 0) return 'bg-red-100 text-red-800 border-red-200';
    if (item.quantity < (item.criticalStockThreshold || 10)) return 'bg-red-100 text-red-800 border-red-200';
    if (item.quantity < (item.lowStockThreshold || 20)) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStockStatusText = (item: InventoryItem) => {
    if (item.quantity === 0) return 'Out of Stock';
    if (item.quantity < (item.criticalStockThreshold || 10)) return 'Critical';
    if (item.quantity < (item.lowStockThreshold || 20)) return 'Low Stock';
    return 'In Stock';
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black">Inventory Management</h1>
            <p className="text-black mt-1">Track and manage your raw materials and products</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTransactionModal(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Transactions
            </button>
            <button
              onClick={handleBulkRestock}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Restock Low Items
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Material
            </button>
          </div>
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-lg p-4 border ${
                  alert.type === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : alert.type === 'low'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`h-5 w-5 ${
                      alert.type === 'critical' 
                        ? 'text-red-600' 
                        : alert.type === 'low'
                        ? 'text-yellow-600'
                        : 'text-orange-600'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {alert.type === 'critical' ? '⚠️ Critical Stock Alert' : 
                         alert.type === 'low' ? '⚠️ Low Stock Alert' : '⛔ Out of Stock Alert'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {alert.itemName} - Current: {alert.currentQuantity} units 
                        {alert.type !== 'out' && ` (Threshold: ${alert.threshold} units)`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 border"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Items</p>
                <p className="text-2xl font-bold text-black">{stats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Low Stock</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.lowStockItems}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Critical Stock</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalStockItems}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-600">{stats.outOfStockItems}</p>
              </div>
              <Archive className="h-8 w-8 text-gray-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Inventory Value</p>
                <p className="text-2xl font-bold text-green-600">KES {stats.totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Potential Profit</p>
                <p className="text-2xl font-bold text-blue-600">KES {stats.potentialProfit.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, category, supplier..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
              >
                <option value="all">All Categories</option>
                {categories.filter(c => c !== 'all').map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-black"
              >
                <option value="all">All Status</option>
                <option value="ok">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="critical">Critical</option>
                <option value="out">Out of Stock</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || categoryFilter !== 'all' || statusFilter !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-black">Active Filters:</span>
                {searchTerm && (
                  <span className="bg-blue-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Search: "{searchTerm}"
                    <button onClick={() => setSearchTerm('')}>×</button>
                  </span>
                )}
                {categoryFilter !== 'all' && (
                  <span className="bg-purple-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Category: {categoryFilter}
                    <button onClick={() => setCategoryFilter('all')}>×</button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="bg-green-100 text-black px-3 py-1 rounded-full text-sm flex items-center gap-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter('all')}>×</button>
                  </span>
                )}
                <button onClick={clearFilters} className="text-sm text-red-600 hover:text-red-800 ml-2">
                  Clear All
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Inventory Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Material</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Category</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Price</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Cost</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Quantity</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Value</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Profit</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-black font-medium">No inventory items found</p>
                      <p className="text-sm text-gray-500 mt-1">Click "Add Material" to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-black">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-gray-500">{item.description}</div>
                          )}
                          {item.supplier && (
                            <div className="text-xs text-gray-500">Supplier: {item.supplier}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.category && (
                          <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                            {item.category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-black">KES {item.price?.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600">KES {item.cost?.toLocaleString() || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black">{item.quantity}</span>
                          <span className="text-xs text-gray-500">units</span>
                          {item.location && (
                            <span className="text-xs text-gray-400">({item.location})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStockStatusColor(item)}`}>
                          {getStockStatusText(item)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-green-600">
                          KES {(item.price * item.quantity).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-blue-600">
                          KES {((item.price - (item.cost || 0)) * item.quantity).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setUpdateQuantity(item.quantity);
                              setUpdateType('restock');
                              setShowUpdateModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-900 font-medium flex items-center gap-1 text-sm"
                            title="Restock"
                          >
                            <TrendingUp className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setUpdateQuantity(item.quantity);
                              setUpdateType('adjustment');
                              setShowUpdateModal(true);
                            }}
                            className="text-orange-600 hover:text-orange-900 font-medium flex items-center gap-1 text-sm"
                            title="Adjust"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(item);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900 font-medium flex items-center gap-1 text-sm"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
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

        {/* Add Material Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Add New Material</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Material Name *</label>
                    <input
                      type="text"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. Gold Clasps"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Category</label>
                    <input
                      type="text"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. Findings"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Description</label>
                  <textarea
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                    placeholder="Brief description of the material"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Price (KES) *</label>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. 500"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Cost (KES)</label>
                    <input
                      type="number"
                      value={newItem.cost}
                      onChange={(e) => setNewItem({...newItem, cost: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. 300"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Initial Quantity *</label>
                    <input
                      type="number"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. 100"
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Location</label>
                    <input
                      type="text"
                      value={newItem.location}
                      onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      placeholder="e.g. Shelf A-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={newItem.lowStockThreshold}
                      onChange={(e) => setNewItem({...newItem, lowStockThreshold: parseInt(e.target.value) || 20})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">Critical Threshold</label>
                    <input
                      type="number"
                      value={newItem.criticalStockThreshold}
                      onChange={(e) => setNewItem({...newItem, criticalStockThreshold: parseInt(e.target.value) || 10})}
                      className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                      min="1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">Supplier</label>
                  <input
                    type="text"
                    value={newItem.supplier}
                    onChange={(e) => setNewItem({...newItem, supplier: e.target.value})}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                    placeholder="e.g. Supplier Name"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddItem}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-medium"
                >
                  Add Item
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Stock Modal */}
        {showUpdateModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                {updateType === 'restock' ? 'Restock Item' : 'Adjust Quantity'}
              </h3>
              
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  Material: <span className="font-bold">{selectedItem.name}</span>
                </p>
                <p className="text-gray-700 mb-4">
                  Current Quantity: <span className="font-bold">{selectedItem.quantity}</span>
                </p>
                
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  {updateType === 'restock' ? 'New Quantity (after restock)' : 'New Quantity'}
                </label>
                <input
                  type="number"
                  value={updateQuantity}
                  onChange={(e) => setUpdateQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none text-gray-900"
                  placeholder="Enter new quantity"
                  min="0"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleUpdateStock}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {updateType === 'restock' ? 'Restock' : 'Update'}
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96 max-w-md">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Delete Item</h3>
              
              <p className="text-gray-700 mb-4">
                Are you sure you want to delete <span className="font-bold">{selectedItem.name}</span>?
                This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteItem}
                  className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions Modal */}
        {showTransactionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No transactions found</p>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              transaction.type === 'sale' ? 'bg-red-100 text-red-800' :
                              transaction.type === 'restock' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'return' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transaction.type}
                            </span>
                            <span className="font-medium text-black">{transaction.itemName}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Changed from {transaction.previousQuantity} to {transaction.newQuantity} 
                            ({transaction.quantity > 0 ? '+' : ''}{transaction.quantity} units)
                          </p>
                          {transaction.notes && (
                            <p className="text-sm text-gray-500 mt-1">Note: {transaction.notes}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleString()}
                          </p>
                          {transaction.referenceId && (
                            <p className="text-xs text-gray-400 mt-1">
                              Ref: {transaction.referenceId}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}