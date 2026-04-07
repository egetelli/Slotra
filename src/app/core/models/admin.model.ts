export interface User {
  id?: string;
  full_name: string;
  email: string;
  role: 'admin' | 'provider' | 'customer';
  created_at?: string;
}

export interface Service {
  id?: string;
  provider_id?: string;
  name: string;
  description: string;
  duration_minutes: number; // DÜZELTİLDİ
  base_price: number; // DÜZELTİLDİ
  is_active?: boolean;
}

export interface WorkingHour {
  id?: string;
  provider_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}
