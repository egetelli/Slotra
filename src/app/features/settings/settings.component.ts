import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UiService } from '../../core/services/ui.service'; // UiService'i import ettik
import {
  ServiceItem,
  SettingsService,
  WorkDay,
} from '../../core/services/settings.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private uiService = inject(UiService); // UiService'i inject ettik

  // UI State
  activeTab = 'schedule';
  isLoading = signal(false);

  isSavingServices = signal<boolean>(false);

  // Gün isimleri eşleştirme tablosu (0: Pazar, 1: Pazartesi...)
  private dayNames = [
    'pazar',
    'pazartesi',
    'salı',
    'çarşamba',
    'perşembe',
    'cuma',
    'cumartesi',
  ];

  // Sinyal Başlatma (Varsayılan değerler dayName içermeli)
  schedule = signal<WorkDay[]>(
    this.dayNames.map((name, index) => ({
      dayIndex: index,
      dayName: name,
      isActive: index !== 0 && index !== 6, // Hafta içi varsayılan aktif
      startTime: '09:00',
      endTime: '18:00',
    })),
  );

  services = signal<ServiceItem[]>([]);
  profile = signal({ name: '', title: '', bio: '' });

  ngOnInit() {
    this.fetchSettings();
  }

  // --- VERİ ÇEKME ---
  fetchSettings() {
    this.isLoading.set(true);
    this.settingsService
      .getAllSettings()
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (data) => {
          if (data.schedule && data.schedule.length > 0) {
            // Backend'den gelen veriyi dayName ile zenginleştiriyoruz
            const mappedSchedule = data.schedule.map((item: any) => ({
              ...item,
              dayName: this.dayNames[item.dayIndex],
            }));

            // Günleri 1'den (Pazartesi) başlayacak şekilde sıralayalım (Opsiyonel)
            mappedSchedule.sort(
              (a: any, b: any) =>
                (a.dayIndex === 0 ? 7 : a.dayIndex) -
                (b.dayIndex === 0 ? 7 : b.dayIndex),
            );

            this.schedule.set(mappedSchedule);
          }

          if (data.services) this.services.set(data.services);
          if (data.profile) this.profile.set(data.profile);
        },
        error: (err) => {
          this.uiService.showToast(
            'Ayarlar yüklenirken bir hata oluştu.',
            'error',
          );
          console.error('Ayarlar yüklenirken hata:', err);
        },
      });
  }

  // --- KAYDETME İŞLEMLERİ ---

  saveSchedule() {
    this.isLoading.set(true);
    this.settingsService
      .updateSchedule(this.schedule())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () =>
          this.uiService.showToast(
            'Mesai saatleri başarıyla güncellendi!',
            'success',
          ),
        error: (err) => {
          this.uiService.showToast('Mesai saatleri kaydedilemedi.', 'error');
          console.error('Mesai hatası:', err);
        },
      });
  }

  saveServices() {
    this.isLoading.set(true);
    this.settingsService
      .updateServices(this.services())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (response) => {
          // BURASI ÇOK KRİTİK: Backend'den gelen (ID'leri netleşmiş)
          // listeyi sinyale geri basıyoruz.
          if (response) {
            this.services.set(response);
          }
          this.uiService.showToast('Hizmetler güncellendi!', 'success');
        },
      });
  }

  saveProfile() {
    this.isLoading.set(true);
    this.settingsService
      .updateProfile(this.profile())
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: () =>
          this.uiService.showToast(
            'Profil bilgileriniz başarıyla kaydedildi!',
            'success',
          ),
        error: (err) => {
          this.uiService.showToast(
            'Profil güncellenirken bir hata oluştu.',
            'error',
          );
          console.error('Profil hatası:', err);
        },
      });
  }

  // --- HİZMET YÖNETİMİ ---

  addNewService() {
    this.services.update((prev) => [
      ...prev,
      { name: 'Yeni Hizmet', duration: 30, base_price: 0 },
    ]);
  }

  deleteService(index: number) {
    const serviceToDelete = this.services()[index];

    this.uiService.openConfirm(
      'Hizmeti Sil',
      `${serviceToDelete.name} hizmetini kalıcı olarak silmek istediğinize emin misiniz?`,
      'danger',
      () => {
        if (serviceToDelete.id) {
          this.isLoading.set(true);
          this.settingsService
            .deleteService(String(serviceToDelete.id))
            .pipe(
              finalize(() => {
                this.isLoading.set(false);
                // MODALI KAPAT: İşlem bittiğinde (başarılı veya hatalı) modalı kapat
                this.uiService.closeConfirm?.();
              }),
            )
            .subscribe({
              next: () => {
                this.services.update((prev) =>
                  prev.filter((_, i) => i !== index),
                );
                this.uiService.showToast(
                  'Hizmet başarıyla silindi.',
                  'success',
                );
              },
              error: (err) => {
                this.uiService.showToast(
                  'Hizmet silinirken bir hata oluştu.',
                  'error',
                );
              },
            });
        } else {
          // ID yoksa sadece ekrandan sil ve modalı kapat
          this.services.update((prev) => prev.filter((_, i) => i !== index));
          this.uiService.closeConfirm?.(); // Modalı kapat
          this.uiService.showToast(
            'Henüz kaydedilmemiş hizmet kaldırıldı.',
            'success',
          );
        }
      },
    );
  }
}
