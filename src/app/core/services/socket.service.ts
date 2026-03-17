import { Injectable, inject, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket: Socket | null = null;
  private authService = inject(AuthService);
  private readonly SOCKET_URL = 'http://localhost:3000'; // Backend adresin

  /**
   * Sunucuya bağlanır ve kullanıcıyı kendi özel odasına (Room) dahil eder.
   */
  connect() {
    if (this.socket?.connected) return;

    this.socket = io(this.SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'], // Performans için doğrudan websocket seçiyoruz
    });

    this.socket.on('connect', () => {
      console.log('📡 [Socket] Sunucuya bağlandı:', this.socket?.id);

      // Kullanıcı verisi varsa hemen kendi odasına katılsın
      const userId = this.authService.user()?.id;
      if (userId) {
        this.socket?.emit('join_room', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('❌ [Socket] Bağlantı koptu.');
    });
  }

  /**
   * Belirli bir olayı dinlemek için kullanılır.
   */
  onEvent(eventName: string, callback: (data: any) => void) {
    this.socket?.on(eventName, callback);
  }

  /**
   * Manuel olarak bağlantıyı keser.
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
