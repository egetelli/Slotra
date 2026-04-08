import { CommonModule } from '@angular/common';
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../core/services/admin.service';
import { UiService } from '../../core/services/ui.service'; // Yolu projene göre kontrol et

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
  private uiService = inject(UiService); // UiService inject edildi

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
      error: () => {
        this.isLoadingUsers.set(false);
        this.uiService.showToast(
          'Kullanıcılar yüklenirken bir hata oluştu.',
          'error',
        );
      },
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

    obs.subscribe({
      next: () => {
        this.loadUsers();
        this.isModalOpen.set(false);
        this.uiService.showToast('Kullanıcı başarıyla kaydedildi.', 'success');
      },
      error: () => {
        this.uiService.showToast(
          'Kullanıcı kaydedilirken hata oluştu.',
          'error',
        );
      },
    });
  }

  confirmDelete(id: string) {
    // uiService.openConfirm metodunu kullanarak callback ile silme işlemi yapıyoruz
    this.uiService.openConfirm(
      'Kullanıcıyı Sil',
      'Bu kullanıcıyı tamamen silmek istediğinize emin misiniz?',
      'danger',
      () => {
        // action fonksiyonu
        this.adminService.deleteUser(id).subscribe({
          next: () => {
            this.loadUsers();
            this.uiService.showToast('Kullanıcı başarıyla silindi.', 'success');
            this.uiService.closeConfirm(); // İşlem bitince confirm modalı kapat
          },
          error: () => {
            this.uiService.showToast('Silme işlemi başarısız oldu.', 'error');
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }

  // ==========================================
  // 2. UZMAN (PROVIDER) YÖNETİMİ (GERÇEK VERİLER)
  // ==========================================
  providers = computed(() => this.users().filter((u) => u.role === 'provider'));
  selectedProviderId = signal<string | null>(null);

  providerProfileForm = {
    name: '',
    title: '',
  };
  services = signal<any[]>([]);
  workingHours = signal<any[]>([]);

  isServiceModalOpen = signal(false);
  selectedService = signal<any | null>(null);

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

    const p = this.providers().find((x) => x.id === id);

    if (p) {
      this.providerProfileForm = {
        title: p.title || '',
        name: p.name || p.full_name || '',
      };
    }

    this.loadProviderData(id);
  }

  loadProviderData(providerId: string) {
    this.adminService
      .getProviderServices(providerId)
      .subscribe((data) => this.services.set(data || []));

    this.adminService.getWorkingHours(providerId).subscribe((data) => {
      this.workingHours.set(data || []);
    });
  }

  saveProviderProfile() {
    this.uiService.showToast(
      'Profil bilgileri kaydedildi (Backend bağlantısı yapılınca çalışacak)',
      'success',
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
      .subscribe({
        next: () => {
          this.loadProviderData(providerId);
          this.isServiceModalOpen.set(false);
          this.uiService.showToast('Hizmet başarıyla kaydedildi.', 'success');
        },
        error: () => {
          this.uiService.showToast(
            'Hizmet kaydedilirken hata oluştu.',
            'error',
          );
        },
      });
  }

  deleteService(id: string) {
    // uiService.openConfirm kullanılarak callback ile silme
    this.uiService.openConfirm(
      'Hizmeti Sil',
      'Bu hizmeti silmek istediğinize emin misiniz?',
      'danger',
      () => {
        // action fonksiyonu
        this.adminService.deleteService(id).subscribe({
          next: () => {
            if (this.selectedProviderId()) {
              this.loadProviderData(this.selectedProviderId()!);
            }
            this.uiService.showToast('Hizmet başarıyla silindi.', 'success');
            this.uiService.closeConfirm();
          },
          error: () => {
            this.uiService.showToast('Hizmet silinirken hata oluştu.', 'error');
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }

  saveWorkingHours() {
    const providerId = this.selectedProviderId();
    if (!providerId) return;

    this.adminService
      .updateWorkingHours(providerId, this.workingHours())
      .subscribe({
        next: () => {
          this.uiService.showToast(
            'Çalışma saatleri başarıyla güncellendi!',
            'success',
          );
        },
        error: () => {
          this.uiService.showToast(
            'Saatler güncellenirken hata oluştu.',
            'error',
          );
        },
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
    this.uiService.showToast(
      'Sistem ayarları başarıyla güncellendi!',
      'success',
    );
  }
}
