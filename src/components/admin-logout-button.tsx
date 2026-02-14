'use client';

import { useState } from 'react';

type AdminLogoutButtonProps = {
  className?: string;
};

export function AdminLogoutButton({ className }: AdminLogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/admin/auth/logout', {
        method: 'POST',
        cache: 'no-store'
      });
    } finally {
      window.location.href = '/admin/login';
    }
  };

  return (
    <button type="button" className={className} onClick={handleLogout} disabled={loading}>
      {loading ? 'Logging Out...' : 'Logout'}
    </button>
  );
}
