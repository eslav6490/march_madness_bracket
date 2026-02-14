/// <reference types="vitest" />
import fs from 'fs';

import { describe, expect, it } from 'vitest';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { AdminPoolNav } from '@/components/admin-pool-nav';

describe('FEAT-016 admin pool navigation', () => {
  it('renders breadcrumb and pool-aware subnav with active state', () => {
    const html = renderToStaticMarkup(createElement(AdminPoolNav, { poolId: 'pool-123', activeKey: 'payouts' }));

    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('Pool pool-123');
    expect(html).toContain('href="/admin/pool/pool-123/games"');
    expect(html).toContain('href="/admin/pool/pool-123/payouts"');
    expect(html).toContain('href="/admin/pool/pool-123/audit"');
    expect(html).toContain('aria-current="page">Payouts</a>');
  });

  it('uses shared admin pool nav on games/payouts/audit pages', async () => {
    const gamesSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/games/page.tsx', 'utf8');
    const payoutsSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/payouts/page.tsx', 'utf8');
    const auditSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/audit/page.tsx', 'utf8');

    expect(gamesSource).toContain('<AdminPoolNav poolId={params.poolId} activeKey="games" />');
    expect(payoutsSource).toContain('<AdminPoolNav poolId={params.poolId} activeKey="payouts" />');
    expect(auditSource).toContain('<AdminPoolNav poolId={params.poolId} activeKey="audit" />');
  });
});

describe('FEAT-017/018 admin lock gating and loading UX', () => {
  it('includes lock-state reason text and loading/busy states on admin pages', async () => {
    const adminSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/page.tsx', 'utf8');
    const gamesSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/games/page.tsx', 'utf8');
    const payoutsSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/payouts/page.tsx', 'utf8');
    const auditSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/pool/[poolId]/audit/page.tsx', 'utf8');

    expect(adminSource).toContain('Pool Status');
    expect(adminSource).toContain('Pool is locked; participants cannot be changed.');
    expect(adminSource).toContain('Pool is locked; assignments cannot be changed.');
    expect(adminSource).toContain('Pool is locked; digit changes are disabled.');
    expect(adminSource).toContain('Loading pool grid');
    expect(adminSource).toContain('Adding...');
    expect(adminSource).toContain('Saving...');
    expect(adminSource).toContain('Randomizing...');

    expect(gamesSource).toContain('Pool is locked; game create/update/delete actions are disabled.');
    expect(gamesSource).toContain('Loading games');
    expect(gamesSource).toContain('Refreshing games...');
    expect(gamesSource).toContain('Creating...');

    expect(payoutsSource).toContain('Pool is locked; payouts cannot be changed.');
    expect(payoutsSource).toContain('Loading payouts');
    expect(payoutsSource).toContain('Saving...');

    expect(auditSource).toContain('Loading audit events');
    expect(auditSource).toContain('Loading More...');
  });
});

describe('FEAT-019/020 responsive grid + admin participant tools', () => {
  it('uses horizontal scroll wrappers and analytics digit headers for public views', async () => {
    const homeSource = await fs.promises.readFile('/root/march_madness_bracket/app/page.tsx', 'utf8');
    const analyticsSource = await fs.promises.readFile(
      '/root/march_madness_bracket/app/pool/[poolId]/analytics/analytics-client.tsx',
      'utf8'
    );
    const cssSource = await fs.promises.readFile('/root/march_madness_bracket/app/globals.css', 'utf8');

    expect(homeSource).toContain('className="scroll-x"');
    expect(homeSource).toContain('grid--fixed');
    expect(analyticsSource).toContain('heatmap-grid--with-headers');
    expect(analyticsSource).toContain('role="columnheader"');
    expect(analyticsSource).toContain('role="rowheader"');
    expect(cssSource).toContain('.scroll-x');
    expect(cssSource).toContain('.grid--fixed');
    expect(cssSource).toContain('.heatmap-header-cell');
  });

  it('adds participant search/filter/sort controls and unassigned-squares mode in admin', async () => {
    const adminSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/page.tsx', 'utf8');

    expect(adminSource).toContain('placeholder="Search participants"');
    expect(adminSource).toContain('Name A→Z');
    expect(adminSource).toContain('Name Z→A');
    expect(adminSource).toContain('Squares descending');
    expect(adminSource).toContain('Squares ascending');
    expect(adminSource).toContain('Show only participants with 0 squares');
    expect(adminSource).toContain('participants shown');
    expect(adminSource).toContain('Show only unassigned squares');
    expect(adminSource).toContain('unassigned squares remaining');
    expect(adminSource).toContain('cell--dimmed');
  });
});

describe('grid label cleanup and audit pagination stability', () => {
  it('removes per-square row/col labels from public and admin grids', async () => {
    const homeSource = await fs.promises.readFile('/root/march_madness_bracket/app/page.tsx', 'utf8');
    const adminSource = await fs.promises.readFile('/root/march_madness_bracket/app/admin/page.tsx', 'utf8');

    expect(homeSource).not.toContain('<span>Row {rowIndex}, Col {colIndex}</span>');
    expect(adminSource).not.toContain('<span>Row {rowIndex}, Col {colIndex}</span>');
  });

  it('uses stable cursor refs in audit pagination to avoid reset-load loops', async () => {
    const auditSource = await fs.promises.readFile(
      '/root/march_madness_bracket/app/admin/pool/[poolId]/audit/page.tsx',
      'utf8'
    );

    expect(auditSource).toContain('const cursorRef = useRef<Cursor>(null);');
    expect(auditSource).toContain("const useCursor = mode === 'more' ? cursorOverride ?? cursorRef.current : null;");
    expect(auditSource).toContain('cursorRef.current = nextCursor;');
    expect(auditSource).toContain("onClick={() => load('more')}");
  });
});
