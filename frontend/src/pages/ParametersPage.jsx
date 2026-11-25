import React from 'react';
import PatientCard from '../components/PatientCard';
import SimulationChart from '../components/SimulationChart';
import ClinicalMetricsGrid from '../components/ClinicalMetricsGrid';
import SimParamsDrawer from '../components/SimParamsDrawer';
import MealProtocolTable from '../components/MealProtocolTable';
import ControllerParamsEditor from '../components/ControllerParamsEditor';

export default function ParametersPage({
  patients,
  selectedPatient,
  onSelectPatient,
  controllers,
  selectedController,
  onSelectController,
  controllerParams = {},
  onChangeControllerParams,
  meals,
  onChangeMeals,
  onSelectPreset,
  simParams,
  onChangeSimParams,
  simResult,
  isLoading,
  onRunSimulation,
}) {
  const activeCtrl = controllers.find((c) => c.id === selectedController);

  return (
    <div className="space-y-6">
      {/* Top Row: Responsive Row of Core Parameter Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        {/* Box 1: Patient Profile */}
        <PatientCard
          patients={patients}
          selectedPatient={selectedPatient}
          onSelectPatient={onSelectPatient}
        />

        {/* Box 2: Controller Selector & Tuner */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Active Controller
            </label>
            <select
              value={selectedController}
              onChange={(e) => onSelectController(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-crimson/30 focus:border-brand-crimson"
            >
              {controllers.map((ctrl) => (
                <option key={ctrl.id} value={ctrl.id}>
                  {ctrl.display_name} ({ctrl.category})
                </option>
              ))}
            </select>
          </div>

          {activeCtrl && (
            <ControllerParamsEditor
              controller={activeCtrl}
              values={controllerParams}
              onChange={onChangeControllerParams}
            />
          )}
        </div>

        {/* Box 3: Meal Protocol */}
        <MealProtocolTable
          meals={meals}
          onChangeMeals={onChangeMeals}
          onSelectPreset={onSelectPreset}
        />
      </div>

      {/* Full Environment Sandbox Drawer Always Open */}
      <div className="space-y-3">
        <SimParamsDrawer
          params={simParams}
          onChangeParams={onChangeSimParams}
          isOpen={true}
          onToggle={() => {}}
        />

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRunSimulation}
            disabled={isLoading}
            className="py-2.5 px-6 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? 'Simulating...' : 'Apply & Run Simulation'}
          </button>
        </div>
      </div>

      {/* Bottom Section: Full-Width Chart & Metrics */}
      <div className="space-y-5">
        <SimulationChart
          simData={simResult}
          title="Sandbox Simulation Output"
        />

        <ClinicalMetricsGrid metrics={simResult?.metrics} />
      </div>
    </div>
  );
}
