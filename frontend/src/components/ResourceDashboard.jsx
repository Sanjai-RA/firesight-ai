import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plane, Truck, Users, Cpu, CheckCircle } from 'lucide-react';

export default function ResourceDashboard() {
  const [optimizing, setOptimizing] = useState(false);
  const [optimized, setOptimized] = useState(false);
  
  const resources = [
    { name: 'Air Tankers', count: 3, icon: <Plane className="w-4 h-4 text-white" />, colorClass: 'bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.6)]' },
    { name: 'Fire Engines', count: 12, icon: <Truck className="w-4 h-4 text-white" />, colorClass: 'bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.6)]' },
    { name: 'Ground Crew', count: 45, icon: <Users className="w-4 h-4 text-white" />, colorClass: 'bg-yellow-600/80 shadow-[0_0_10px_rgba(202,138,4,0.6)]' },
  ];

  const handleOptimize = () => {
    if (optimizing || optimized) return;
    setOptimizing(true);
    setTimeout(() => {
      setOptimizing(false);
      setOptimized(true);
    }, 2000);
  };

  useEffect(() => {
    const handleForce = () => handleOptimize();
    window.addEventListener('ai-optimize', handleForce);
    return () => window.removeEventListener('ai-optimize', handleForce);
  }, [optimizing, optimized]);

  return (
    <motion.div 
      className="glass-panel p-5 flex-1 flex flex-col"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/10">
        <Cpu className="w-4 h-4 text-gray-300" />
        <h2 className="text-md font-bold">Resource Allocation</h2>
      </div>

      <div className="space-y-3 mb-6 flex-1">
        {resources.map((res, i) => (
          <div key={i} className="flex items-center justify-between bg-dark-800 p-3 rounded-xl border border-white/5 cursor-grab active:cursor-grabbing hover:bg-dark-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${res.colorClass}`}>
                {res.icon}
              </div>
              <span className="text-sm font-medium">{res.name}</span>
            </div>
            <span className="text-sm font-bold bg-dark-900 px-3 py-1 rounded-full border border-white/10">
              {res.count}
            </span>
          </div>
        ))}
      </div>

      <button 
        onClick={handleOptimize}
        disabled={optimizing || optimized}
        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
          optimized 
            ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
            : optimizing 
              ? 'bg-fire-600/50 text-white cursor-wait relative overflow-hidden'
              : 'bg-fire-500 hover:bg-fire-400 text-white shadow-[0_0_15px_rgba(255,69,0,0.3)]'
        }`}
      >
        {optimizing && (
          <motion.div 
            className="absolute inset-0 bg-white/20"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          />
        )}
        {optimized ? (
          <>
            <CheckCircle className="w-5 h-5" /> Optimized Plan Deployed
          </>
        ) : optimizing ? (
          'Running AI Optimization...'
        ) : (
          'Run AI Optimization'
        )}
      </button>

      {optimized && (
        <motion.div 
          className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-300"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between mb-1"><span>Damage Reduced:</span> <span className="font-bold">-34%</span></div>
          <div className="flex justify-between"><span>Efficiency:</span> <span className="font-bold">98.2%</span></div>
        </motion.div>
      )}
    </motion.div>
  );
}
