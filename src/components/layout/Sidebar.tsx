import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const location = useLocation();

  const navItems = [
    {
      name: 'Overview',
      path: '/dashboard',
      icon: 'grid_view',
      activeExact: true,
    },
    {
      name: 'Bookings',
      path: '/bookings',
      icon: 'flight_takeoff',
    },
    {
      name: 'Refund Investigations',
      path: '/refund-investigations',
      icon: 'policy',
      indicator: true,
    },
    {
      name: 'Reviews',
      path: '/reviews',
      icon: 'rate_review',
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: 'monitoring',
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: 'settings',
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex flex-col justify-between py-space-md transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col gap-space-lg">
          {/* Brand Header */}
          <div className="px-space-lg flex items-center justify-between h-10">
            <NavLink
              to="/"
              className="flex items-center gap-space-sm group"
              onClick={() => {
                onClose?.();
                window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
              }}
            >
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center text-on-primary-container font-bold shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[20px]">smart_toy</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-bold">
                Agent Travel
              </span>
            </NavLink>

            {/* Mobile Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 rounded-md text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1">
            <div className="px-space-lg pb-1">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-outline font-semibold">
                Audit Operations
              </span>
            </div>

            <nav className="flex flex-col gap-space-xs px-space-sm">
              {navItems.map((item) => {
                const isActive =
                  item.activeExact
                    ? location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/overview')
                    : location.pathname.startsWith(item.path);

                const dataPath = item.path.replace('/', '') || 'overview';

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      onClose?.();
                      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    }}
                    data-path={dataPath}
                    className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md transition-all ${
                      isActive
                        ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="flex-1">{item.name}</span>
                    {item.indicator && (
                      <span className={`h-2 w-2 rounded-full ${isActive ? 'bg-on-primary-container' : 'bg-primary-container'}`}></span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tenant Information Footer */}
        <div className="px-space-sm">
          <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between gap-space-xs border border-surface-container-high/60">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary font-bold font-label-md text-label-md shrink-0">
                <span className="material-symbols-outlined text-[18px]">corporate_fare</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                  Acme Travel Corp
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                  Global Tier 1
                </span>
              </div>
            </div>
            <button
              className="text-on-surface-variant hover:text-on-surface p-1 rounded transition-colors"
              type="button"
              title="Switch Organization"
            >
              <span className="material-symbols-outlined text-[18px]">unfold_more</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
