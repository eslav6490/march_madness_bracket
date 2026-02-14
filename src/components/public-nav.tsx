import React from 'react';

type PublicNavKey = 'grid' | 'payouts' | 'results' | 'analytics';

type PublicNavProps = {
  poolId: string;
  activeKey: PublicNavKey;
};

type PublicNavLink = {
  key: PublicNavKey;
  label: string;
  href: string;
};

export function PublicNav({ poolId, activeKey }: PublicNavProps) {
  const links: PublicNavLink[] = [
    { key: 'grid', label: 'Grid', href: '/' },
    { key: 'payouts', label: 'Payouts', href: '/payouts' },
    { key: 'results', label: 'Results', href: `/pool/${poolId}/results` },
    { key: 'analytics', label: 'Analytics', href: `/pool/${poolId}/analytics` }
  ];

  return (
    <nav className="page-nav" aria-label="Public pages">
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
    </nav>
  );
}
