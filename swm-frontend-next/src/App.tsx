import { useState } from 'react';
import type { NavigationPage, Bin, ThresholdConfig } from './types';
import { DEFAULT_THRESHOLDS } from './lib/status';
import { useFirebaseBins } from './hooks/useFirebaseBins';
import { useTheme } from './hooks/useTheme';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPlaceholder } from './components/pages/OverviewPlaceholder';
import { BinsPlaceholder } from './components/pages/BinsPlaceholder';
import { RoutesPlaceholder } from './components/pages/RoutesPlaceholder';
import { AnalyticsPlaceholder } from './components/pages/AnalyticsPlaceholder';
import { SettingsPlaceholder } from './components/pages/SettingsPlaceholder';
import { BinDetailModal } from './components/modals/BinDetailModal';

export function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accessible theme management (light/dark with system sync and anti-flash)
  const { isDark, toggleTheme } = useTheme();

  // Real-time Firebase data stream
  const {
    bins,
    connectionStatus,
    lastSyncTime,
    refresh,
  } = useFirebaseBins();

  // Initialize thresholds from localStorage if existing, otherwise defaults
  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem('swm-thresholds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.critical === 'number') {
          return {
            normal: Number(parsed.normal) || DEFAULT_THRESHOLDS.normal,
            medium: Number(parsed.medium) || DEFAULT_THRESHOLDS.medium,
            warning: Number(parsed.warning) || DEFAULT_THRESHOLDS.warning,
            critical: Number(parsed.critical) || DEFAULT_THRESHOLDS.critical,
          };
        }
      }
    } catch {
      // Ignore storage errors
    }
    return DEFAULT_THRESHOLDS;
  });

  const handleUpdateThresholds = (newThresholds: ThresholdConfig) => {
    setThresholds(newThresholds);
    try {
      localStorage.setItem('swm-thresholds', JSON.stringify(newThresholds));
    } catch {
      // Ignore storage errors
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    refresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen bg-[#F7F8F5] dark:bg-[#000000] dark:bg-dot-grid flex flex-col antialiased text-[#202923] dark:text-[#F5F5F5] transition-colors duration-150 relative overflow-x-hidden w-full">
      {/* Aceternity UI Background Dots Grid Layer (Dark mode only, zero layout impact, non-blocking) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 hidden dark:block bg-dot-grid"
      />

      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        connectionStatus={connectionStatus}
        isDark={isDark}
      />

      {/* Main Content Area */}
      <div className="lg:pl-60 flex flex-col flex-1 relative z-10 w-full min-w-0">
        {/* Header Bar */}
        <Header
          currentPage={currentPage}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          connectionStatus={connectionStatus}
          lastSyncTime={lastSyncTime}
          isDark={isDark}
          onToggleTheme={toggleTheme}
        />

        {/* Page Content */}
        <main className="flex-1 p-3 sm:p-5 md:p-6 max-w-7xl w-full mx-auto relative z-10 min-w-0">
          {currentPage === 'dashboard' && (
            <OverviewPlaceholder
              bins={bins}
              thresholds={thresholds}
              connectionStatus={connectionStatus}
              onNavigate={setCurrentPage}
              onSelectBin={setSelectedBin}
              isDark={isDark}
            />
          )}

          {currentPage === 'bins' && (
            <BinsPlaceholder
              bins={bins}
              thresholds={thresholds}
              onSelectBin={setSelectedBin}
            />
          )}

          {currentPage === 'routes' && (
            <RoutesPlaceholder
              bins={bins}
              thresholds={thresholds}
              onSelectBin={setSelectedBin}
            />
          )}

          {currentPage === 'analytics' && (
            <AnalyticsPlaceholder
              bins={bins}
              thresholds={thresholds}
              onSelectBin={setSelectedBin}
            />
          )}

          {currentPage === 'settings' && (
            <SettingsPlaceholder
              thresholds={thresholds}
              onUpdateThresholds={handleUpdateThresholds}
              connectionStatus={connectionStatus}
              nodesCount={bins.length}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="py-3 px-6 border-t border-[#E3E8E1] dark:border-[#202020] bg-white dark:bg-[#000000] text-center text-[11px] text-[#848F87] dark:text-[#858585] transition-colors duration-150 relative z-10">
          Smart Campus Waste Management &bull; Environmental Operations Platform
        </footer>
      </div>

      {/* Bin Telemetry Inspector Modal */}
      <BinDetailModal
        bin={selectedBin}
        onClose={() => setSelectedBin(null)}
        thresholds={thresholds}
        onNavigateToRoute={() => {
          setSelectedBin(null);
          setCurrentPage('routes');
        }}
      />
    </div>
  );
}

export default App;
