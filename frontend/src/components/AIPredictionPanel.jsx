import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Wind, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AIPredictionPanel({ fireData, params }) {
  const maxIntensity = fireData.length > 0 
    ? Math.max(...fireData.map(d => d.intensity)) 
    : 0;

  const riskLevel = maxIntensity > 0.8 ? 'CRITICAL' : maxIntensity > 0.5 ? 'HIGH' : maxIntensity > 0 ? 'MODERATE' : 'LOW';
  const riskColor = riskLevel === 'CRITICAL' ? 'text-red-500' : riskLevel === 'HIGH' ? 'text-fire-500' : 'text-yellow-500';

  const getCompassDirection = (deg) => {
    const dirs = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
    return dirs[Math.round(deg / 45) % 8];
  };

  const spreadDirection = params.windDir;
  
  // Create a dynamic intensity sequence influenced by the wind speed to make it look realistic and dynamic
  const dynamicIntensities = Array.from({ length: 12 }).map((_, i) => {
    let base = 20 + (i * 6);
    let fluctuations = Math.sin(i + (params.windSpeed * 0.1)) * 10;
    let value = Math.max(0, Math.min(100, base + fluctuations));
    return value;
  });

  return (
    <motion.div 
      className="h-full glass-panel flex flex-col p-5 overflow-y-auto"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-3 mb-5 pb-3 border-b border-white/10">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold tracking-wide">Prediction Engine</h2>
      </div>

      <div className="space-y-4">
        {/* Executive Summary */}
        <div className="bg-dark-800/80 rounded-xl p-4 border border-white/10 shadow-lg">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">AI Forecast Analysis</h3>
          <p className="text-sm text-gray-200 leading-relaxed">
            The fire is projected to spread <strong className="text-white">{getCompassDirection(params.windDir)}</strong> driven by <strong className="text-white">{params.windSpeed} km/h</strong> winds. 
            Immediate risk classified as <strong className={`${riskColor} font-bold`}>{riskLevel}</strong> for downtown sectors.
          </p>
        </div>

        {/* Spread Vectors */}
        <div className="bg-dark-800/80 rounded-xl p-4 border border-white/10 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase mb-1">Wind Vector</div>
            <div className="text-2xl font-black text-white">{params.windSpeed} <span className="text-sm text-gray-500 font-normal">km/h</span></div>
            <div className="text-sm font-medium text-blue-400 mt-0.5">Bearing {params.windDir}°</div>
          </div>
          <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center relative bg-dark-900 shadow-inner">
            <div 
              className="absolute w-1 h-8 bg-gradient-to-t from-transparent to-blue-500 origin-bottom rounded-full"
              style={{ transform: `rotate(${spreadDirection}deg) translateY(-50%)` }}
            ></div>
            <div className="w-2 h-2 rounded-full bg-white z-10 shadow-[0_0_10px_white]"></div>
          </div>
        </div>

        {/* Intensity Graph Mock */}
        <div className="bg-dark-800/80 rounded-xl p-4 border border-white/10 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="text-xs font-bold text-gray-400 uppercase">12-Hour Spread Intensity</div>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </div>
          <div className="h-28 flex items-end gap-1.5 mb-2">
            {dynamicIntensities.map((val, i) => (
              <div 
                key={i} 
                className="w-full relative group"
                style={{ height: `${val}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-fire-600/40 to-fire-500 rounded-t-sm group-hover:from-fire-500 group-hover:to-fire-400 transition-colors"></div>
                {/* Tooltip on hover could go here */}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] font-medium text-gray-400 px-1 border-t border-white/10 pt-2 mt-1">
            <span>Current</span>
            <span>+6 Hours</span>
            <span>+12 Hours</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
