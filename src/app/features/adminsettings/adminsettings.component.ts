import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';

type SettingsTab = 'users' | 'providers' | 'system';

@Component({
  selector: 'app-adminsettings',
  imports: [CommonModule],
  templateUrl: './adminsettings.component.html',
  styleUrl: './adminsettings.component.scss',
})
export class AdminsettingsComponent {
  // Aktif sekmeyi tutan sinyal
  activeTab = signal<SettingsTab>('users');

  // Örnek: Sekme değiştirme fonksiyonu
  setTab(tab: SettingsTab) {
    this.activeTab.set(tab);
  }
}
