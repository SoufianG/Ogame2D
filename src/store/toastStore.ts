import { create } from 'zustand';

export type ToastType = 'building' | 'research' | 'shipyard' | 'fleet' | 'achievement' | 'combat' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  body?: string;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, body?: string) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (type, title, body) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({
      toasts: [...s.toasts, { id, type, title, body, createdAt: Date.now() }],
    }));
    // Auto-remove apres 6s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
