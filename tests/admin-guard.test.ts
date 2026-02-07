/// <reference types="vitest" />
import { describe, expect, it } from 'vitest';

import { requireAdmin } from '@/lib/admin';

describe('admin guard', () => {
  it('blocks requests without the admin token', async () => {
    process.env.ADMIN_TOKEN = 'test-token';
    const request = new Request('http://localhost/api/admin/test');

    const response = requireAdmin(request);
    expect(response?.status).toBe(403);
  });

  it('allows requests with the admin token', async () => {
    process.env.ADMIN_TOKEN = 'test-token';
    const request = new Request('http://localhost/api/admin/test', {
      headers: {
        'x-admin-token': 'test-token'
      }
    });

    const response = requireAdmin(request);
    expect(response).toBeNull();
  });
});
