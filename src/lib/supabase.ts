import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Product {
  id: string;
  name: string;
  description: string;
  stock: number;
  min_stock: number;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  created_at: string;
}

export interface Sale {
  id: string;
  customer_id?: string;
  total_amount: number;
  sale_date: string;
  notes?: string;
  created_at: string;
  customer?: Customer;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface Appointment {
  id: string;
  customer_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
  customer?: Customer;
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  role: 'admin' | 'user' | 'manager';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
