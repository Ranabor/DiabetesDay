import React from 'react';
import { Sliders, RotateCcw, HelpCircle } from 'lucide-react';

/**
 * Scalable Controller Parameter Editor.
 *
 * Dynamically inspects any controller's `configurable_params` (whether defined
 * as rich schema descriptors or simple key-default pairs) and renders accessible,
 * customized input controls.
 */
export default function ControllerParamsEditor({
  controller,
  values = {},
  onChange,
  className = '',
  compact = false,
  title = null,
}) {
  if (!controller) return null;

  const paramsConfig = controller.configurable_params || {};
  const paramKeys = Object.keys(paramsConfig);

  // Helper to extract default value
  const getDefault = (key) => {
    const desc = paramsConfig[key];
    if (typeof desc === 'object' && desc !== null && 'default' in desc) {
      return desc.default;
    }
    return desc;
  };

  const handleResetDefaults = () => {
    const defaults = {};
    paramKeys.forEach((key) => {
      defaults[key] = getDefault(key);
    });
    onChange(defaults);
  };

  const handleChange = (key, rawVal) => {
    onChange({
      ...values,
      [key]: rawVal,
    });
  };

  if (paramKeys.length === 0) {
    return (
      <div className={`p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-500 italic ${className}`}>
        No adjustable parameters for this baseline controller.
      </div>
    );
  }

  return (
    <div className={`bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-3 ${className}`}>
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-brand-teal" />
          <span className="text-xs font-bold text-slate-800">
            {title || `${controller.display_name} Parameters`}
          </span>
        </div>
        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
          title="Reset parameters to algorithm defaults"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Defaults</span>
        </button>
      </div>

      <div className={`grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {paramKeys.map((key) => {
          const desc = paramsConfig[key];
          const isObj = typeof desc === 'object' && desc !== null;

          const label = isObj ? desc.label || key : key;
          const unit = isObj ? desc.unit || '' : '';
          const help = isObj ? desc.help || '' : '';
          const type = isObj ? desc.type || typeof desc.default : typeof desc;
          const min = isObj ? desc.min : undefined;
          const max = isObj ? desc.max : undefined;
          const step = isObj ? desc.step : undefined;
          const options = isObj ? desc.options || [] : [];

          const currentVal = values[key] !== undefined ? values[key] : getDefault(key);

          return (
            <div
              key={key}
              className="bg-white border border-slate-200/80 rounded-lg p-2 flex flex-col justify-between shadow-2xs"
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  {label}
                  {unit && <span className="text-[10px] text-slate-400 font-normal">({unit})</span>}
                </label>
                {help && (
                  <span title={help} className="cursor-help text-slate-400 hover:text-slate-600">
                    <HelpCircle className="w-3 h-3" />
                  </span>
                )}
              </div>

              {type === 'boolean' ? (
                <label className="inline-flex items-center gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(currentVal)}
                    onChange={(e) => handleChange(key, e.target.checked)}
                    className="w-4 h-4 rounded text-brand-crimson focus:ring-brand-crimson/30 border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    {currentVal ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              ) : type === 'select' ? (
                <select
                  value={currentVal}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={currentVal}
                    min={min}
                    max={max}
                    step={step || 'any'}
                    onChange={(e) => handleChange(key, Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
