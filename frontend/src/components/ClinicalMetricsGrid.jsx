import React from 'react';
import { Target, TrendingUp, TrendingDown, Activity } from 'lucide-react';

export default function ClinicalMetricsGrid({
  metrics,
  metricsB = null,
  className = '',
}) {
  if (!metrics) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-20 mb-2"></div>
            <div className="h-7 bg-slate-100 rounded w-16"></div>
          </div>
        ))}
      </div>
    );
  }

  // Format delta string with appropriate color
  const renderDelta = (valA, valB, isHigherBetter = true) => {
    if (valB === undefined || valB === null) return null;
    const diff = Number((valB - valA).toFixed(1));
    if (diff === 0) return <span className="text-slate-400 font-mono text-xs">0.0</span>;

    const isGood = isHigherBetter ? diff > 0 : diff < 0;
    const colorClass = isGood ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200';
    const sign = diff > 0 ? '+' : '';

    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${colorClass}`}>
        {sign}{diff}
      </span>
    );
  };

  const cards = [
    {
      id: 'tir',
      title: 'Time in Range',
      subtitle: '70 – 180 mg/dL',
      value: `${metrics.tir_pct}%`,
      valueNum: metrics.tir_pct,
      valueB: metricsB ? `${metricsB.tir_pct}%` : null,
      valueBNum: metricsB ? metricsB.tir_pct : null,
      subInfo: 'Normal Glycemic Band',
      target: '> 70% Clinical Target',
      isHigherBetter: true,
      cardColor: 'border-emerald-200 bg-emerald-50/20',
      textColor: 'text-emerald-700',
      icon: Target,
    },
    {
      id: 'tar',
      title: 'Time Above Range',
      subtitle: '> 180 mg/dL (Hyper)',
      value: `${metrics.tar_pct}%`,
      valueNum: metrics.tar_pct,
      valueB: metricsB ? `${metricsB.tar_pct}%` : null,
      valueBNum: metricsB ? metricsB.tar_pct : null,
      subInfo: `L1: ${metrics.tar_l1_pct}% • L2: ${metrics.tar_l2_pct}%`,
      subInfoB: metricsB ? `vs L1: ${metricsB.tar_l1_pct}% • L2: ${metricsB.tar_l2_pct}%` : null,
      target: '< 25% Clinical Target',
      isHigherBetter: false,
      cardColor: 'border-amber-200 bg-amber-50/20',
      textColor: 'text-amber-700',
      icon: TrendingUp,
    },
    {
      id: 'tbr',
      title: 'Time Below Range',
      subtitle: '< 70 mg/dL (Hypo)',
      value: `${metrics.tbr_pct}%`,
      valueNum: metrics.tbr_pct,
      valueB: metricsB ? `${metricsB.tbr_pct}%` : null,
      valueBNum: metricsB ? metricsB.tbr_pct : null,
      subInfo: `L1: ${metrics.tbr_l1_pct}% • L2: ${metrics.tbr_l2_pct}%`,
      subInfoB: metricsB ? `vs L1: ${metricsB.tbr_l1_pct}% • L2: ${metricsB.tbr_l2_pct}%` : null,
      target: '< 4% Clinical Target',
      isHigherBetter: false,
      cardColor: 'border-red-200 bg-red-50/20',
      textColor: 'text-red-700',
      icon: TrendingDown,
    },
    {
      id: 'risk',
      title: 'Risk Index (RI)',
      subtitle: 'UVA/Padova Glycemic Risk',
      value: metrics.risk_index,
      valueNum: metrics.risk_index,
      valueB: metricsB ? metricsB.risk_index : null,
      valueBNum: metricsB ? metricsB.risk_index : null,
      subInfo: `LBGI: ${metrics.lbgi} + HBGI: ${metrics.hbgi}`,
      subInfoB: metricsB ? `vs LBGI: ${metricsB.lbgi} + HBGI: ${metricsB.hbgi}` : null,
      target: 'Total = LBGI + HBGI',
      isHigherBetter: false,
      cardColor: 'border-slate-200 bg-slate-50/40',
      textColor: 'text-slate-900',
      icon: Activity,
    },
  ];

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 ${className}`}>
      {cards.map((card) => {
        const IconComponent = card.icon;
        return (
          <div
            key={card.id}
            className={`rounded-xl border p-4 bg-white shadow-xs flex flex-col justify-between overflow-hidden ${card.cardColor}`}
          >
            <div>
              <div className="flex items-center justify-between text-slate-500 mb-1">
                <span className="text-[11px] font-bold uppercase tracking-wider">{card.title}</span>
                <IconComponent className="w-4 h-4 opacity-75 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-400 font-medium leading-none mb-2.5">{card.subtitle}</p>

              {/* Metric Values with robust non-bleeding flex wrap */}
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-1.5">
                <span className={`text-2xl font-extrabold tracking-tight ${card.textColor}`}>
                  {card.value}
                </span>

                {card.valueB !== null && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-slate-400 font-semibold">vs</span>
                    <span className="text-lg font-bold text-purple-700">{card.valueB}</span>
                    {renderDelta(card.valueNum, card.valueBNum, card.isHigherBetter)}
                  </div>
                )}
              </div>

              {/* Sub-info: LBGI + HBGI breakdown or L1/L2 breakdown */}
              {card.subInfo && (
                <div className="text-[11px] text-slate-600 font-mono space-y-0.5 mt-1 leading-tight">
                  <p>{card.subInfo}</p>
                  {card.subInfoB && (
                    <p className="text-purple-700 font-semibold">{card.subInfoB}</p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-2 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold">{card.target}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
