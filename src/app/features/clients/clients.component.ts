import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { UiService } from '../../core/services/ui.service';
import { Client } from '../../core/models/client.model';
import { AuthService } from '../../core/services/auth.service';
import { AdminService } from '../../core/services/admin.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private uiService = inject(UiService);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  isLoading = signal(true);
  clients = signal<Client[]>([]);
  searchQuery = signal('');

  // Admin State
  isAdmin = computed(() => this.authService.user()?.role === 'admin');
  providers = signal<any[]>([]);
  selectedProviderId = signal<string>('');

  // Arama inputu değiştiğinde sinyali güncelleyen metod
  onSearchChange(value: string) {
    this.searchQuery.set(value);
  }

  filteredClients = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return this.clients();

    return this.clients().filter(
      (client) =>
        client.customer_name?.toLowerCase().includes(query) ||
        client.customer_email?.toLowerCase().includes(query),
    );
  });

  ngOnInit() {
    if (this.isAdmin()) {
      this.loadProviders();
      this.fetchClients(''); // Admin açtığında önce tüm müşterileri veya boş listeyi çek
    } else {
      this.fetchClients(); // Uzmansa kendi müşterilerini çeker
    }
  }

  loadProviders() {
    this.adminService.getUsers().subscribe((users) => {
      this.providers.set(users.filter((u) => u.role === 'provider'));
    });
  }

  onProviderChange(id: string) {
    this.selectedProviderId.set(id);
    this.fetchClients(id);
  }

  fetchClients(providerId?: string) {
    this.isLoading.set(true);

    // AKILLI İSTEK: Adminse Admin Servisi, Değilse Provider Servisi çalışır
    const request$ = this.isAdmin()
      ? this.adminService.getClients(providerId)
      : this.appointmentService.getProviderClients();

    request$.pipe(finalize(() => this.isLoading.set(false))).subscribe({
      next: (res: any) => {
        // Backend'in dönüş formatına göre (res.data veya res)
        const rawData = res.data || res || [];

        const formattedData = rawData.map((client: any) => ({
          ...client,
          completed_visits: Number(client.completed_visits) || 0,
          upcoming_visits: Number(client.upcoming_visits) || 0,
          realized_revenue: Number(client.realized_revenue) || 0,
          expected_revenue: Number(client.expected_revenue) || 0,
        }));

        this.clients.set(formattedData);
      },
      error: (err) => {
        this.uiService.showToast(
          'Müşteriler yüklenirken hata oluştu.',
          'error',
        );
      },
    });
  }

  openClientDetails(client: Client) {
    this.uiService.showToast(
      `${client.customer_name} detayları yakında eklenecek.`,
      'success',
    );
  }
}
