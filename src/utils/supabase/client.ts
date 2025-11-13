import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

export interface User {
  id: string;
  username: string;
  name: string;
  pin: string;
  role: 'admin' | 'bartender' | 'waitress';
}

export interface Item {
  id: string;
  name: string;
  quantity: number;
  barcode?: string;
  price: number;
  category: string;
  low_stock_threshold: number;
  created_at?: string;
}

export interface Shot {
  id: string;
  name: string;
  price: number;
  created_at?: string;
}

export interface Special {
  id: string;
  name: string;
  price: number;
  created_at?: string;
}

export interface Order {
  id: string;
  table_name: string;
  status: 'pending' | 'paid';
  payment_method?: 'cash' | 'visa' | 'mpesa' | 'ecocash';
  total: number;
  service_fee: number;
  created_at?: string;
  updated_at?: string;
  staff_id?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  staff_id: string;
  quantity: number;
  price_at_time: number;
  created_at?: string;
  item?: Item;
  staff?: User;
}

export interface Rider {
  id: string;
  item_id: string;
  quantity: number;
  recipient: string;
  given_by: string;
  created_at?: string;
  item?: Item;
  staff?: User;
}