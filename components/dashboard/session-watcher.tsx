"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Session-expiration handling for the dashboard. The proxy protects every
 * server request; this covers the long-idle browser tab: when the session
 * can no longer be refreshed, the couple is returned to /login with a
 * gentle "session expired" notice instead of watching saves fail.
 */
export function SessionWatcher() {
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let redirected = false;

    const toLogin = () => {
      if (redirected || !location.pathname.startsWith("/dashboard")) return;
      redirected = true;
      location.replace("/login?expired=1");
    };

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) toLogin();
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") toLogin();
    });

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);

    return () => {
      sub.subscription.unsubscribe();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
