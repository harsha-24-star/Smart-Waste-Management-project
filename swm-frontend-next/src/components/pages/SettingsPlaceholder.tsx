import React, { useState } from 'react';
import { Settings, Sliders, Activity, Info, Check, RotateCcw } from 'lucide-react';
import type { ThresholdConfig, FirebaseConnectionStatus } from '../../types';
import { DEFAULT_THRESHOLDS } from '../../lib/status';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { ShimmerButton } from '../ui/shimmer-button';
import { Input } from '../ui/input';

interface SettingsPlaceholderProps {
  thresholds: ThresholdConfig;
  onUpdateThresholds: (thresholds: ThresholdConfig) => void;
  connectionStatus: FirebaseConnectionStatus;
  nodesCount: number;
}

export const SettingsPlaceholder: React.FC<SettingsPlaceholderProps> = ({
  thresholds,
  onUpdateThresholds,
  connectionStatus,
  nodesCount,
}) => {
  const [localValues, setLocalValues] = useState<ThresholdConfig>(thresholds);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    if (
      localValues.normal < 1 ||
      localValues.normal >= localValues.warning ||
      localValues.medium >= localValues.warning ||
      localValues.warning >= localValues.critical ||
      localValues.critical > 100
    ) {
      setFeedback('Error: Thresholds must follow logical order: Normal < Warning < Critical.');
      return;
    }
    onUpdateThresholds(localValues);
    setFeedback('Operational threshold preferences updated successfully.');
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReset = () => {
    setLocalValues(DEFAULT_THRESHOLDS);
    onUpdateThresholds(DEFAULT_THRESHOLDS);
    setFeedback('Thresholds restored to campus default settings.');
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 rounded-lg bg-white dark:bg-[#080808] border border-[#E3E8E1] dark:border-[#202020] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <h2 className="text-base sm:text-lg font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#245C43] dark:text-[#86B99A]" />
          System Settings &amp; Parameters
        </h2>
        <p className="text-xs text-[#5F6962] dark:text-[#858585] max-w-2xl mt-1 leading-relaxed">
          Configure operational fill thresholds and monitor telemetry stream parameters across campus waste facilities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* Fill Level Thresholds */}
        <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <CardHeader className="border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#245C43] dark:text-[#86B99A]" />
              Fill Level Thresholds
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
              Define fill percentage boundaries for operational status categories
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            {/* Safe */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs gap-2 xs:gap-4 pb-2.5 xs:pb-0 border-b xs:border-b-0 border-[#F0F2ED] dark:border-[#202020]">
              <div>
                <label className="font-semibold text-[#202923] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#245C43] dark:bg-[#86B99A]" /> Normal threshold
                </label>
                <span className="text-[11px] text-[#848F87] dark:text-[#858585]">Bins at or below this capacity are marked normal</span>
              </div>
              <div className="flex items-center gap-1.5 self-end xs:self-auto w-24 xs:w-20">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={localValues.normal}
                  onChange={(e) => setLocalValues({ ...localValues, normal: Number(e.target.value) })}
                  className="h-9 sm:h-8 text-xs font-mono font-bold tabular-nums text-center"
                />
                <span className="text-xs text-[#5F6962] dark:text-[#858585] font-medium">%</span>
              </div>
            </div>

            {/* Medium */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs gap-2 xs:gap-4 pb-2.5 xs:pb-0 border-b xs:border-b-0 border-[#F0F2ED] dark:border-[#202020]">
              <div>
                <label className="font-semibold text-[#202923] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2F5C78] dark:bg-[#7FA8C4]" /> Medium threshold
                </label>
                <span className="text-[11px] text-[#848F87] dark:text-[#858585]">Moderate fill requiring scheduled inspection</span>
              </div>
              <div className="flex items-center gap-1.5 self-end xs:self-auto w-24 xs:w-20">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={localValues.medium}
                  onChange={(e) => setLocalValues({ ...localValues, medium: Number(e.target.value) })}
                  className="h-9 sm:h-8 text-xs font-mono font-bold tabular-nums text-center"
                />
                <span className="text-xs text-[#5F6962] dark:text-[#858585] font-medium">%</span>
              </div>
            </div>

            {/* Warning */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs gap-2 xs:gap-4 pb-2.5 xs:pb-0 border-b xs:border-b-0 border-[#F0F2ED] dark:border-[#202020]">
              <div>
                <label className="font-semibold text-[#202923] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8F6B2A] dark:bg-[#D4AF67]" /> Nearly Full threshold
                </label>
                <span className="text-[11px] text-[#848F87] dark:text-[#858585]">Approaching limit; dispatches queued</span>
              </div>
              <div className="flex items-center gap-1.5 self-end xs:self-auto w-24 xs:w-20">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={localValues.warning}
                  onChange={(e) => setLocalValues({ ...localValues, warning: Number(e.target.value) })}
                  className="h-9 sm:h-8 text-xs font-mono font-bold tabular-nums text-center"
                />
                <span className="text-xs text-[#5F6962] dark:text-[#858585] font-medium">%</span>
              </div>
            </div>

            {/* Critical */}
            <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs gap-2 xs:gap-4 pb-2.5 xs:pb-0 border-b xs:border-b-0 border-[#F0F2ED] dark:border-[#202020]">
              <div>
                <label className="font-semibold text-[#202923] dark:text-[#F5F5F5] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#9E3E37] dark:bg-[#D9736C]" /> Critical threshold
                </label>
                <span className="text-[11px] text-[#848F87] dark:text-[#858585]">Capacity exceeded; initiates immediate priority collection</span>
              </div>
              <div className="flex items-center gap-1.5 self-end xs:self-auto w-24 xs:w-20">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={localValues.critical}
                  onChange={(e) => setLocalValues({ ...localValues, critical: Number(e.target.value) })}
                  className="h-9 sm:h-8 text-xs font-mono font-bold tabular-nums text-center"
                />
                <span className="text-xs text-[#5F6962] dark:text-[#858585] font-medium">%</span>
              </div>
            </div>

            {feedback && (
              <div className="p-2.5 rounded bg-[#F7F8F5] dark:bg-[#0A0A0A] text-xs font-medium text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2 border border-[#E3E8E1] dark:border-[#202020]">
                <Info className="w-4 h-4 text-[#245C43] dark:text-[#86B99A] shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <div className="pt-2 flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5">
              <ShimmerButton size="sm" onClick={handleSave} className="w-full xs:w-auto min-h-[40px] sm:min-h-0 justify-center">
                <Check className="w-3.5 h-3.5" />
                <span>Save Thresholds</span>
              </ShimmerButton>
              <Button size="sm" variant="outline" onClick={handleReset} className="w-full xs:w-auto min-h-[40px] sm:min-h-0 justify-center gap-1.5 text-xs font-medium border-[#E3E8E1] dark:border-[#202020] text-[#202923] dark:text-[#F5F5F5] hover:bg-[#F7F8F5] dark:hover:bg-[#0A0A0A]">
                <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operational Diagnostics */}
        <Card className="border-[#E3E8E1] dark:border-[#202020] dark:bg-[#080808] shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <CardHeader className="border-b border-[#E3E8E1] dark:border-[#202020] p-4 sm:p-5 pb-3">
            <CardTitle className="text-sm font-bold tracking-tight text-[#202923] dark:text-[#F5F5F5] flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#245C43] dark:text-[#86B99A]" />
              Telemetry Diagnostics
            </CardTitle>
            <CardDescription className="text-xs text-[#5F6962] dark:text-[#858585] mt-0.5 leading-relaxed">
              Connection status and active monitoring parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-3.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
              <span className="text-[#5F6962] dark:text-[#858585]">Connection Status</span>
              <span className={`font-semibold ${
                connectionStatus === 'connected' ? 'text-[#245C43] dark:text-[#86B99A]' :
                connectionStatus === 'connecting' ? 'text-[#8F6B2A] dark:text-[#D4AF67]' : 'text-[#9E3E37] dark:text-[#D9736C]'
              }`}>
                {connectionStatus === 'connected' ? 'Active & Synced' :
                 connectionStatus === 'connecting' ? 'Establishing Connection...' : 'Disconnected'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
              <span className="text-[#5F6962] dark:text-[#858585]">Monitored Waste Nodes</span>
              <span className="font-mono tabular-nums font-semibold text-[#202923] dark:text-[#F5F5F5]">{nodesCount} registered units</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#F0F2ED] dark:border-[#202020]">
              <span className="text-[#5F6962] dark:text-[#858585]">Telemetry Stream</span>
              <span className="font-semibold text-[#202923] dark:text-[#F5F5F5]">Real-time Event Listener</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-[#5F6962] dark:text-[#858585]">Threshold Configuration</span>
              <span className="font-semibold text-[#202923] dark:text-[#F5F5F5]">Active System Rule Set</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
