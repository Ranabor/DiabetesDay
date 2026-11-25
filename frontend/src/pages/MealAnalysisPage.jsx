import React, { useState, useEffect } from 'react';
import {
  Utensils,
  Play,
  Plus,
  Trash2,
  Clock,
  BookmarkPlus,
  Save,
  Check,
  FolderOpen,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import PatientCard from '../components/PatientCard';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import foodsData from '../config/foods.json';
import defaultPresets from '../config/presets.json';

const SESSION_KEY = 'booth_meal_templates_session';

// Helper to convert minutes to HH:MM
function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.round(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function MealAnalysisPage({
  patients,
  selectedPatient,
  onSelectPatient,
  selectedController,
  controllerParams = {},
  onRunSimulationWithMeals,
  simResult,
  isLoading,
}) {
  // Session templates state: load from sessionStorage if available
  const [templates, setTemplates] = useState(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read sessionStorage templates:', e);
    }
    // Default initial templates
    return [
      {
        id: 'tpl_balanced',
        name: 'Balanced Day (Default)',
        isCustom: false,
        slots: [
          { slot: 'Breakfast', time: '07:00', time_minutes: 420, foodId: 'oatmeal_berries', portion: 1.0 },
          { slot: 'Lunch', time: '12:30', time_minutes: 750, foodId: 'turkey_sandwich', portion: 1.0 },
          { slot: 'Dinner', time: '18:30', time_minutes: 1110, foodId: 'pepperoni_pizza', portion: 1.0 },
        ],
      },
      {
        id: 'tpl_pizza_party',
        name: 'Pizza & Soda Feast',
        isCustom: false,
        slots: [
          { slot: 'Breakfast', time: '08:00', time_minutes: 480, foodId: 'bagel_cream_cheese', portion: 1.0 },
          { slot: 'Lunch', time: '13:00', time_minutes: 780, foodId: 'cheeseburger_fries', portion: 1.5 },
          { slot: 'Dinner', time: '19:00', time_minutes: 1140, foodId: 'pepperoni_pizza', portion: 2.0 },
        ],
      },
      {
        id: 'tpl_low_carb',
        name: 'Low-Carb / Keto Plan',
        isCustom: false,
        slots: [
          { slot: 'Breakfast', time: '08:00', time_minutes: 480, foodId: 'scrambled_eggs', portion: 1.5 },
          { slot: 'Lunch', time: '12:30', time_minutes: 750, foodId: 'grilled_salmon', portion: 1.0 },
          { slot: 'Dinner', time: '18:00', time_minutes: 1080, foodId: 'grilled_salmon', portion: 1.5 },
        ],
      },
    ];
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState('tpl_balanced');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingNew, setIsSavingNew] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(null);

  // Visual meal slots state
  const [mealSelections, setMealSelections] = useState([
    {
      slot: 'Breakfast',
      time: '07:00',
      time_minutes: 420,
      foodId: 'oatmeal_berries',
      portion: 1.0,
    },
    {
      slot: 'Lunch',
      time: '12:30',
      time_minutes: 750,
      foodId: 'turkey_sandwich',
      portion: 1.0,
    },
    {
      slot: 'Dinner',
      time: '18:30',
      time_minutes: 1110,
      foodId: 'pepperoni_pizza',
      portion: 1.0,
    },
  ]);

  // Sync templates to sessionStorage whenever they change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(templates));
    } catch (e) {
      console.warn('Could not write to sessionStorage:', e);
    }
  }, [templates]);

  // Load a template into the visual editor
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const tpl = templates.find((t) => t.id === templateId);
    if (tpl && tpl.slots) {
      setMealSelections(JSON.parse(JSON.stringify(tpl.slots)));
      setSaveSuccessMsg(`Loaded "${tpl.name}"`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
  };

  // Save current slots as a new template in the session
  const handleSaveAsNewTemplate = (e) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newId = `custom_${Date.now()}`;
    const newTpl = {
      id: newId,
      name: newTemplateName.trim(),
      isCustom: true,
      slots: JSON.parse(JSON.stringify(mealSelections)),
    };

    setTemplates((prev) => [...prev, newTpl]);
    setSelectedTemplateId(newId);
    setNewTemplateName('');
    setIsSavingNew(false);
    setSaveSuccessMsg(`Saved template "${newTpl.name}" to session!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Overwrite existing custom template with current meal setup
  const handleOverwriteTemplate = () => {
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (!tpl) return;

    setTemplates((prev) =>
      prev.map((t) =>
        t.id === selectedTemplateId
          ? { ...t, slots: JSON.parse(JSON.stringify(mealSelections)) }
          : t
      )
    );
    setSaveSuccessMsg(`Updated "${tpl.name}" in session!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete a user-created template
  const handleDeleteTemplate = (idToDelete) => {
    setTemplates((prev) => prev.filter((t) => t.id !== idToDelete));
    if (selectedTemplateId === idToDelete) {
      setSelectedTemplateId('tpl_balanced');
      const def = templates.find((t) => t.id === 'tpl_balanced');
      if (def) setMealSelections(JSON.parse(JSON.stringify(def.slots)));
    }
  };

  const handleFoodChange = (slotIndex, foodId) => {
    const updated = [...mealSelections];
    updated[slotIndex].foodId = foodId;
    setMealSelections(updated);
  };

  const handlePortionChange = (slotIndex, delta) => {
    const updated = [...mealSelections];
    const newPortion = Math.max(0.5, Math.min(3.0, updated[slotIndex].portion + delta));
    updated[slotIndex].portion = Number(newPortion.toFixed(1));
    setMealSelections(updated);
  };

  const handleTimeChange = (slotIndex, timeStr) => {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    const updated = [...mealSelections];
    updated[slotIndex].time = timeStr;
    updated[slotIndex].time_minutes = h * 60 + m;
    setMealSelections(updated);
  };

  const handleAddSlot = () => {
    const last = mealSelections[mealSelections.length - 1];
    const newMinutes = last ? Math.min(1380, last.time_minutes + 180) : 720;
    const newSlot = {
      slot: `Snack ${mealSelections.length + 1}`,
      time: minutesToTime(newMinutes),
      time_minutes: newMinutes,
      foodId: 'apple_slices',
      portion: 1.0,
    };
    setMealSelections([...mealSelections, newSlot]);
  };

  const handleRemoveSlot = (index) => {
    if (mealSelections.length <= 1) return;
    setMealSelections(mealSelections.filter((_, i) => i !== index));
  };

  // Compute calculated meals array for the simulation API
  const calculatedMeals = mealSelections.map((slot) => {
    const food = foodsData.find((f) => f.id === slot.foodId) || foodsData[0];
    const calculatedCarbs = Math.round(food.carbs_g * slot.portion);
    return {
      label: `${slot.slot}: ${food.name}`,
      time_minutes: slot.time_minutes,
      carbs_g: calculatedCarbs,
    };
  });

  const totalCarbs = calculatedMeals.reduce((acc, m) => acc + m.carbs_g, 0);

  const handleRun = () => {
    onRunSimulationWithMeals(calculatedMeals);
  };

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <div className="space-y-6">
      {/* Top Row: Patient Profile & Meal Template Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Patient Profile Card */}
        <PatientCard
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={onSelectPatient}
        />

        {/* Meal Template Manager Box */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-brand-crimson" />
              <h3 className="font-semibold text-slate-900 text-sm">Meal Templates</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Session Only
            </span>
          </div>

          {/* Template Selector Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Select or Edit Template:
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => handleSelectTemplate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} {tpl.isCustom ? '★ (Custom)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Save / Overwrite Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsSavingNew(!isSavingNew)}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-brand-crimson" />
              <span>Save As New...</span>
            </button>

            {activeTemplate?.isCustom && (
              <>
                <button
                  type="button"
                  onClick={handleOverwriteTemplate}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  title="Overwrite this custom template with current meal changes"
                >
                  <Save className="w-3.5 h-3.5 text-blue-600" />
                  <span>Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(activeTemplate.id)}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
                  title="Delete template from session"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Save New Template Input Field */}
          {isSavingNew && (
            <form onSubmit={handleSaveAsNewTemplate} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <label className="block text-[11px] font-semibold text-slate-700">
                New Template Name:
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Post-Workout High Carb"
                  className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-brand-crimson"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newTemplateName.trim()}
                  className="px-2.5 py-1 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded text-xs font-bold disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          )}

          {saveSuccessMsg && (
            <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-lg flex items-center gap-1.5 animate-fade-in font-medium">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </p>
          )}

          {/* Total Carbs & Run Trigger */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Total Protocol Carbs:
              </span>
              <span className="text-base font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-mono">
                {totalCarbs}g CHO
              </span>
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={isLoading}
              className="w-full py-3 px-4 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Simulate Meal Impact</span>
            </button>
          </div>
        </div>
      </div>

      {/* Middle Section: Interactive Visual Meal Cards */}
      <div className="space-y-3">
        {/* Header with Slot Count and Add Button */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
            <Utensils className="w-4 h-4 text-brand-crimson" />
            <span>Interactive Meal Schedule ({mealSelections.length} meal slots)</span>
          </div>
          <button
            type="button"
            onClick={handleAddSlot}
            className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Slot</span>
          </button>
        </div>

        {/* Visual Meal Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mealSelections.map((selection, idx) => {
            const food = foodsData.find((f) => f.id === selection.foodId) || foodsData[0];
            const currentCarbs = Math.round(food.carbs_g * selection.portion);

            return (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                    <input
                      type="text"
                      value={selection.slot}
                      onChange={(e) => {
                        const updated = [...mealSelections];
                        updated[idx].slot = e.target.value;
                        setMealSelections(updated);
                      }}
                      className="font-bold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-brand-crimson focus:outline-none w-28"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <input
                        type="time"
                        value={selection.time}
                        onChange={(e) => handleTimeChange(idx, e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-xs font-semibold text-slate-700"
                      />
                      {mealSelections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(idx)}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                          title="Remove this meal slot"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Food Thumbnail */}
                  <div className="w-full h-28 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 overflow-hidden p-2">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Food Selector Dropdown */}
                  <select
                    value={selection.foodId}
                    onChange={(e) => handleFoodChange(idx, e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-brand-crimson mb-2"
                  >
                    {foodsData.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.carbs_g}g)
                      </option>
                    ))}
                  </select>

                  <p className="text-[11px] text-slate-400 leading-tight mb-3">
                    {food.serving_label}
                  </p>
                </div>

                {/* Portion Multiplier & Carbs Readout */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-500">Portion Size:</span>
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handlePortionChange(idx, -0.5)}
                        className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-slate-800 w-8 text-center font-mono">
                        {selection.portion}x
                      </span>
                      <button
                        type="button"
                        onClick={() => handlePortionChange(idx, 0.5)}
                        className="w-5 h-5 rounded bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
                    <span className="text-xs font-semibold text-amber-900">Total Carbs:</span>
                    <span className="text-sm font-extrabold text-amber-800 font-mono">
                      {currentCarbs}g
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Section: Full-Width Chart & Clinical Metrics Results */}
      <div className="space-y-5">
        <SimulationChart
          simData={simResult}
          title={`${selectedPatient?.cohort} #${(selectedPatient?.subject_index ?? 0) + 1} (${selectedPatient?.simglucose_name}) • Meal Absorption & Glycemia`}
        />

        <ClinicalMetricsGrid metrics={simResult?.metrics} />
      </div>
    </div>
  );
}
