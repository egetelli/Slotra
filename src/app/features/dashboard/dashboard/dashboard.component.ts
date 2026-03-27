import {
  Component,
  signal,
  inject,
  OnInit,
  computed,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProviderService } from '../../../core/services/provider.service';
import { ServiceService } from '../../../core/services/service.service';
import { SettingsService } from '../../../core/services/settings.service';
import { Provider } from '../../../core/models/provider.model';
import { ServiceItem } from '../../../core/models/service-item.model';
import { SocketService } from '../../../core/services/socket.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  appointmentService = inject(AppointmentService);
  uiService = inject(UiService);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private providerService = inject(ProviderService);
  private serviceService = inject(ServiceService);
  private settingsService = inject(SettingsService); // Uzman hizmetlerini çekmek için eklendi
  private socketService = inject(SocketService);

  isLoading = signal<boolean>(true);

  currentUser = this.authService.user;
  userRole = computed(() => this.currentUser()?.role || 'customer');

  providers = signal<Provider[]>([]);
  services = signal<ServiceItem[]>([]);

  // Modal State (Müşteri için)
  showCreateModal = signal(false);
  isModalClosing = signal(false);
  isCreating = signal(false);

  // Dropdown State
  isProviderDropdownOpen = signal(false);
  isServiceDropdownOpen = signal(false);

  // --- MANUEL RANDEVU STATE (Uzman İçin Yeni Eklendi) ---
  showManualBookingModal = signal(false);
  isSubmittingManual = signal(false);
  providerServices = signal<ServiceItem[]>([]); // Uzmanın kendi hizmetleri
  manualBookingForm = {
    guestName: '',
    serviceId: '',
    date: '',
    time: '',
  };
  // ----------------------------------------------------

  appointmentForm = this.fb.group({
    providerId: ['', Validators.required],
    serviceId: ['', Validators.required],
    slotTime: ['', Validators.required],
  });

  //Provider için bekleyen randevular tablosu
  pendingAppointments = computed(() => {
    return this.appointmentService
      .appointments()
      .filter((a) => a.status === 'pending')
      .sort(
        (a, b) =>
          new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
      );
  });

  // 1. Bekleyen (Pending) veya Yaklaşan (Booked olup tarihi gelmemiş) Randevular
  pendingAppointmentCount = computed(() => {
    const now = new Date();
    return this.appointmentService
      .appointments()
      .filter(
        (apt) =>
          apt.status === 'pending' ||
          (apt.status === 'booked' && new Date(apt.slot_time) > now),
      ).length;
  });

  // 2. Toplam Ziyaret (Sadece Tamamlananlar - Completed)
  totalVisitsCount = computed(() => {
    return this.appointmentService
      .appointments()
      .filter(
        (apt) =>
          apt.status === 'completed' ||
          (apt.status === 'booked' && new Date(apt.slot_time) < new Date()),
      ).length;
  });

  // 3. Favori Uzman (Kullanıcının en çok randevu aldığı uzman)
  favoriteProvider = computed(() => {
    const apts = this.appointmentService.appointments();
    if (!apts || apts.length === 0) return 'Henüz Yok';

    const providerCounts: { [name: string]: number } = {};

    apts.forEach((apt) => {
      const name = apt.provider_name || 'Bilinmeyen Uzman';
      providerCounts[name] = (providerCounts[name] || 0) + 1;
    });

    let favorite = 'Henüz Yok';
    let maxCount = 0;

    for (const [name, count] of Object.entries(providerCounts)) {
      if (count > maxCount) {
        maxCount = count;
        favorite = name;
      }
    }

    return favorite;
  });

  today = new Date();

  // 📅 MÜŞTERİ: BUGÜN VE GELECEKTEKİ RANDEVULAR
  upcomingCustomerAppointments = computed(() => {
    const allApts = this.appointmentService.appointments();
    const now = new Date();
    return allApts
      .filter((a) => a.status !== 'cancelled' && new Date(a.slot_time) >= now)
      .sort(
        (a, b) =>
          new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
      );
  });

  // 🔄 MÜŞTERİ: TEKRAR AL
  pastAppointments = computed(() => {
    const allApts = this.appointmentService.appointments();
    const now = new Date();

    return allApts
      .filter(
        (a) =>
          (a.status === 'completed' || a.status === 'booked') &&
          new Date(a.slot_time) < now,
      )
      .sort(
        (a, b) =>
          new Date(b.slot_time).getTime() - new Date(a.slot_time).getTime(),
      )
      .slice(0, 5);
  });

  // 📊 İSTATİSTİK HESAPLAMALARI
  stats = computed(() => {
    const allApts = this.appointmentService.appointments();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayApts = allApts.filter((a) => a.slot_time.startsWith(todayStr));

    const todayRealizedEarnings = todayApts
      .filter((a) => a.status === 'completed')
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    const todayExpectedEarnings = todayApts
      .filter((a) => a.status === 'booked')
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    return {
      todayRealizedEarnings,
      todayExpectedEarnings,
      totalToday: todayApts.length,
      completedToday: todayApts.filter((a) => a.status === 'completed').length,
      nextCustomer: allApts
        .filter((a) => new Date(a.slot_time) > now && a.status === 'booked')
        .sort(
          (a, b) =>
            new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
        )[0],
      monthlyCount: allApts.filter((a) => {
        const aptDate = new Date(a.slot_time);
        return (
          aptDate.getMonth() === now.getMonth() &&
          aptDate.getFullYear() === now.getFullYear() &&
          a.status !== 'cancelled'
        );
      }).length,
      pendingCount: allApts.filter((a) => a.status === 'pending').length,
    };
  });

  // 📈 HAFTALIK DOLULUK ORANI
  occupancyRates = computed(() => {
    const allApts = this.appointmentService.appointments();
    const capacityPerDay = 10;
    const now = new Date();
    const monday = new Date(now);
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diffToMonday);

    const weekDaysLabels = [
      'Pazartesi',
      'Salı',
      'Çarşamba',
      'Perşembe',
      'Cuma',
    ];

    return weekDaysLabels.map((label, index) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + index);
      const dateStr = targetDate.toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];

      const count = allApts.filter(
        (a) => a.slot_time.startsWith(dateStr) && a.status !== 'cancelled',
      ).length;
      const percentage = Math.min((count / capacityPerDay) * 100, 100);

      return { day: label, percentage, isToday: dateStr === todayStr };
    });
  });

  constructor() {
    this.initRoleEffect();
  }

  ngOnInit() {
    this.socketService.connect();

    this.socketService.onEvent('appointment_updated', (data: any) => {
      this.appointmentService.updateAppointmentStatusLocally(
        data.appointmentId,
        data.status,
      );
    });

    this.socketService.onEvent('new_appointment', (data: any) => {
      this.appointmentService.addNewAppointmentLocally(data.appointment);
    });

    this.socketService.onEvent('appointment_cancelled', (data: any) => {
      this.appointmentService.updateAppointmentStatusLocally(
        data.appointmentId,
        'cancelled',
      );
    });
  }

  private initRoleEffect() {
    effect(() => {
      const user = this.authService.user();
      if (!user) return;
      if (user.role === 'customer') {
        this.loadCustomerDashboard();
        this.initializeAppointmentFormLogic();
      } else if (user.role === 'provider') {
        this.loadProviderDashboard();
      } else if (user.role === 'admin') {
        this.loadAdminDashboard();
      }
    });
  }

  initializeAppointmentFormLogic() {
    this.providerService.getProviders().subscribe({
      next: (data) => this.providers.set(data),
    });

    this.appointmentForm
      .get('providerId')
      ?.valueChanges.subscribe((selectedProviderId) => {
        if (selectedProviderId) {
          this.appointmentForm.get('serviceId')?.reset('');
          this.serviceService
            .getServicesByProvider(selectedProviderId)
            .subscribe({
              next: (data) => this.services.set(data),
            });
        }
      });
  }

  loadCustomerDashboard() {
    this.isLoading.set(true);
    this.appointmentService.fetchUpcomingAppointments();
    setTimeout(() => this.isLoading.set(false), 1500);
  }

  loadProviderDashboard() {
    this.isLoading.set(true);
    this.appointmentService.fetchProviderAppointments();

    // Uzman dashboardu yüklenirken, manuel randevu için hizmetlerini de çekelim
    this.settingsService.getAllSettings().subscribe({
      next: (data) => {
        if (data.services) {
          this.providerServices.set(data.services);
        }
      },
    });

    setTimeout(() => this.isLoading.set(false), 1500);
  }

  loadAdminDashboard() {
    console.log('Admin verileri yükleniyor...');
  }

  // --- MÜŞTERİ RANDEVU MODALI (Mevcut) ---
  openCreateModal() {
    this.isModalClosing.set(false);
    this.showCreateModal.set(true);
  }

  closeCreateModal() {
    this.isModalClosing.set(true);
    setTimeout(() => {
      this.showCreateModal.set(false);
      this.isModalClosing.set(false);
      this.appointmentForm.reset();
    }, 350);
  }

  submitNewAppointment() {
    if (this.appointmentForm.invalid) return;
    this.isCreating.set(true);
    const formValues = this.appointmentForm.getRawValue();
    const payload = {
      providerId: formValues.providerId!,
      serviceId: formValues.serviceId!,
      slotTime: new Date(formValues.slotTime!).toISOString(),
    };

    this.appointmentService.createAppointment(payload).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.closeCreateModal();
        this.uiService.showToast('Randevu başarıyla oluşturuldu!', 'success');
      },
      error: (err) => {
        this.isCreating.set(false);
        this.uiService.showToast(err.error?.message || 'Hata oluştu.', 'error');
      },
    });
  }

  // --- UZMAN İÇİN YENİ EKLENEN MANUEL RANDEVU İŞLEMLERİ ---

  openManualBookingModal() {
    this.showManualBookingModal.set(true);
  }

  closeManualBookingModal() {
    this.showManualBookingModal.set(false);
    this.manualBookingForm = {
      guestName: '',
      serviceId: '',
      date: '',
      time: '',
    };
  }

  submitManualBooking() {
    const { guestName, serviceId, date, time } = this.manualBookingForm;

    if (!guestName || !serviceId || !date || !time) {
      this.uiService.showToast('Lütfen tüm alanları doldurun.', 'error');
      return;
    }

    // 1. KULLANICI KONTROLÜ: providerId'nin kesinlikle string olmasını garantiye alıyoruz
    const currentProviderId = this.currentUser()?.id;
    if (!currentProviderId) {
      this.uiService.showToast(
        'Kullanıcı oturumu bulunamadı, lütfen tekrar giriş yapın.',
        'error',
      );
      return;
    }

    this.isSubmittingManual.set(true);

    // Tarih ve saati birleştirip ISO formatına çevir
    const slotTime = new Date(`${date}T${time}:00`).toISOString();

    // 2. PAYLOAD DÜZENLEMESİ: TypeScript'in kızmaması için "as any" ile tip kısıtlamasını esnetiyoruz.
    // Backend'de yazdığımız mantığa göre uzman randevu alırken 'customerId' bekliyorduk.
    // Şimdilik kendi user ID'sini gönderiyoruz ki veritabanı kısıtlamalarına takılmasın.
    const payload = {
      guestName: guestName,
      customerId: currentProviderId, // Backend'e zorunlu alan olarak gönderiyoruz
      serviceId: serviceId,
      slotTime: slotTime,
      providerId: currentProviderId, // Kesinlikle string oldu
    } as any; // <-- TypeScript hatasını bypass etmek için (Service interface'ini güncelleyene kadar)

    this.appointmentService.createAppointment(payload).subscribe({
      next: () => {
        this.uiService.showToast('Manuel randevu eklendi!', 'success');
        this.closeManualBookingModal();
        this.isSubmittingManual.set(false);
        // Listeyi yenilemek için
        this.loadProviderDashboard();
      },
      error: (err) => {
        this.uiService.showToast(
          err.error?.message || 'Bir hata oluştu',
          'error',
        );
        this.isSubmittingManual.set(false);
      },
    });
  }

  copyProfileLink() {
    const url = `${window.location.origin}/book/${this.currentUser()?.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.uiService.showToast(
        'Rezervasyon linki panoya kopyalandı!',
        'success',
      );
    });
  }
  // ---------------------------------------------------------

  onApproveClick(id: string) {
    this.uiService.openConfirm(
      'Randevuyu Onayla',
      'Bu randevuyu onaylamak istediğinize emin misiniz?',
      'success',
      () => {
        this.appointmentService.approveAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast('Randevu başarıyla onaylandı', 'success');
            this.uiService.closeConfirm();
          },
          error: (err) => {
            this.uiService.showToast(
              'Hata oluştu: ' + (err.error?.message || 'Bilinmeyen hata'),
              'error',
            );
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }

  onCancelClick(id: string) {
    this.uiService.openConfirm(
      'Randevuyu İptal Et',
      'Bu randevuyu iptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      'danger',
      () => {
        this.appointmentService.cancelAppointment(id).subscribe({
          next: () => {
            this.uiService.showToast(
              'Randevu başarıyla iptal edildi.',
              'success',
            );
            this.uiService.closeConfirm();
          },
          error: (err) => {
            this.uiService.showToast(
              err.error?.message || 'Yetki hatası!',
              'error',
            );
            this.uiService.closeConfirm();
          },
        });
      },
    );
  }

  // Menüleri Aç/Kapat
  toggleProviderDropdown() {
    this.isProviderDropdownOpen.update((v) => !v);
    this.isServiceDropdownOpen.set(false);
  }

  toggleServiceDropdown() {
    this.isServiceDropdownOpen.update((v) => !v);
    this.isProviderDropdownOpen.set(false);
  }

  closeDropdowns() {
    this.isProviderDropdownOpen.set(false);
    this.isServiceDropdownOpen.set(false);
  }

  // Değer Seçimi
  selectProvider(id: string) {
    this.appointmentForm.patchValue({ providerId: id });
    this.closeDropdowns();
  }

  selectService(id: string) {
    this.appointmentForm.patchValue({ serviceId: id });
    this.closeDropdowns();
  }

  // Arayüzde seçili olanın adını göstermek için
  getSelectedProviderName() {
    const id = this.appointmentForm.get('providerId')?.value;
    if (!id) return null;
    const provider = this.providers().find((p) => p.id === id);
    return provider ? `${provider.name} (${provider.title})` : null;
  }

  getSelectedServiceName() {
    const id = this.appointmentForm.get('serviceId')?.value;
    if (!id) return null;
    const srv = this.services().find((s) => s.id === id);
    return srv ? `${srv.name} - ${srv.base_price}₺` : null;
  }
}
