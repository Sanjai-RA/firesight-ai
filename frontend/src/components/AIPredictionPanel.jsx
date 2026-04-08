import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Wind, TrendingUp, AlertTriangle } from 'lucide-react';

export default function AIPredictionPanel({ fireData, params }) {
  const maxIntensity = fireData.length > 0 
    ? Math.max(...fireData.map(d => d.intensity)) 
    : 0;

  const riskLevel = maxIntensity > 0.8 ? 'CRITICAL' : maxIntensity > 0.5 ? 'HIGH' : maxIntensity > 0 ? 'MODERATE' : 'LOW';
  const riskColor = riskLevel === 'CRITICAL' ? 'text-red-500' : riskLevel === 'HIGH' ? 'text-fire-500' : 'text-yellow-500';

  // Calculate generic direction based on spread. Since we mock, we just show params.windDir
  const spreadDirection = params.windDir;

  return (
    <motion.div 
      className="h-full glass-panel flex flex-col p-5 overflow-y-auto"
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
        <Activity className="w-5 h-5 text-gray-300" />
        <h2 className="text-lg font-bold">Predictive Analytics</h2>
      </div>

      <div className="space-y-6">
        {/* Risk Status */}
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="text-xs text-gray-400 mb-1">Threat Classification</div>
          <div className={`text-2xl font-black tracking-wider ${riskColor} flex items-center gap-2`}>
            {riskLevel !== 'LOW' && <AlertTriangle className="w-5 h-5" />}
            {riskLevel}
          </div>
        </div>

        {/* Spread Vectors */}
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium">Trajectory Vector</div>
            <Wind className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center relative">
              <div 
                className="absolute w-0.5 h-6 bg-fire-500 origin-bottom rounded-full"
                style={{ transform: `rotate(${spreadDirection}deg) translateY(-50%)` }}
              ></div>
              <div className="w-1.5 h-1.5 rounded-full bg-white z-10"></div>
            </div>
            <div>
              <div className="text-lg font-bold">{params.windDir}°</div>
              <div className="text-xs text-gray-500">North-East Bound</div>
            </div>
          </div>
        </div>

        {/* Intensity Graph Mock */}
        <div className="bg-dark-800 rounded-xl p-4 border border-white/5">
           <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium">12-Hour Progression</div>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </div>
          <div className="h-24 flex items-end gap-1 mb-2">
            {[20, 30, 45, 60, 75, 80, 85, 90, 88, 92, 95, 95].map((val, i) => (
              <div 
                key={i} 
                className="w-full bg-gradient-to-t from-fire-600/20 to-fire-500/80 rounded-sm hover:opacity-80 transition-opacity"
                style={{ height: `${val}%` }}
              ></div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>Now</span>
            <span>+6h</span>
            <span>+12h</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
