export type ToastType = "success" | "error" | "info";

export interface ToastEvent {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type ToastListener = (event: ToastEvent) => void;

class ToastEmitter {
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(type: ToastType, message: string, duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const event: ToastEvent = { id, type, message, duration };
    this.listeners.forEach((listener) => listener(event));
  }

  success(message: string, duration?: number) {
    this.emit("success", message, duration);
  }

  error(message: string, duration?: number) {
    this.emit("error", message, duration);
  }

  info(message: string, duration?: number) {
    this.emit("info", message, duration);
  }
}

export const toast = new ToastEmitter();
