import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';
import { UiService } from '../../core/services/ui.service';
import { Client } from '../../core/models/client.model';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.component.html',
})
export class ClientsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);
  private uiService = inject(UiService);

  isLoading = signal(true);
  clients = signal<Client[]>([]);

  // Sinyali burada tanımlıyoruz
  searchQuery = signal('');

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
    this.fetchClients();
  }

  fetchClients() {
    this.isLoading.set(true);
    this.appointmentService
      .getProviderClients()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          // Backend'den gelen veriyi "temiz" sayıya çevirmek çok önemli
          const formattedData = (res.data || []).map((client: any) => ({
            ...client,
            // Backend string gönderse bile burada Number'a zorluyoruz
            completed_visits: Number(client.completed_visits) || 0,
            upcoming_visits: Number(client.upcoming_visits) || 0,
            realized_revenue: Number(client.realized_revenue) || 0,
            expected_revenue: Number(client.expected_revenue) || 0,
          }));

          this.clients.set(formattedData);
        },
        error: (err) => {
          this.uiService.showToast('Hata oluştu.', 'error');
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
