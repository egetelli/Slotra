import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { finalize } from 'rxjs';
import { AppointmentService } from '../../core/services/appointment.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  templateUrl: './analytics.component.html',
})
export class AnalyticsComponent implements OnInit {
  private appointmentService = inject(AppointmentService);

  isLoading = signal(true);
  stats = signal<any>(null);

  // Grafik Tanımlamaları
  revenueChart: any;
  serviceChart: any;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.appointmentService
      .getProviderAnalytics()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.stats.set(res.data);
          this.setupCharts(res.data);
        },
      });
  }

  setupCharts(data: any) {
    // Günlük Gelir Analizi (Son 7 Gün)
    this.revenueChart = {
      series: [
        {
          name: 'Günlük Ciro',
          data: data.daily.map((d: any) => Number(d.revenue)),
        },
      ],
      chart: {
        type: 'area', // 'line' yerine 'area' daha dolu gösterir
        height: 350,
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      colors: ['#6366f1'], // Indigo
      stroke: { curve: 'smooth', width: 3 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: data.daily.map((d: any) => d.date_label),
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: { formatter: (val: number) => val + ' ₺' },
        tickAmount: 5,
      },
      grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    };

    // 2. Hizmet Dağılımı (Daha Canlı Renklerle Donut)
    this.serviceChart = {
      series: data.services.map((s: any) => Number(s.count)),
      chart: {
        type: 'donut',
        height: 380, // Çizgi grafiğiyle hizalı olsun
      },
      labels: data.services.map((s: any) => s.service_name),
      // Örnekteki gibi canlı ve parlak renk paleti
      colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      legend: {
        position: 'bottom',
        fontFamily: 'inherit',
        markers: { radius: 12 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '72%',
            labels: {
              show: true,
              name: { fontFamily: 'inherit', fontWeight: 'bold' },
              value: {
                fontFamily: 'inherit',
                fontWeight: 'black',
                formatter: (val: string) => val + ' İşlem',
              },
              total: {
                show: true,
                label: 'Toplam',
                fontFamily: 'inherit',
                fontWeight: 'bold',
              },
            },
          },
        },
      },
      dataLabels: { enabled: false },
      stroke: { show: false }, // Aradaki boşlukları kaldır
    };
  }
}
