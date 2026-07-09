import { toast } from "@/lib/toast";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body.error || "Erro na requisição";
    // Every apiGet/apiPost/... call funnels through here, so this is the one
    // place that guarantees a failure is never silent — even in screens that
    // don't render their own inline error state (e.g. a bare delete button).
    toast.error(message);
    throw new Error(message);
  }
  return res.json();
}

export function apiGet<T>(url: string): Promise<T> {
  return fetch(url).then((res) => handle<T>(res));
}

export function apiPost<T>(url: string, data: unknown): Promise<T> {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle<T>(res));
}

export function apiPatch<T>(url: string, data: unknown): Promise<T> {
  return fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle<T>(res));
}

export function apiPut<T>(url: string, data: unknown): Promise<T> {
  return fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((res) => handle<T>(res));
}

export function apiDelete<T>(url: string): Promise<T> {
  return fetch(url, { method: "DELETE" }).then((res) => handle<T>(res));
}

export function apiUpload(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetch("/api/upload", { method: "POST", body: formData }).then((res) => handle<{ url: string }>(res));
}
