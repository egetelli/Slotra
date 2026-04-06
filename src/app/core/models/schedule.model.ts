// ----------------------------------------------------
// 1. TEMEL ENTITY'LER (Hizmet ve Çalışan Yönetimi)
// ----------------------------------------------------

export interface Service {
  id: string | number;
  name: string; // 'Genel Muayene' vb.
  description: string;
  duration: number; // Dakika cinsinden (örn: 30, 60)
  price: number; // Fiyat (örn: 300)
}

export interface Provider {
  id: string | number;
  user_id: string | number; // User tablosundaki karşılığı
  bio: string; // '15 yıllık deneyime sahip...'
  experience_years: number;

  // Frontend'de kolaylık sağlaması için JOIN ile backend'den dönebilecek ekstra alanlar:
  full_name?: string; // User tablosundan gelir
  services?: Service[]; // Provider_Services tablosundan ilişkili hizmetler gelir
}

// ----------------------------------------------------
// 2. TAKVİM VE PLANLAMA (Müsaitlik ve Mesai)
// ----------------------------------------------------

export interface WorkingHour {
  id: string | number;
  provider_id: string | number;
  day_of_week: number; // 1 (Pazartesi) - 7 (Pazar)
  start_time: string; // '09:00:00'
  end_time: string; // '17:00:00'
}

export interface Availability {
  id: string | number;
  provider_id: string | number;
  date: string; // 'YYYY-MM-DD' formatında spesifik tarih (Seed dosyasındaki değişikliğe göre uyarlandı)
  is_available: boolean; // true / false
}

// ----------------------------------------------------
// 3. RANDEVU SİSTEMİ (Operasyon)
// ----------------------------------------------------

export interface Appointment {
  id: string;
  user_id: string | number;
  provider_id: string | number;

  // 🌟 GÜNCELLEME: Mola kayıtlarında servis olmadığı için artık isteğe bağlı (optional/null)
  service_id?: string | number | null;

  slot_time: string;
  end_time: string;

  // 🌟 GÜNCELLEME: 'completed' kaldırıldı
  status: 'booked' | 'pending' | 'cancelled' | 'completed';

  total_price: number;

  // ==========================================
  // 🌟 YENİ: MOLA (BLOCK) SİSTEMİ ALANLARI
  // ==========================================
  type?: 'appointment' | 'block' | string; // Randevu mu yoksa kapatılan zaman mı?
  guest_name?: string | null; // Örn: "[BLOKE] Özel İş" veya misafir müşteri adı

  // ==========================================
  // UI-Friendly Alanlar (Backend JOIN ile gelenler)
  // ==========================================
  customer_name?: string;
  provider_name?: string;
  service_name?: string;
  duration_minutes?: number;
}
