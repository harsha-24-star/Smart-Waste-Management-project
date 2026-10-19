import type { BinStatus, ThresholdConfig } from '../types';

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  normal: 40,
  medium: 60,
  warning: 80,
  critical: 90,
};

export function getBinStatus(fillLevel: number, thresholds: ThresholdConfig = DEFAULT_THRESHOLDS): BinStatus {
  const level = Number(fillLevel) || 0;

  if (level >= thresholds.critical) {
    return {
      tier: 'critical',
      label: 'Critical',
      badgeClass: 'bg-[#FAECEB] text-[#9E3E37] border-[#ECCDCB] dark:bg-[#1F0D0D] dark:text-[#D9736C] dark:border-[#331616]',
      dotClass: 'bg-[#9E3E37] dark:bg-[#D9736C]',
      priority: 'HIGH',
      risk: 'High',
    };
  } else if (level >= thresholds.warning) {
    return {
      tier: 'warning',
      label: 'Nearly Full',
      badgeClass: 'bg-[#FAF3E7] text-[#8F6B2A] border-[#EEDCC0] dark:bg-[#1C1508] dark:text-[#D4AF67] dark:border-[#2E230E]',
      dotClass: 'bg-[#8F6B2A] dark:bg-[#D4AF67]',
      priority: 'MEDIUM',
      risk: 'Elevated',
    };
  } else if (level >= thresholds.medium || level > thresholds.normal) {
    return {
      tier: 'medium',
      label: 'Medium',
      badgeClass: 'bg-[#EAF2F7] text-[#2F5C78] border-[#C6DDEB] dark:bg-[#0E161F] dark:text-[#7FA8C4] dark:border-[#162635]',
      dotClass: 'bg-[#2F5C78] dark:bg-[#7FA8C4]',
      priority: 'LOW',
      risk: 'Moderate',
    };
  } else {
    return {
      tier: 'normal',
      label: 'Normal',
      badgeClass: 'bg-[#E7EFE8] text-[#245C43] border-[#CBDDCF] dark:bg-[#0E1A13] dark:text-[#86B99A] dark:border-[#172D20]',
      dotClass: 'bg-[#245C43] dark:bg-[#86B99A]',
      priority: 'NONE',
      risk: 'Nominal',
    };
  }
}
