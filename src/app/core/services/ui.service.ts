import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UiService {
  // 1. Detay Modalı
  detailModal = signal<{ show: boolean; isClosing: boolean; data: any }>({
    show: false,
    isClosing: false,
    data: null,
  });

  // 2. Onay (Confirm) Modalı
  confirmDialog = signal<{
    show: boolean;
    isClosing: boolean;
    title: string;
    message: string;
    action: () => void;
    type: 'danger' | 'success';
  }>({
    show: false,
    isClosing: false,
    title: '',
    message: '',
    action: () => {},
    type: 'success',
  });

  // 3. Bildirim (Toast)
  toast = signal<{
    show: boolean;
    isClosing: boolean;
    message: string;
    type: 'success' | 'error';
  }>({
    show: false,
    isClosing: false,
    message: '',
    type: 'success',
  });

  // METOTLAR
  openDetail(data: any) {
    this.detailModal.set({ show: true, isClosing: false, data });
    document.body.classList.add('modal-open');
  }

  closeDetail() {
    this.detailModal.update((m) => ({ ...m, isClosing: true }));
    setTimeout(() => {
      this.detailModal.set({ show: false, isClosing: false, data: null });
      if (!this.confirmDialog().show)
        document.body.classList.remove('modal-open');
    }, 300);
  }

  openConfirm(
    title: string,
    message: string,
    type: 'danger' | 'success',
    action: () => void,
  ) {
    this.detailModal.update((m) => ({ ...m, isClosing: true })); // Detayı kapat
    setTimeout(() => {
      this.detailModal.set({ show: false, isClosing: false, data: null });
      this.confirmDialog.set({
        show: true,
        isClosing: false,
        title,
        message,
        type,
        action,
      });
    }, 300);
  }

  closeConfirm() {
    this.confirmDialog.update((c) => ({ ...c, isClosing: true }));
    setTimeout(() => {
      this.confirmDialog.set({
        show: false,
        isClosing: false,
        title: '',
        message: '',
        action: () => {},
        type: 'success',
      });
      document.body.classList.remove('modal-open');
    }, 300);
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    this.toast.set({ show: true, isClosing: false, message, type });
    setTimeout(() => this.closeToast(), 3000);
  }

  closeToast() {
    this.toast.update((t) => ({ ...t, isClosing: true }));
    setTimeout(
      () =>
        this.toast.set({
          show: false,
          isClosing: false,
          message: '',
          type: 'success',
        }),
      300,
    );
  }
}
