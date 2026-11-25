import React from 'react';
import { User, Activity, Scale, ShieldAlert } from 'lucide-react';

/**
 * PatientCard Component
 * Displays persistent virtual patient profile on the left sidebar:
 * Cohort, Subject 1-10, Age, Body Weight (BW), TDI, ICR, ISF.
 */
export default function PatientCard({
  patients = [],
  selectedPatient,
  onSelectPatient,
  className = '',
}) {
  if (!selectedPatient) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
        <p className="text-slate-400 text-sm">Loading patient profile...</p>
      </div>
    );
  }

  const cohorts = ['Adult', 'Adolescent', 'Child'];
  const availablePatientsInCohort = patients.filter(
    (p) => p.cohort.toLowerCase() === selectedPatient.cohort.toLowerCase()
  );

  const handleCohortChange = (newCohort) => {
    const match =
      patients.find(
        (p) =>
          p.cohort.toLowerCase() === newCohort.toLowerCase() &&
          p.subject_index === selectedPatient.subject_index
      ) ||
      patients.find((p) => p.cohort.toLowerCase() === newCohort.toLowerCase());

    if (match) onSelectPatient(match);
  };

  const handlePatientSelect = (simglucoseName) => {
    const match = patients.find((p) => p.simglucose_name === simglucoseName);
    if (match) onSelectPatient(match);
  };

  const cohortBadgeColors = {
    Adult: 'bg-blue-50 text-blue-700 border-blue-200',
    Adolescent: 'bg-purple-50 text-purple-700 border-purple-200',
    Child: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
      {/* Header Avatar & Identity */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <User className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-base leading-tight">
            {selectedPatient.cohort} #{selectedPatient.subject_index + 1}
          </h3>
          <span
            className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
              cohortBadgeColors[selectedPatient.cohort] || 'bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            {selectedPatient.simglucose_name}
          </span>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-2 gap-3 my-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Cohort
          </label>
          <select
            value={selectedPatient.cohort}
            onChange={(e) => handleCohortChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-crimson/30 focus:border-brand-crimson"
          >
            {cohorts.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Subject ID
          </label>
          <select
            value={selectedPatient.simglucose_name}
            onChange={(e) => handlePatientSelect(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-crimson/30 focus:border-brand-crimson"
          >
            {availablePatientsInCohort.map((p) => (
              <option key={p.simglucose_name} value={p.simglucose_name}>
                #{p.subject_index + 1} ({p.simglucose_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clinical Parameters List */}
      <div className="space-y-2 pt-2 text-sm border-t border-slate-100">
        <div className="flex justify-between py-1">
          <span className="text-slate-500 font-normal">Age</span>
          <span className="font-semibold text-slate-800">{selectedPatient.age} yrs</span>
        </div>

        <div className="flex justify-between py-1">
          <span className="text-slate-500 font-normal">Body Weight</span>
          <span className="font-semibold text-slate-800">{selectedPatient.body_weight_kg} kg</span>
        </div>

        <div className="flex justify-between py-1">
          <span className="text-slate-500 font-normal">Total Daily Insulin</span>
          <span className="font-semibold text-slate-800">{selectedPatient.tdi} U</span>
        </div>

        <div className="flex justify-between py-1">
          <span className="text-slate-500 font-normal">Insulin:Carb Ratio (ICR)</span>
          <span className="font-semibold text-brand-teal">1 : {selectedPatient.icr} g</span>
        </div>

        <div className="flex justify-between py-1">
          <span className="text-slate-500 font-normal">Sensitivity Factor (ISF)</span>
          <span className="font-semibold text-brand-indigo">1 : {selectedPatient.isf} mg/dL</span>
        </div>
      </div>
    </div>
  );
}
