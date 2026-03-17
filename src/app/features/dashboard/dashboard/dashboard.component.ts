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

  currentUser = this.authService.user;
  userRole = computed(() => this.currentUser()?.role || 'customer');

  providers = signal<Provider[]>([]);
  services = signal<ServiceItem[]>([]);

  // Modal State
  showCreateModal = signal(false);
  isCreating = signal(false);

  appointmentForm = this.fb.group({
    providerId: ['', Validators.required],
    serviceId: ['', Validators.required],
    slotTime: ['', Validators.required],
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
    this.appointmentService.fetchUpcomingAppointments();
  }
  loadProviderDashboard() {
    this.appointmentService.fetchProviderAppointments();
  }
  loadAdminDashboard() {
    console.log('Admin verileri yükleniyor...');
  }

  openCreateModal() {
    this.showCreateModal.set(true);
  }
  closeCreateModal() {
    this.showCreateModal.set(false);
    this.appointmentForm.reset();
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
}
