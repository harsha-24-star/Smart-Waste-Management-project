import React from 'react';
import { Menu, RefreshCw, AlertCircle, Sun, Moon } from 'lucide-react';
import type { NavigationPage, PageMeta, FirebaseConnectionStatus } from '../../types';
import { Button } from '../ui/button';

interface HeaderProps {
  currentPage: NavigationPage;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  connectionStatus: FirebaseConnectionStatus;
  lastSyncTime: Date | null;
  isDark: boolean;
  onToggleTheme: () => void;
}

const PAGE_METAS: Record<NavigationPage, PageMeta> = {
  dashboard: {
    title: 'Operations Overview',
    subtitle: 'Campus fill levels, priority alerts, and collection scheduling',
  },
  bins: {
    title: 'Bin Monitoring',
    subtitle: 'Fill levels, location directory, and individual bin status',
  },
  routes: {
    title: 'Collection Routes',
    subtitle: 'Priority-sequenced collection route departing from Central Fleet Depot',
  },
  analytics: {
    title: 'Analytics & Depletion Horizons',
    subtitle: 'Fill projections, overflow estimates, and fleet capacity comparison',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Operational fill thresholds and system parameters',
  },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onOpenMobileMenu,
  onRefresh,
  isRefreshing,
  connectionStatus,
  lastSyncTime,
  isDark,
  onToggleTheme,
}) => {
  const meta = PAGE_METAS[currentPage] || PAGE_METAS.dashboard;

  const formattedSyncTime = lastSyncTime
    ? lastSyncTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  return (
    <header className="h-14 sm:h-16 px-3 sm:px-6 bg-white dark:bg-[#000000] backdrop-blur-md border-b border-[#E3E8E1] dark:border-[#202020] flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Left: Mobile trigger & Titles */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden text-[#5F6962] dark:text-[#858585] border-[#E3E8E1] dark:border-[#202020] hover:bg-[#F0F2ED] dark:hover:bg-[#0A0A0A] dark:hover:text-[#F5F5F5] min-h-[44px] min-w-[44px] h-10 w-10 sm:h-8 sm:w-8 shrink-0 cursor-pointer"
          aria-label="Open navigation menu"
          title="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </Button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-bold text-[#202923] dark:text-[#F5F5F5] tracking-tight leading-tight truncate">
              {meta.title}
            </h1>

            {/* Warning only when connection fails */}
            {connectionStatus === 'error' && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#FAECEB] dark:bg-[#1F0D0D] text-[#9E3E37] dark:text-[#D9736C] border border-[#ECCDCB] dark:border-[#331616] shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-[#9E3E37] dark:text-[#D9736C]" />
                Interrupted
              </span>
            )}
          </div>
          <p className="text-xs text-[#5F6962] dark:text-[#858585] hidden md:block leading-normal mt-0.5 truncate">
            {meta.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Theme Toggle, Last Updated & Refresh */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {formattedSyncTime && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F7F8F5] dark:bg-[#0A0A0A] border border-[#E3E8E1] dark:border-[#202020] text-xs text-[#5F6962] dark:text-[#858585]">
            <span className="text-[11px]">Last updated:</span>
            <span className="font-mono tabular-nums font-semibold text-[#202923] dark:text-[#F5F5F5]">{formattedSyncTime}</span>
          </div>
        )}

        {/* Accessible Theme Toggle (Light/Dark with Sun/Moon) */}
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleTheme}
          className="border-[#E3E8E1] dark:border-[#202020] hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] text-[#202923] dark:text-[#F5F5F5] min-h-[44px] min-w-[44px] h-10 w-10 sm:h-8 sm:w-8 shrink-0 cursor-pointer"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#D4AF67] transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#5F6962] transition-transform hover:-rotate-12" />
          )}
        </Button>

        {/* Telemetry Refresh Action */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="h-10 sm:h-8 px-2.5 sm:px-3 min-h-[44px] sm:min-h-0 gap-1.5 text-xs text-[#202923] dark:text-[#F5F5F5] border-[#E3E8E1] dark:border-[#202020] hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A] shrink-0 cursor-pointer"
          title="Refresh telemetry"
          aria-label="Refresh telemetry data"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[#5F6962] dark:text-[#858585] ${isRefreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>
    </header>
  );
};
