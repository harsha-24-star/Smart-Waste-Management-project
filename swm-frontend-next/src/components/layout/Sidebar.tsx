import React from 'react';
import { 
  Trash2, 
  LayoutDashboard, 
  Package, 
  Route, 
  BarChart3, 
  Settings, 
  Calendar,
  X 
} from 'lucide-react';
import type { NavigationPage, FirebaseConnectionStatus } from '../../types';
import { cn } from '../../lib/utils';
import { Particles } from '../ui/particles';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: FirebaseConnectionStatus;
  isDark?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
  connectionStatus,
  isDark,
}) => {
  const [currentDate] = React.useState(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  });

  // Manage body scroll locking and Escape key dismiss on mobile screens
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isOpen, onClose]);

  const navItems = [
    { section: 'Monitoring', items: [
      { id: 'dashboard' as NavigationPage, label: 'Overview', icon: LayoutDashboard },
      { id: 'bins' as NavigationPage, label: 'Bin Monitoring', icon: Package },
    ]},
    { section: 'Operations', items: [
      { id: 'routes' as NavigationPage, label: 'Collection Routes', icon: Route },
      { id: 'analytics' as NavigationPage, label: 'Analytics & Horizons', icon: BarChart3 },
    ]},
    { section: 'System', items: [
      { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
    ]},
  ];

  return (
    <>
      {/* Mobile Backdrop with smooth fade */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 dark:bg-black/80 z-40 lg:hidden backdrop-blur-[2px] transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        role="dialog"
        aria-modal={isOpen ? 'true' : undefined}
        aria-label="Main Navigation Menu"
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 sm:w-60 bg-white dark:bg-[#000000] border-r border-[#E3E8E1] dark:border-[#202020] flex flex-col transition-transform duration-250 ease-out lg:translate-x-0 overflow-hidden shadow-xl lg:shadow-none',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Subtle Ambient Dust Particles in Sidebar (Pure black background, gentle slow drift, low density) */}
        <Particles
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-35 dark:opacity-40"
          quantity={14}
          size={0.4}
          staticity={50}
          ease={70}
          color={isDark ? '#86B99A' : '#3E8063'}
          vx={0.012}
          vy={-0.018}
        />

        {/* Brand Header */}
        <div className="relative z-10 h-14 sm:h-16 px-4 border-b border-[#E3E8E1] dark:border-[#202020] flex items-center justify-between bg-white/95 dark:bg-[#000000]/90 backdrop-blur-[2px]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-[#245C43] dark:bg-[#86B99A] text-white dark:text-[#000000] flex items-center justify-center shadow-[0_1px_2px_rgba(0,0,0,0.06)] font-bold">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] leading-none">
                Smart Waste
              </h2>
              <span className="text-[10px] font-semibold text-[#5F6962] dark:text-[#858585] tracking-wider uppercase mt-0.5 block">
                Campus Operations
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 text-[#5F6962] dark:text-[#858585] hover:text-[#202923] dark:hover:text-[#F5F5F5] lg:hidden rounded-md cursor-pointer transition-colors"
            aria-label="Close navigation menu"
          >
            <div className="h-7 w-7 rounded border border-[#E3E8E1] dark:border-[#202020] flex items-center justify-center">
              <X className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="relative z-10 flex-1 px-2.5 py-4 space-y-5 overflow-y-auto">
          {navItems.map((group) => (
            <div key={group.section} className="space-y-0.5">
              <div className="px-2.5 text-[10px] font-bold tracking-wider text-[#848F87] dark:text-[#858585] uppercase mb-1.5">
                {group.section}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 sm:py-1.5 rounded-md text-xs sm:text-[13px] font-medium transition-colors text-left cursor-pointer min-h-[44px] sm:min-h-[36px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#245C43] dark:focus-visible:ring-[#86B99A]',
                      isActive
                        ? 'bg-[#E7EFE8] dark:bg-[#0E1612] text-[#245C43] dark:text-[#86B99A] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)] border-l-2 border-[#245C43] dark:border-[#86B99A]'
                        : 'text-[#5F6962] dark:text-[#B3B3B3] hover:bg-[#F0F2ED] dark:hover:bg-[#0A0A0A] hover:text-[#202923] dark:hover:text-[#F5F5F5]'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#245C43] dark:text-[#86B99A]' : 'text-[#848F87] dark:text-[#858585]')} />
                    <span className="leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Status Footer */}
        <div className="relative z-10 p-3 border-t border-[#E3E8E1] dark:border-[#202020] bg-white/95 dark:bg-[#000000]/90 backdrop-blur-[2px]">
          <div className="p-2.5 rounded-md bg-[#F7F8F5] dark:bg-[#080808] border border-[#E3E8E1] dark:border-[#202020] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[#5F6962] dark:text-[#858585] text-[11px] font-medium tabular-nums">
              <Calendar className="w-3 h-3 text-[#848F87] dark:text-[#858585]" />
              {currentDate}
            </span>
            <div className="flex items-center gap-1.5 font-medium">
              <span className={cn(
                'w-2 h-2 rounded-full',
                connectionStatus === 'connected' ? 'bg-[#245C43] dark:bg-[#86B99A]' :
                connectionStatus === 'connecting' ? 'bg-[#8F6B2A] dark:bg-[#D4AF67] animate-pulse' : 'bg-[#9E3E37] dark:bg-[#D9736C]'
              )} />
              <span className={cn(
                'text-[11px]',
                connectionStatus === 'connected' ? 'text-[#245C43] dark:text-[#86B99A]' :
                connectionStatus === 'connecting' ? 'text-[#8F6B2A] dark:text-[#D4AF67]' : 'text-[#9E3E37] dark:text-[#D9736C]'
              )}>
                {connectionStatus === 'connected' ? 'Connected' :
                 connectionStatus === 'connecting' ? 'Connecting' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
