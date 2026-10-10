import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md' }) => {
  const isSmall = size === 'sm';
  const baseClasses = isSmall
    ? 'px-2 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center gap-1 uppercase tracking-wider'
    : 'px-2.5 py-1 text-xs font-semibold rounded-full inline-flex items-center gap-1.5';

  switch (level) {
    case 'Low Risk':
      return (
        <span className={`${baseClasses} bg-primary-container/20 text-on-primary-container`}>
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
          <span>Low Risk</span>
        </span>
      );
    case 'Medium Risk':
      return (
        <span className={`${baseClasses} bg-secondary-fixed text-on-secondary-fixed`}>
          <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
          <span>Medium Risk</span>
        </span>
      );
    case 'High Risk':
      return (
        <span className={`${baseClasses} bg-error-container text-on-error-container font-bold`}>
          <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
          <span>High Risk</span>
        </span>
      );
    case 'Insufficient Evidence':
      return (
        <span className={`${baseClasses} bg-surface-container-highest text-on-surface`}>
          <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
          <span>Insufficient Evidence</span>
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} bg-surface-container text-on-surface`}>
          <span>{level}</span>
        </span>
      );
  }
};
