import React from 'react';
import { Sliders, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

export default function SimParamsDrawer({
  params,
  onChangeParams,
  sensors = ['GuardianRT', 'Dexcom', 'Navigator'],
  pumps = ['Insulet', 'Cozmo'],
  isOpen,
  onToggle,
  className = '',
}) {
  const handleRandomizeSeed = () => {
    onChangeParams({ ...params, seed: Math.floor(Math.random() * 10000) });
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {/* Toggle Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-brand-teal" />
          <span className="font-semibold text-slate-900 text-sm">Simulation Environment Parameters</span>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <span>{params.sensor} • {params.pump} • {params.duration_hours}h</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Hardware Config */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">CGM Sensor Model</label>
              <select
                value={params.sensor}
                onChange={(e) => onChangeParams({ ...params, sensor: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                {sensors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Insulin Pump Model</label>
              <select
                value={params.pump}
                onChange={(e) => onChangeParams({ ...params, pump: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                {pumps.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Horizon Duration</label>
              <select
                value={params.duration_hours}
                onChange={(e) => onChangeParams({ ...params, duration_hours: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                <option value={12}>12 Hours (Half-Day)</option>
                <option value={24}>24 Hours (Full-Day Standard)</option>
                <option value={48}>48 Hours (2 Days Multi-Cycle)</option>
                <option value={72}>72 Hours (3 Days Extended)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Time (Hour of Day)</label>
              <select
                value={params.start_time_hour}
                onChange={(e) => onChangeParams({ ...params, start_time_hour: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                <option value={0}>00:00 (Midnight)</option>
                <option value={6}>06:00 (Morning)</option>
                <option value={12}>12:00 (Noon)</option>
                <option value={18}>18:00 (Evening)</option>
              </select>
            </div>
          </div>

          {/* Seed & Noise Quality */}
          <div className="space-y-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Stochastic Seed</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={params.seed}
                  onChange={(e) => onChangeParams({ ...params, seed: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                />
                <button
                  type="button"
                  onClick={handleRandomizeSeed}
                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-slate-700 transition-colors"
                  title="Generate new random seed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sensor Noise</label>
              <label className="flex items-center gap-2 cursor-pointer mt-1.5">
                <input
                  type="checkbox"
                  checked={params.sensor_noise}
                  onChange={(e) => onChangeParams({ ...params, sensor_noise: e.target.checked })}
                  className="rounded text-brand-crimson focus:ring-brand-crimson w-4 h-4"
                />
                <span className="text-slate-700 font-medium text-xs">
                  {params.sensor_noise ? 'Realistic Stochastic Noise' : 'Clean Exhibition Curve (No Noise)'}
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
