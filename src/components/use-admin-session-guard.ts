'use client';

import { useEffect, useState } from 'react';

type SessionResponse = {
  authenticated?: boolean;
  is_admin?: boolean;
};

export function useAdminSessionGuard() {
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const response = await fetch('/api/admin/auth/session', { cache: 'no-store' });
        const body = (await response.json()) as SessionResponse;
        if (!response.ok || !body.authenticated || !body.is_admin) {
          window.location.href = '/admin/login';
          return;
        }
        if (!cancelled) setSessionReady(true);
      } catch {
        window.location.href = '/admin/login';
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  return sessionReady;
}
