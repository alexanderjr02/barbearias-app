export interface ToastItem {
  id: string;
  type: "success" | "error";
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

// A plain module-level store (no React context) so toast.success()/error()
// can be called from anywhere — including apiClient.ts, which runs outside
// any component tree. <Toaster /> (mounted once in AppProviders) subscribes
// to render whatever is currently in the list.
let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

function push(type: ToastItem["type"], message: string) {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, type, message }];
  emit();
  setTimeout(() => dismiss(id), 4000);
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  dismiss,
};
