import React from 'react';

type AdminPoolNavKey = 'games' | 'payouts' | 'audit';

type AdminPoolNavProps = {
  poolId: string;
  activeKey: AdminPoolNavKey;
};

type AdminPoolLink = {
  key: AdminPoolNavKey;
  label: string;
  href: string;
};

const labels: Record<AdminPoolNavKey, string> = {
  games: 'Games',
  payouts: 'Payouts',
  audit: 'Audit'
};

export function AdminPoolNav({ poolId, activeKey }: AdminPoolNavProps) {
  const links: AdminPoolLink[] = [
    { key: 'games', label: 'Games', href: `/admin/pool/${poolId}/games` },
    { key: 'payouts', label: 'Payouts', href: `/admin/pool/${poolId}/payouts` },
    { key: 'audit', label: 'Audit', href: `/admin/pool/${poolId}/audit` }
  ];

  return (
    <div className="stack">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="/admin">Admin</a>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span>Pool {poolId}</span>
        <span className="breadcrumb__sep" aria-hidden="true">
          /
        </span>
        <span aria-current="page">{labels[activeKey]}</span>
      </nav>
      <nav className="page-nav" aria-label="Admin pool tools">
        {links.map((link) => {
          const isActive = link.key === activeKey;
          return (
            <a
              key={link.key}
              className={`button-link button-secondary page-nav__link ${isActive ? 'page-nav__link--active' : ''}`}
              href={link.href}
              aria-current={isActive ? 'page' : undefined}
            >
              {link.label}
            </a>
          );
        })}
        <a className="button-link button-secondary page-nav__link" href="/admin">
          Back to Admin
        </a>
      </nav>
    </div>
  );
}
