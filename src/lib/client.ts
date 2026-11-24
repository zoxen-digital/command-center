"use client";
import { useCallback, useEffect, useState } from "react";

export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (res.status === 401 && window.location.pathname !== "/login") window.location.assign("/login");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error || `Request failed (${res.status})`);
  if (method !== "GET") window.dispatchEvent(new Event("zx:changed"));
  return data as T;
}

/** Fetch JSON and refetch whenever any change happens anywhere in the app. */
export function useApi<T = any>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!url) return;
    try {
      setData(await api<T>(url));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [url]);
  useEffect(() => {
    setLoading(true);
    load();
    const on = () => load();
    window.addEventListener("zx:changed", on);
    window.addEventListener("focus", on);
    return () => {
      window.removeEventListener("zx:changed", on);
      window.removeEventListener("focus", on);
    };
  }, [load]);
  return { data, error, loading, reload: load, setData };
}

/** Today's date in the browser (matches the server's timezone for a local user). */
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Show a system notification. Android Chrome needs the service worker for this; desktop can use the constructor. */
export async function showNotice(title: string, body: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const opts = { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  } catch {}
  try { new Notification(title, opts); } catch {}
}
