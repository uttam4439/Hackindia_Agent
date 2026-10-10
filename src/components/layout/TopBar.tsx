import React, { useState, useRef, useEffect } from 'react';
import { useInvestigation } from '../../context/InvestigationContext';

interface TopBarProps {
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { searchQuery, setSearchQuery, setIsSearchModalOpen } = useInvestigation();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showNotifications) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    // Listen to both mousedown (desktop) and touchstart (mobile)
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-md lg:px-space-xl border-b border-surface-container-high/60">
      <div className="flex items-center gap-space-sm flex-1 max-w-xl">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          aria-label="Open menu"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        {/* Global Search Pill */}
        <div
          onClick={() => setIsSearchModalOpen(true)}
          className="flex items-center gap-space-xs w-full bg-surface-container-lowest rounded-full px-space-md py-1.5 shadow-sm border border-surface-container hover:border-outline-variant transition-all cursor-pointer group"
        >
          <span className="material-symbols-outlined text-on-surface-variant text-[20px] group-hover:text-primary transition-colors">
            search
          </span>
          <input
            className="bg-transparent w-full text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none font-body-sm text-body-sm cursor-pointer"
            placeholder="Search bookings, PNR, carrier, or refund ID..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            readOnly
          />
          <div className="hidden sm:flex px-2 py-0.5 rounded-full bg-surface-container-low text-on-surface-variant font-code-sm text-code-sm uppercase border border-surface-container-high shrink-0">
            ⌘K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-space-sm lg:gap-space-lg">
        {/* Notifications Button & Dropdown Container */}
        <div ref={notificationRef} className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            type="button"
            title="Notifications"
            aria-expanded={showNotifications}
            aria-haspopup="true"
            aria-label="Toggle notifications panel"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container ring-2 ring-surface-container-lowest"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-container-lowest shadow-xl border border-surface-container-high p-space-md z-50 animate-fade-in"
              role="region"
              aria-label="Auditor Alerts"
            >
              <div className="flex items-center justify-between pb-2 border-b border-surface-container mb-3">
                <span className="font-headline-sm text-[15px] font-bold text-on-surface">Auditor Alerts</span>
                <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-on-primary-container font-label-sm text-[11px] font-bold">
                  2 Pending
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-error mt-1.5 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-semibold text-on-surface">
                      High-Risk Investigation #RF-1042 Flagged
                    </span>
                    <span className="text-[11px] text-on-surface-variant mt-0.5">
                      Conflicting carrier logs require senior auditor authorization.
                    </span>
                    <span className="text-[10px] text-outline font-code-sm mt-1">12 mins ago</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-primary-container mt-1.5 shrink-0"></span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-xs font-semibold text-on-surface">
                      Case #AT-9842 Ready for Authorization
                    </span>
                    <span className="text-[11px] text-on-surface-variant mt-0.5">
                      Full refund of ₹9,450 recommended under DGCA policy.
                    </span>
                    <span className="text-[10px] text-outline font-code-sm mt-1">28 mins ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-space-sm pl-space-xs border-l border-surface-container-high/60">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 shadow-xs">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="font-label-md text-label-md font-semibold text-on-surface leading-tight">
              Julian Hayes
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">
              Lead Auditor
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
