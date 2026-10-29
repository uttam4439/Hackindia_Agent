import React from 'react';
import { InvestigationStatus } from '../../types';
import { getRefundStatusMeta } from '../../utils/refundStatus';

interface StatusBadgeProps {
  status: InvestigationStatus | string | null | undefined;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const meta = getRefundStatusMeta(status);
  const isSmall = size === 'sm';
  const baseClasses = isSmall
    ? 'px-2 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center gap-1 border'
    : 'px-3 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5 border';

  return (
    <span
      role="status"
      aria-label={meta.accessibleDescription}
      title={meta.accessibleDescription}
      className={`${baseClasses} ${meta.badgeClass}`}
    >
      <span
        className={`material-symbols-outlined ${isSmall ? 'text-[13px]' : 'text-[15px]'}`}
        aria-hidden="true"
      >
        {meta.iconName}
      </span>
      <span>{meta.label}</span>
    </span>
  );
};

