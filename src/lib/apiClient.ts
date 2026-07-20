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

// The web session is a short-lived (15 min) access-token cookie plus a
// long-lived refresh cookie. Nothing was renewing the access token, so a long
// editing session (e.g. tweaking the app appearance for a while) started
// 401-ing mid-work. On a 401 we transparently hit the refresh endpoint once —
// which rotates the cookies — and retry the original request. A single shared
// promise prevents a stampede when several calls 401 at the same time.
let refreshing: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/auth/refresh", { method: "POST" })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function withAuth<T>(doFetch: () => Promise<Response>): Promise<T> {
  let res = await doFetch();
  if (res.status === 401 && (await tryRefresh())) {
    res = await doFetch();
  }
  return handle<T>(res);
}

export function apiGet<T>(url: string): Promise<T> {
  return withAuth<T>(() => fetch(url));
}

export function apiPost<T>(url: string, data: unknown): Promise<T> {
  return withAuth<T>(() =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export function apiPatch<T>(url: string, data: unknown): Promise<T> {
  return withAuth<T>(() =>
    fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export function apiPut<T>(url: string, data: unknown): Promise<T> {
  return withAuth<T>(() =>
    fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
}

export function apiDelete<T>(url: string): Promise<T> {
  return withAuth<T>(() => fetch(url, { method: "DELETE" }));
}

export function apiUpload(file: File): Promise<{ url: string }> {
  return withAuth<{ url: string }>(() => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch("/api/upload", { method: "POST", body: formData });
  });
}
