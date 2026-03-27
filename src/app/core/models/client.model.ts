export interface Client {
  customer_id: string;
  customer_name: string;
  customer_email: string;
  completed_visits: number;
  upcoming_visits: number;
  realized_revenue: number;
  expected_revenue: number;
  last_visit_date: string;
}
