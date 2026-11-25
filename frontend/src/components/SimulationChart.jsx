import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  FastForward,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function SimulationChart({
  simData,
  compareData = null,
  title = '24-Hour Glycemic & Insulin Trajectory',
  className = '',
}) {
  const [playbackIndex, setPlaybackIndex] = useState(null); // null means show all points
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(4); // 1x, 4x, 16x, Instant
  const timerRef = useRef(null);

  // Transform simData traces into row-based array for Recharts
  const chartData = useMemo(() => {
    if (!simData || !simData.timestamps) return [];
    const len = simData.timestamps.length;
    const rows = [];

    for (let i = 0; i < len; i++) {
      const row = {
        index: i,
        time: simData.timestamps[i],
        minutes: simData.minutes_elapsed[i],
        bg: simData.bg[i],
        cgm: simData.cgm[i],
        insulin: simData.insulin ? simData.insulin[i] : 0,
        cho: simData.cho ? simData.cho[i] : 0,
      };

      if (compareData && compareData.bg && i < compareData.bg.length) {
        row.bg_b = compareData.bg[i];
        row.cgm_b = compareData.cgm[i];
        row.insulin_b = compareData.insulin ? compareData.insulin[i] : 0;
      }

      rows.push(row);
    }
    return rows;
  }, [simData, compareData]);

  // If playbackIndex is set, slice data up to that point
  const visibleData = useMemo(() => {
    if (playbackIndex === null || playbackIndex >= chartData.length) {
      return chartData;
    }
    return chartData.slice(0, Math.max(1, playbackIndex + 1));
  }, [chartData, playbackIndex]);

  // Current active frame data
  const currentPoint = useMemo(() => {
    if (!chartData.length) return null;
    const idx = playbackIndex === null ? chartData.length - 1 : playbackIndex;
    return chartData[idx] || chartData[0];
  }, [chartData, playbackIndex]);

  // When a new simulation is run, automatically start playing the animated graph trajectory!
  useEffect(() => {
    if (simData && simData.timestamps && simData.timestamps.length > 0) {
      setPlaybackIndex(0);
      setIsPlaying(true);
    }
  }, [simData]);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying && chartData.length > 0) {
      const stepIncrement = speed >= 16 ? 3 : 1;
      const stepInterval = speed >= 16 ? 25 : (speed >= 4 ? 35 : 100);

      timerRef.current = setInterval(() => {
        setPlaybackIndex((prev) => {
          const current = prev === null ? 0 : prev;
          const next = current + stepIncrement;
          if (next >= chartData.length) {
            setIsPlaying(false);
            return chartData.length - 1;
          }
          return next;
        });
      }, stepInterval);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, chartData.length]);

  const handlePlayPause = () => {
    if (playbackIndex === null || playbackIndex >= chartData.length - 1) {
      setPlaybackIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  };

  const handleShowAll = () => {
    setIsPlaying(false);
    setPlaybackIndex(null);
  };

  const handleStep = (direction) => {
    setIsPlaying(false);
    setPlaybackIndex((prev) => {
      const curr = prev === null ? chartData.length - 1 : prev;
      const next = curr + direction;
      return Math.max(0, Math.min(chartData.length - 1, next));
    });
  };

  if (!simData || !chartData.length) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-400 ${className}`}>
        <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 animate-pulse" />
        <p className="text-sm font-medium">Run a simulation to generate physiological charts</p>
      </div>
    );
  }

  // Zone status for current glucose reading
  const currentBg = currentPoint ? currentPoint.cgm : 0;
  let bgStatusColor = 'text-zone-target';
  let bgStatusLabel = 'In Range';
  if (currentBg < 70) {
    bgStatusColor = 'text-zone-hypo';
    bgStatusLabel = currentBg < 54 ? 'Very Low (Level 2)' : 'Low (Level 1)';
  } else if (currentBg > 180) {
    bgStatusColor = currentBg > 250 ? 'text-zone-extreme' : 'text-zone-hyper';
    bgStatusLabel = currentBg > 250 ? 'Very High (Level 2)' : 'High (Level 1)';
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${className}`}>
      {/* Header Readout & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-teal" />
            {title}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="font-medium text-slate-500">
              Time: <strong className="text-slate-900 font-semibold">{currentPoint?.time}</strong>
            </span>
            <span className="font-medium text-slate-500">
              Glucose: <strong className={`font-bold text-sm ${bgStatusColor}`}>{Math.round(currentBg)} mg/dL</strong> ({bgStatusLabel})
            </span>
          </div>
        </div>

        {/* Playback Controls Bar */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
            title="Reset to 00:00"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => handleStep(-1)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
            title="Step Back 5 Min"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePlayPause}
            className="px-2.5 py-1.5 bg-brand-crimson hover:bg-brand-crimsonHover text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <button
            type="button"
            onClick={() => handleStep(1)}
            className="p-1.5 text-slate-600 hover:text-slate-900 rounded hover:bg-white transition-colors"
            title="Step Forward 5 Min"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-0.5 ml-1 border-l border-slate-300 pl-1.5">
            {[1, 4, 16].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                  speed === s ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s}x
              </button>
            ))}
            <button
              type="button"
              onClick={handleShowAll}
              className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                playbackIndex === null ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Main Glucose Chart */}
      <div className="pt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={visibleData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />

            {/* Target Glycemic Band (70 - 180 mg/dL) */}
            <ReferenceArea
              y1={70}
              y2={180}
              fill="#22c55e"
              fillOpacity={0.12}
              stroke="#22c55e"
              strokeDasharray="2 2"
              strokeOpacity={0.3}
            />

            {/* Clinical Target & Alert Lines */}
            <ReferenceLine y={54} stroke="#b91c1c" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '54 Very Low', fill: '#b91c1c', fontSize: 10, position: 'insideRight' }} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '70 Hypo Threshold', fill: '#ef4444', fontSize: 10, position: 'insideRight' }} />
            <ReferenceLine y={180} stroke="#16a34a" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '180 Target Ceiling', fill: '#16a34a', fontSize: 10, position: 'insideRight' }} />
            <ReferenceLine y={250} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={1.5} label={{ value: '250 Very High', fill: '#f59e0b', fontSize: 10, position: 'insideRight' }} />

            <XAxis
              dataKey="time"
              interval={Math.floor(chartData.length / 8)}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              domain={[40, 450]}
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              ticks={[54, 70, 100, 140, 180, 250, 350]}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900/90 backdrop-blur text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1">
                    <p className="font-bold text-slate-200">{data.time}</p>
                    <p className="text-teal-300 font-semibold">Sensor CGM: {Math.round(data.cgm)} mg/dL</p>
                    <p className="text-slate-300">True BG: {Math.round(data.bg)} mg/dL</p>
                    {data.cgm_b !== undefined && (
                      <p className="text-purple-300 font-semibold">Controller B: {Math.round(data.cgm_b)} mg/dL</p>
                    )}
                    {data.cho > 0 && <p className="text-amber-300 font-medium">Carbs: {data.cho} g</p>}
                  </div>
                );
              }}
            />

            {/* Controller A / Main CGM Curve */}
            <Line
              type="monotone"
              dataKey="cgm"
              name="Controller A (CGM)"
              stroke="#0f766e"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Controller B Overlay Curve (if present) */}
            {compareData && (
              <Line
                type="monotone"
                dataKey="cgm_b"
                name="Controller B (CGM)"
                stroke="#8b5cf6"
                strokeWidth={2.5}
                strokeDasharray="4 2"
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Synchronized Lower Panel: Insulin Infusion & Meals */}
      <div className="pt-2 h-24 border-t border-slate-100">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visibleData} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="time" hide />
            <YAxis
              domain={[0, 'auto']}
              stroke="#94a3b8"
              fontSize={10}
              tickLine={false}
              unit=" U"
            />
            <Bar dataKey="insulin" fill="#4f46e5" name="Insulin Infusion (U/min)" isAnimationActive={false} />
            {compareData && (
              <Bar dataKey="insulin_b" fill="#a78bfa" name="Controller B Insulin" isAnimationActive={false} />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Legend Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-brand-teal inline-block rounded"></span>
            <span className="text-slate-600 font-medium">
              {compareData ? 'Controller A' : 'Sensor Glucose (CGM)'}
            </span>
          </div>
          {compareData && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-purple-500 inline-block rounded border-dashed"></span>
              <span className="text-slate-600 font-medium">Controller B</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-brand-indigo inline-block rounded"></span>
            <span className="text-slate-600 font-medium">Insulin (U/min)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 bg-emerald-500/20 border border-emerald-500/50 inline-block rounded"></span>
            <span className="text-slate-600 font-medium">Target Band (70–180 mg/dL)</span>
          </div>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          {visibleData.length} of {chartData.length} pts (5-min intervals)
        </div>
      </div>
    </div>
  );
}
