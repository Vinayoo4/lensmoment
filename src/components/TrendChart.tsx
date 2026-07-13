import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { KPIEntry } from '../shared/types';

interface TrendChartProps {
  entries: KPIEntry[];
  unit?: string;
  targetValue?: number | null;
}

export default function TrendChart({ entries, unit = '₹', targetValue }: TrendChartProps) {
  // Sort entries chronologically (oldest to newest) for proper line rendering
  const sortedData = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  if (sortedData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-750 font-mono text-xs uppercase text-zinc-400 dark:text-zinc-500">
        No graph data available
      </div>
    );
  }

  // Format date for display on X-axis (e.g., "YYYY-MM-DD" -> "MM-DD")
  const formatXAxis = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        return `${parts[1]}-${parts[2]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full h-52 bg-zinc-50 dark:bg-zinc-950 p-2 border-2 border-zinc-900 dark:border-zinc-800 font-mono text-[10px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={sortedData}
          margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e4e4e7"
            className="dark:stroke-zinc-800"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatXAxis}
            stroke="#71717a"
            tickLine={false}
            axisLine={false}
            dy={8}
          />
          <YAxis
            stroke="#71717a"
            tickLine={false}
            axisLine={false}
            dx={-4}
            tickFormatter={(val) => `${unit}${val.toLocaleString()}`}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload as KPIEntry;
                return (
                  <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-900 dark:border-zinc-800 p-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] text-xs font-mono font-bold space-y-1 text-zinc-900 dark:text-zinc-50">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{data.date}</p>
                    <p className="text-indigo-600 dark:text-indigo-400 font-black">
                      {unit}{Number(data.value).toLocaleString()}
                    </p>
                    {targetValue && (
                      <p className="text-zinc-500 text-[10px] uppercase">
                        Target: {unit}{targetValue.toLocaleString()}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          {targetValue && (
            <ReferenceLine
              y={targetValue}
              stroke="#e11d48"
              strokeDasharray="4 4"
              label={{
                value: 'Target',
                position: 'top',
                fill: '#e11d48',
                fontSize: 9,
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="value"
            stroke="#4f46e5"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
