export type UserRole = 'customer' | 'seller';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

export interface Order {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  item: string;
  itemId: string; // Added: Reference to inventory item
  quantity: number;
  status: 'Pending' | 'Processing' | 'Completed' | 'Cancelled'; // Updated: More status options
  payment: 'Paid' | 'Unpaid' | 'Refunded'; // Updated: Added Refunded
  amount: number;
  price: number; // Added: Unit price at time of order
  totalAmount: number; // Added: quantity * price
  createdAt: Date;
  updatedAt?: Date; // Added: Track when order was last updated
  completedAt?: Date; // Added: Track when order was completed
  paymentMethod?: 'M-Pesa' | 'Cash' | 'Bank'; // Added: Payment method used
  mpesaReceipt?: string; // Added: M-PESA receipt number if paid via M-PESA
  notes?: string; // Added: Additional order notes
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string; // Added: Item description
  quantity: number;
  price: number; // Current price
  cost?: number; // Added: Cost price for profit calculation
  status: 'Ok' | 'Low' | 'Critical' | 'Out of Stock'; // Updated: More status options
  lowStockThreshold: number; // Made required, not optional
  criticalStockThreshold?: number; // Added: Threshold for critical stock
  category?: string; // Added: Item category
  supplier?: string; // Added: Supplier information
  location?: string; // Added: Storage location
  lastRestocked?: Date; // Added: Last restock date
  createdAt: Date;
  updatedAt: Date;
  totalValue: number; // Added: quantity * price (computed)
}

export interface Message {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail?: string; // Added: Customer email for replies
  message: string;
  status: 'Unreplied' | 'Replied' | 'Archived'; // Updated: Added Archived
  reply?: string;
  repliedAt?: Date; // Added: When reply was sent
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  order?: Partial<Order>; // Added: Reference to order details
  customerId: string;
  customerName: string;
  amount: number;
  method: 'M-Pesa' | 'Cash' | 'Bank Transfer' | 'Card'; // Updated: More payment methods
  status: 'Pending' | 'Completed' | 'Failed' | 'Refunded'; // Added: Payment status
  transactionId?: string; // Added: Transaction ID from payment gateway
  mpesaReceipt?: string; // Added: M-PESA receipt number
  phoneNumber?: string; // Added: Customer phone for M-PESA
  paymentDate: Date; // Renamed from 'date' to be more specific
  createdAt: Date;
  updatedAt?: Date;
}

// New Interface: Inventory Transaction Log
export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  type: 'restock' | 'sale' | 'adjustment' | 'return' | 'damage'; // Type of transaction
  quantity: number; // Positive for restock, negative for sale/damage
  previousQuantity: number;
  newQuantity: number;
  referenceId?: string; // Order ID if from sale, PO ID if from restock
  referenceType?: 'order' | 'purchase' | 'manual';
  notes?: string;
  createdBy?: string; // User who performed the transaction
  createdAt: Date;
}

// New Interface: Order Inventory Impact
export interface OrderInventoryImpact {
  orderId: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    previousStock: number;
    newStock: number;
  }>;
  totalImpact: number; // Total number of items deducted
  timestamp: Date;
}

// New Interface: Stock Alert
export interface StockAlert {
  id: string;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  threshold: number;
  type: 'low' | 'critical' | 'out';
  status: 'active' | 'resolved' | 'ignored';
  createdAt: Date;
  resolvedAt?: Date;
}
