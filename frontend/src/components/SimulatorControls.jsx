import React from 'react';
import { motion } from 'framer-motion';
import { Sliders, Thermometer, Wind, Droplets } from 'lucide-react';

export default function SimulatorControls({ params, setParams }) {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setParams(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  return (
    <motion.div 
      className="glass-panel p-5"
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-white/10">
        <Sliders className="w-4 h-4 text-gray-300" />
        <h2 className="text-md font-bold">Simulator Params</h2>
      </div>

      <div className="space-y-4">
        {/* Wind Speed */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400"><Wind className="w-3 h-3"/> Wind Speed</span>
            <span>{params.windSpeed} km/h</span>
          </div>
          <input 
            type="range" name="windSpeed" min="0" max="100" value={params.windSpeed} onChange={handleChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-fire-500"
          />
        </div>

        {/* Wind Direction */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400"><Wind className="w-3 h-3"/> Wind Direction</span>
            <span>{params.windDir}°</span>
          </div>
          <input 
            type="range" name="windDir" min="0" max="360" value={params.windDir} onChange={handleChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Temperature */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400"><Thermometer className="w-3 h-3"/> Temperature</span>
            <span>{params.temperature}°C</span>
          </div>
          <input 
            type="range" name="temperature" min="0" max="50" value={params.temperature} onChange={handleChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-400"
          />
        </div>

        {/* Humidity */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1 text-gray-400"><Droplets className="w-3 h-3"/> Humidity</span>
            <span>{params.humidity}%</span>
          </div>
          <input 
            type="range" name="humidity" min="0" max="100" value={params.humidity} onChange={handleChange}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-400"
          />
        </div>
      </div>
    </motion.div>
  );
}
