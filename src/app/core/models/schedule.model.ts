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
  user_id: string | number; // Randevuyu alan müşteri
  provider_id: string | number; // Randevunun alındığı uzman
  service_id: string | number; // Alınan hizmet

  slot_time: string; // Randevu tarihi ve saati (Timestamp/ISO string)
  end_time: string; // Randevu bitiş zamanı (Backend'de hesaplanıp gönderilebilir)
  status: 'booked' | 'pending' | 'cancelled' | 'completed'; // Seed dosyasında 'booked' kullanılmış
  total_price: number; // 300 vb.

  // NOT: UI'da listeleme yaparken backend'in JOIN yapıp göndermesini beklediğimiz UI-Friendly alanlar:
  customer_name?: string; // User tablosundan (Müşteri adı)
  provider_name?: string; // User tablosundan (Uzman adı)
  service_name?: string; // Service tablosundan (Hizmet adı)
  duration_minutes?: number; // Service tablosundan (Hizmet süresi)
}
