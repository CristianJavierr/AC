import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos de usuario: admin o technician
export type UserRole = 'admin' | 'technician';

// Estados de servicio
export type ServiceStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';

// Tipos de servicio
export type ServiceType = 'installation' | 'repair' | 'maintenance' | 'inspection';

// Estados de factura
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled';

export interface UserProfile {
  id: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_at: string;
}

export interface Service {
  id: string;
  customer_id: string;
  technician_id?: string;
  service_type: ServiceType;
  title: string;
  description?: string;
  address: string;
  scheduled_date: string;
  completed_date?: string;
  status: ServiceStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  labor_cost: number;
  materials_cost: number;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  technician?: UserProfile;
}

export interface Invoice {
  id: string;
  service_id: string;
  customer_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  service?: Service;
  customer?: Customer;
}
