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
  private settingsService = inject(SettingsService);
  private socketService = inject(SocketService);
  isBlockModalOpen = signal(false);
  isSubmittingBlock = signal(false);
  blockForm = {
    reason: 'Mola',
    date: '',
    startTime: '',
    endTime: '',
  };

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

  // --- MANUEL RANDEVU STATE ---
  showManualBookingModal = signal(false);
  isSubmittingManual = signal(false);
  providerServices = signal<ServiceItem[]>([]);

  // Akıllı Arama (Smart Dropdown) Değişkenleri
  customerSearchQuery = signal('');
  searchResults = signal<any[]>([]);
  isSearching = signal(false);
  showCustomerDropdown = signal(false);
  selectedCustomer = signal<{ id: string | null; name: string } | null>(null);

  manualBookingForm = {
    serviceId: '',
    date: '',
    time: '',
  };

  appointmentForm = this.fb.group({
    providerId: ['', Validators.required],
    serviceId: ['', Validators.required],
    slotTime: ['', Validators.required],
  });

  // --- HESAPLANMIŞ VERİLER (COMPUTED) ---
  pendingAppointments = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.appointmentService
      .appointments()
      .filter((a) => a.status === 'pending' && new Date(a.slot_time) >= today)
      .sort(
        (a, b) =>
          new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
      );
  });

  pendingAppointmentCount = computed(() => {
    const now = new Date();
    return this.appointmentService
      .appointments()
      .filter(
        (apt) =>
          (apt.status === 'pending' && new Date(apt.slot_time) >= now) ||
          (apt.status === 'booked' && new Date(apt.slot_time) > now),
      ).length;
  });

  totalVisitsCount = computed(() => {
    return this.appointmentService
      .appointments()
      .filter(
        (apt) =>
          apt.status === 'completed' ||
          (apt.status === 'booked' && new Date(apt.slot_time) < new Date()),
      ).length;
  });

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

  stats = computed(() => {
    const allApts = this.appointmentService.appointments();
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const todayApts = allApts.filter((a) => a.slot_time.startsWith(todayStr));

    const todayRealizedEarnings = todayApts
      .filter((a) => a.status === 'booked' && new Date(a.slot_time) < now)
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    const todayExpectedEarnings = todayApts
      .filter((a) => a.status === 'booked' && new Date(a.slot_time) >= now)
      .reduce((sum, a) => sum + Number(a.total_price), 0);

    return {
      todayRealizedEarnings,
      todayExpectedEarnings,
      totalToday: todayApts.length,
      completedToday: todayApts.filter(
        (a) => a.status === 'booked' && new Date(a.slot_time) < now,
      ).length,
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
      pendingCount: allApts.filter(
        (a) => a.status === 'pending' && new Date(a.slot_time) >= now,
      ).length,
    };
  });

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

  // --- MÜŞTERİ RANDEVU MODALI ---
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

  // --- UZMAN MANUEL RANDEVU İŞLEMLERİ (YENİLENDİ) ---
  openManualBookingModal() {
    this.showManualBookingModal.set(true);
  }

  closeManualBookingModal() {
    this.showManualBookingModal.set(false);
    this.customerSearchQuery.set('');
    this.selectedCustomer.set(null);
    this.searchResults.set([]);
    this.manualBookingForm = { serviceId: '', date: '', time: '' };
  }

  // Arama Tetikleyici
  onSearchInput(event: any) {
    const val = event.target.value;
    this.customerSearchQuery.set(val);
    this.selectedCustomer.set(null);

    if (val.length < 2) {
      this.searchResults.set([]);
      this.showCustomerDropdown.set(false);
      return;
    }

    this.isSearching.set(true);
    this.showCustomerDropdown.set(true);

    this.appointmentService.searchCustomers(val).subscribe({
      next: (res) => {
        this.searchResults.set(res.data);
        this.isSearching.set(false);
      },
      error: () => this.isSearching.set(false),
    });
  }

  selectCustomer(user: any) {
    this.selectedCustomer.set({ id: user.id, name: user.full_name });
    this.customerSearchQuery.set(user.full_name);
    this.showCustomerDropdown.set(false);
  }

  selectAsGuest() {
    const guestName = this.customerSearchQuery().trim();
    if (!guestName) return;
    this.selectedCustomer.set({ id: null, name: guestName });
    this.showCustomerDropdown.set(false);
  }

  onInputBlur() {
    setTimeout(() => this.showCustomerDropdown.set(false), 200);
  }

  submitManualBooking() {
    const customer = this.selectedCustomer();
    const { serviceId, date, time } = this.manualBookingForm;

    // Eğer dropdown'dan seçim yapmadan direkt isim yazıp geçildiyse onu "Misafir" kabul et
    let finalCustomerId = customer?.id || null;
    let finalGuestName = customer?.id
      ? null
      : customer?.name || this.customerSearchQuery().trim();

    if (!finalGuestName && !finalCustomerId) {
      this.uiService.showToast(
        'Lütfen bir müşteri adı girin veya listeden seçin.',
        'error',
      );
      return;
    }

    if (!serviceId || !date || !time) {
      this.uiService.showToast(
        'Lütfen hizmet, tarih ve saat alanlarını doldurun.',
        'error',
      );
      return;
    }

    const currentProviderId = this.currentUser()?.id;
    if (!currentProviderId) return;

    this.isSubmittingManual.set(true);
    const slotTime = new Date(`${date}T${time}:00`).toISOString();

    const payload = {
      userId: finalCustomerId || currentProviderId, // Kayıtlı müşteri ise ID gider, değilse null
      guestName: finalGuestName, // Kayıtlı müşteri ise null gider, değilse isim gider
      serviceId: serviceId,
      slotTime: slotTime,
      providerId: currentProviderId,
      status: 'booked', // Manuel alınanlar direkt onaylıdır
    } as any;

    this.appointmentService.createAppointment(payload).subscribe({
      next: () => {
        this.uiService.showToast('Randevu başarıyla eklendi!', 'success');
        this.closeManualBookingModal();
        this.isSubmittingManual.set(false);
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

  selectProvider(id: string) {
    this.appointmentForm.patchValue({ providerId: id });
    this.closeDropdowns();
  }

  selectService(id: string) {
    this.appointmentForm.patchValue({ serviceId: id });
    this.closeDropdowns();
  }

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

  openBlockModal() {
    const today = new Date().toISOString().split('T')[0];
    this.blockForm = {
      reason: 'Mola',
      date: today,
      startTime: '12:00',
      endTime: '13:00',
    };
    this.isBlockModalOpen.set(true);
  }

  closeBlockModal() {
    this.isBlockModalOpen.set(false);
  }

  submitBlockTime() {
    // 2. Eğer halihazırda bir istek atılıyorsa, fonksiyona girmeyi direkt reddet! (Çift tık koruması)
    if (this.isSubmittingBlock()) return;

    const currentProviderId = this.currentUser()?.id;

    if (!currentProviderId) {
      this.uiService.showToast(
        'Kullanıcı bilgisi bulunamadı. Lütfen sayfayı yenileyin.',
        'error',
      );
      return;
    }

    if (
      !this.blockForm.date ||
      !this.blockForm.startTime ||
      !this.blockForm.endTime
    ) {
      this.uiService.showToast(
        'Lütfen tarih ve saat aralıklarını eksiksiz girin.',
        'error',
      );
      return;
    }

    const slotTime = new Date(
      `${this.blockForm.date}T${this.blockForm.startTime}:00`,
    ).toISOString();
    const endTime = new Date(
      `${this.blockForm.date}T${this.blockForm.endTime}:00`,
    ).toISOString();

    const payload = {
      type: 'block',
      providerId: currentProviderId,
      guestName: `[BLOKE] ${this.blockForm.reason}`,
      slotTime: slotTime,
      endTime: endTime,
      status: 'booked',
    };

    // 3. İstek başlamadan hemen önce butonu kilitle
    this.isSubmittingBlock.set(true);

    this.appointmentService.createAppointment(payload).subscribe({
      next: () => {
        this.uiService.showToast('Zaman başarıyla kilitlendi.', 'success');
        this.closeBlockModal();
        this.isSubmittingBlock.set(false); // İşlem başarılı, kilidi aç
        //this.loadDashboardData();
      },
      error: (err) => {
        console.error('GERÇEK JS HATASI:', err); // Bunu ekle ve F12 Konsoluna bak
        this.uiService.showToast(
          err.error?.message || 'Zaman kapatılırken bir hata oluştu.',
          'error',
        );
        this.isSubmittingBlock.set(false);
      },
    });
  }
}
