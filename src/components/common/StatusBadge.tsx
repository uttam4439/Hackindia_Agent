import React from 'react';
import { InvestigationStatus } from '../../types';

interface StatusBadgeProps {
  status: InvestigationStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSmall = size === 'sm';
  const baseClasses = isSmall
    ? 'px-2 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center gap-1'
    : 'px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5';

  switch (status) {
    case 'Approved':
    case 'Disbursed':
      return (
        <span className={`${baseClasses} bg-primary-container text-on-primary-container`}>
          <span className="material-symbols-outlined text-[13px]">check</span>
          <span>{status}</span>
        </span>
      );
    case 'Ready for Payout':
      return (
        <span className={`${baseClasses} bg-primary-fixed/40 text-on-primary-fixed-variant`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
          <span>Ready for Payout</span>
        </span>
      );
    case 'Under Human Review':
    case 'Pending Human Approval':
      return (
        <span className={`${baseClasses} bg-secondary-fixed text-on-secondary-fixed`}>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
          <span>{status}</span>
        </span>
      );
    case 'Awaiting Carrier Evidence':
    case 'Audit In Progress':
      return (
        <span className={`${baseClasses} bg-surface-container-high text-on-surface`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
          <span>{status}</span>
        </span>
      );
    case 'Auto-Filed TDR':
      return (
        <span className={`${baseClasses} bg-secondary-fixed-dim/40 text-on-secondary-fixed-variant`}>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary-container"></span>
          <span>Auto-Filed TDR</span>
        </span>
      );
    case 'Flagged':
    case 'Rejected':
      return (
        <span className={`${baseClasses} bg-error-container text-on-error-container`}>
          <span className="material-symbols-outlined text-[13px]">block</span>
          <span>{status}</span>
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-surface-container text-on-surface`}>
          <span>{status}</span>
        </span>
      );
  }
};
