export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  base_price: string | number;
  is_active: boolean;
}