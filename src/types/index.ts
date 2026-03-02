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
  quantity: number;
  status: 'Pending' | 'Done';
  payment: 'Paid' | 'Unpaid';
  amount: number;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  status: 'Ok' | 'Low';
  lowStockThreshold?: number;
}

export interface Message {
  id: string;
  customerId: string;
  customerName: string;
  message: string;
  status: 'Unreplied' | 'Replied';
  reply?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  customerName: string;
  amount: number;
  method: 'M-Pesa' | 'Cash' | 'Bank';
  date: Date;
}