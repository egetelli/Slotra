export interface AdminStats {
  total_users: number;
  total_providers: number;
  total_clients: number;
  weekly_appointments: number;
  total_revenue: number;
  growth: number;
  system_health: string;
}

export interface AdminDashboardData {
  stats: AdminStats;
  // Chart verileri backend'den gelecek formata göre şekillendirilebilir.
  // Şimdilik any veya özel interface bırakabiliriz.
  trafficChart: any;
  roleChart: any;
}
