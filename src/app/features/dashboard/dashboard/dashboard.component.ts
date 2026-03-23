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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ProviderService } from '../../../core/services/provider.service';
import { ServiceService } from '../../../core/services/service.service';
import { Provider } from '../../../core/models/provider.model';
import { ServiceItem } from '../../../core/models/service-item.model';
import { SocketService } from '../../../core/services/socket.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
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
  private socketService = inject(SocketService);
  isLoading = signal<boolean>(true);

  currentUser = this.authService.user;
  userRole = computed(() => this.currentUser()?.role || 'customer');

  providers = signal<Provider[]>([]);
  services = signal<ServiceItem[]>([]);

  // Modal State
  showCreateModal = signal(false);
  isModalClosing = signal(false);
  isCreating = signal(false);

  isProviderDropdownOpen = signal(false);
  isServiceDropdownOpen = signal(false);

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
    return this.appointmentService.appointments().filter(
      (apt) =>
        // Sadece onay bekleyenler VEYA onaylanmış ama zamanı henüz geçmemiş olanlar
        apt.status === 'pending' ||
        (apt.status === 'booked' && new Date(apt.slot_time) > now),
    ).length;
  });

  // 2. Toplam Ziyaret (Sadece Tamamlananlar - Completed)
  // Not: Eğer sisteminde 'completed' diye bir statü yoksa ve sadece tarihi geçmiş 'booked' olanları
  // tamamlanmış sayıyorsan filtreyi: apt.status === 'booked' && new Date(apt.slot_time) < now yapmalısın.
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

    // Uzmanların isimlerini sayalım
    const providerCounts: { [name: string]: number } = {};

    apts.forEach((apt) => {
      // Randevunun durumuna bakmaksızın veya sadece tamamlananlara bakmak istersen buraya if ekleyebilirsin
      const name = apt.provider_name || 'Bilinmeyen Uzman';
      providerCounts[name] = (providerCounts[name] || 0) + 1;
    });

    // En çok tekrar eden ismi bulalım
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

  // Sınıfın içine (diğer sinyallerin yanına) ekle:
  today = new Date();

  // 📅 MÜŞTERİ: BUGÜN VE GELECEKTEKİ RANDEVULAR (Tablo ve Sağ Üst Kart İçin)
  upcomingCustomerAppointments = computed(() => {
    const allApts = this.appointmentService.appointments();
    const now = new Date();
    // Saati sıfırlayıp sadece gün bazlı karşılaştırma yapmak istersen .setHours(0,0,0,0) yapabilirsin
    return allApts
      .filter((a) => a.status !== 'cancelled' && new Date(a.slot_time) >= now)
      .sort(
        (a, b) =>
          new Date(a.slot_time).getTime() - new Date(b.slot_time).getTime(),
      );
  });

  // 🔄 MÜŞTERİ: TEKRAR AL (Zamanı geçmiş veya tamamlanmış randevular)
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
      ) // En yeniden eskiye
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
    setTimeout(() => this.isLoading.set(false), 1500);
  }
  loadAdminDashboard() {
    console.log('Admin verileri yükleniyor...');
  }

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
            this.uiService.closeConfirm(); // Başarıda kapat
          },
          error: (err) => {
            // 🌟 Hata mesajını Toastr'a fırlat
            this.uiService.showToast(
              err.error?.message || 'Yetki hatası!',
              'error',
            );
            this.uiService.closeConfirm(); // Hata gelse bile modalı kapat ki kullanıcı takılı kalmasın
          },
        });
      },
    );
  }

  // Menüleri Aç/Kapat
  toggleProviderDropdown() {
    this.isProviderDropdownOpen.update((v) => !v);
    this.isServiceDropdownOpen.set(false); // Diğerini kapat ki üst üste binmesin
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
