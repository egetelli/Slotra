import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';

type SettingsTab = 'users' | 'providers' | 'system';

@Component({
  selector: 'app-adminsettings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './adminsettings.component.html',
  styleUrl: './adminsettings.component.scss',
})
export class AdminsettingsComponent implements OnInit {
  private adminService = inject(AdminService);

  activeTab = signal<SettingsTab>('users');

  ngOnInit() {
    this.loadUsers();
    // System settings şimdilik default statik. Backend yazılınca loadSystemSettings() eklenebilir.
    this.systemSettings.set({
      maintenance_mode: false,
      max_appointment_duration: 120,
      cancellation_notice_hours: 24,
    });
  }

  setTab(tab: SettingsTab) {
    this.activeTab.set(tab);
  }

  // ==========================================
  // 1. KULLANICI (USER) YÖNETİMİ
  // ==========================================
  users = signal<any[]>([]);
  isLoadingUsers = signal(false);
  isModalOpen = signal(false);
  selectedUser = signal<any | null>(null);

  userForm: {
    full_name: string;
    email: string;
    role: string;
    password?: string;
    title?: string;
  } = {
    full_name: '',
    email: '',
    role: 'customer',
    password: '',
    title: '',
  };

  loadUsers() {
    this.isLoadingUsers.set(true);
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoadingUsers.set(false);
      },
      error: () => this.isLoadingUsers.set(false),
    });
  }

  openModal(user?: any) {
    if (user) {
      this.selectedUser.set(user);
      this.userForm = {
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        password: '',
        title: '',
      };
    } else {
      this.selectedUser.set(null);
      this.userForm = {
        full_name: '',
        email: '',
        role: 'customer',
        password: '',
        title: '',
      };
    }
    this.isModalOpen.set(true);
  }

  saveUser() {
    const data = this.userForm;
    const obs = this.selectedUser()
      ? this.adminService.updateUser(this.selectedUser().id, data)
      : this.adminService.createUser(data);

    obs.subscribe(() => {
      this.loadUsers();
      this.isModalOpen.set(false);
    });
  }

  confirmDelete(id: string) {
    if (confirm('Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?')) {
      this.adminService.deleteUser(id).subscribe(() => this.loadUsers());
    }
  }

  // ==========================================
  // 2. UZMAN (PROVIDER) YÖNETİMİ (GERÇEK VERİLER)
  // ==========================================
  providers = computed(() => this.users().filter((u) => u.role === 'provider'));
  selectedProviderId = signal<string | null>(null);

  providerProfileForm = {
    name: '', // bio silindi, name eklendi
    title: '',
  };
  services = signal<any[]>([]);
  workingHours = signal<any[]>([]); // Sadece DB'den gelen gerçek veriler tutulacak

  isServiceModalOpen = signal(false);
  selectedService = signal<any | null>(null);

  // Modelin DB tablosuna (duration_minutes, base_price) uygun hali
  serviceForm = {
    name: '',
    description: '',
    duration_minutes: 30,
    base_price: 0,
  };

  onProviderSelect(id: string) {
    if (!id) {
      this.selectedProviderId.set(null);
      return;
    }
    this.selectedProviderId.set(id);

    // 1. DÜZELTME: Veritabanından gelen kolon isimlerine göre eşle
    const p = this.providers().find((x) => x.id === id);

    if (p) {
      this.providerProfileForm = {
        title: p.title || '', // 'title' kolonu "Oto Kuaför"ü getirmeli
        name: p.name || p.full_name || '', // Tabloda 'name' olduğu için p.name kullanmalısın
      };
    }

    // 2. DÜZELTME: Eğer bu metod formu sıfırlıyorsa, içini kontrol etmelisin.
    this.loadProviderData(id);
  }

  // Hem Servisleri hem de Çalışma Saatlerini gerçek Backend'den çekiyoruz
  loadProviderData(providerId: string) {
    // 1. Servisleri Getir
    this.adminService
      .getProviderServices(providerId)
      .subscribe((data) => this.services.set(data || []));

    // 2. Çalışma Saatlerini Getir (MOCK YOK, GERÇEK API ÇAĞRISI)
    this.adminService.getWorkingHours(providerId).subscribe((data) => {
      this.workingHours.set(data || []);
    });
  }

  saveProviderProfile() {
    alert(
      'Profil bilgileri kaydedildi (Backend bağlantısı yapılınca çalışacak)',
    );
  }

  openServiceModal(service?: any) {
    if (service) {
      this.selectedService.set(service);
      this.serviceForm = {
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        base_price: service.base_price,
      };
    } else {
      this.selectedService.set(null);
      this.serviceForm = {
        name: '',
        description: '',
        duration_minutes: 30,
        base_price: 0,
      };
    }
    this.isServiceModalOpen.set(true);
  }

  saveService() {
    const providerId = this.selectedProviderId();
    if (!providerId) return;

    this.adminService
      .saveService(providerId, this.serviceForm, this.selectedService()?.id)
      .subscribe(() => {
        this.loadProviderData(providerId); // Servis eklendiğinde tabloyu yenile
        this.isServiceModalOpen.set(false);
      });
  }

  deleteService(id: string) {
    if (confirm('Bu hizmeti silmek istediğinize emin misiniz?')) {
      this.adminService.deleteService(id).subscribe(() => {
        if (this.selectedProviderId())
          this.loadProviderData(this.selectedProviderId()!);
      });
    }
  }

  saveWorkingHours() {
    const providerId = this.selectedProviderId();
    if (!providerId) return;

    // workingHours sinyali içindeki liste doğrudan backend'in beklediği formattadır
    this.adminService
      .updateWorkingHours(providerId, this.workingHours())
      .subscribe(() => {
        alert('Çalışma saatleri başarıyla güncellendi!');
      });
  }

  getDayName(dayOfWeek: number): string {
    const days = [
      'Pazar',
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
      'Cumartesi',
    ];
    return days[dayOfWeek];
  }

  // ==========================================
  // 3. SİSTEM AYARLARI
  // ==========================================
  systemSettings = signal<any>({});

  saveSystemSettings() {
    console.log('Kaydedilecek Ayarlar:', this.systemSettings());
    alert('Sistem ayarları güncellendi!');
  }
}
