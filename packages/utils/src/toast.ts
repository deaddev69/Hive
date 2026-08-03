export type ToastType = "success" | "error" | "info";

export interface ToastEvent {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  message: string; // for backward compatibility
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

  emit(type: ToastType, titleOrMessage: string, descriptionOrDuration?: string | number, duration?: number) {
    const id = Math.random().toString(36).substring(2, 9);
    let title = titleOrMessage;
    let description: string | undefined = undefined;
    let finalDuration = 4000;

    if (typeof descriptionOrDuration === "string") {
      description = descriptionOrDuration;
      if (typeof duration === "number") {
        finalDuration = duration;
      }
    } else if (typeof descriptionOrDuration === "number") {
      finalDuration = descriptionOrDuration;
    }

    const event: ToastEvent = {
      id,
      type,
      title,
      description,
      message: description ? `${title}: ${description}` : title,
      duration: finalDuration,
    };
    this.listeners.forEach((listener) => listener(event));
  }

  success(title: string, description?: string, duration?: number): void;
  success(title: string, duration?: number): void;
  success(title: string, arg2?: string | number, arg3?: number) {
    this.emit("success", title, arg2, arg3);
  }

  error(title: string, description?: string, duration?: number): void;
  error(title: string, duration?: number): void;
  error(title: string, arg2?: string | number, arg3?: number) {
    this.emit("error", title, arg2, arg3);
  }

  info(title: string, description?: string, duration?: number): void;
  info(title: string, duration?: number): void;
  info(title: string, arg2?: string | number, arg3?: number) {
    this.emit("info", title, arg2, arg3);
  }
}

export const toast = new ToastEmitter();

