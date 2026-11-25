import React from 'react';
import { Plus, Trash2, Clock, Utensils, Sparkles, ChevronDown } from 'lucide-react';
import defaultPresets from '../config/presets.json';

/**
 * Helper to convert minutes from midnight (0-1439) to "HH:MM" string.
 */
function minutesToTimeString(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Helper to convert "HH:MM" string to minutes from midnight.
 */
function timeStringToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function MealProtocolTable({
  meals = [],
  onChangeMeals,
  presets = defaultPresets,
  onSelectPreset = null,
  className = '',
}) {
  const handleMealChange = (index, field, value) => {
    const updated = [...meals];
    updated[index] = { ...updated[index], [field]: value };
    onChangeMeals(updated);
  };

  const handleTimeChange = (index, timeStr) => {
    handleMealChange(index, 'time_minutes', timeStringToMinutes(timeStr));
  };

  const handleAddMeal = () => {
    const lastMeal = meals[meals.length - 1];
    const newMinutes = lastMeal ? Math.min(1380, lastMeal.time_minutes + 180) : 720;
    const newMeal = {
      label: `Meal / Snack ${meals.length + 1}`,
      time_minutes: newMinutes,
      carbs_g: 30,
    };
    onChangeMeals([...meals, newMeal]);
  };

  const handleRemoveMeal = (index) => {
    if (meals.length <= 1) return;
    const updated = meals.filter((_, i) => i !== index);
    onChangeMeals(updated);
  };

  const handlePresetSelect = (presetId) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;
    onChangeMeals(preset.meals);
    if (onSelectPreset) {
      onSelectPreset(preset);
    }
  };

  const totalCarbs = meals.reduce((acc, m) => acc + (Number(m.carbs_g) || 0), 0);

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
      {/* Header with Title and Total CHO */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <Utensils className="w-4 h-4 text-brand-crimson" />
          <h3 className="font-semibold text-slate-900 text-sm">Meal Protocol (Carbs)</h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          Total: {totalCarbs}g CHO
        </span>
      </div>

      {/* Quick Preset Selector within the Meal Protocol Box */}
      <div className="mb-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Presets:</span>
        </div>
        <div className="relative flex-1 max-w-[240px]">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handlePresetSelect(e.target.value);
                e.target.value = '';
              }
            }}
            className="w-full appearance-none bg-white hover:bg-slate-50 border border-slate-300 rounded-lg pl-2.5 pr-7 py-1 text-xs font-medium text-slate-800 cursor-pointer focus:outline-none focus:ring-1 focus:ring-brand-crimson"
          >
            <option value="" disabled>
              Load Prepared Protocol...
            </option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Meals Table List */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
        {meals.map((meal, index) => (
          <div
            key={index}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-sm"
          >
            {/* Time input */}
            <div className="flex items-center gap-1 w-28 shrink-0">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="time"
                value={minutesToTimeString(meal.time_minutes)}
                onChange={(e) => handleTimeChange(index, e.target.value)}
                className="w-full bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
              />
            </div>

            {/* Label input */}
            <input
              type="text"
              value={meal.label}
              onChange={(e) => handleMealChange(index, 'label', e.target.value)}
              placeholder="Meal Label"
              className="flex-1 min-w-[100px] bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
            />

            {/* Carbs input */}
            <div className="flex items-center gap-1 w-24 shrink-0">
              <input
                type="number"
                min="0"
                max="300"
                value={meal.carbs_g}
                onChange={(e) => handleMealChange(index, 'carbs_g', Math.max(0, Number(e.target.value)))}
                className="w-16 bg-white border border-slate-300 rounded px-1.5 py-1 text-xs font-semibold text-right text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
              />
              <span className="text-xs text-slate-500 font-medium">g</span>
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => handleRemoveMeal(index)}
              disabled={meals.length <= 1}
              className="p-1 text-slate-400 hover:text-red-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
              title={meals.length <= 1 ? "At least one meal required" : "Remove meal"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAddMeal}
        className="mt-3 w-full py-1.5 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:border-slate-400 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add Meal / Snack
      </button>
    </div>
  );
}
