import React, { useState } from 'react';
import Hero from './components/Hero';
import InteractiveMap from './components/InteractiveMap';
import AIPredictionPanel from './components/AIPredictionPanel';
import ResourceDashboard from './components/ResourceDashboard';
import SimulatorControls from './components/SimulatorControls';
import AICopilot from './components/AICopilot';
import { Flame } from 'lucide-react';

function App() {
  const [appStarted, setAppStarted] = useState(false);
  const [fireData, setFireData] = useState([]);
  const [simulationParams, setSimulationParams] = useState({
    windSpeed: 20,
    windDir: 45,
    temperature: 30,
    humidity: 15,
    baseLat: 37.7749,
    baseLng: -122.4194
  });

  const handleCopilotAction = (action, mapHighlight) => {
    if (action === 'optimize') window.dispatchEvent(new CustomEvent('ai-optimize'));
    if (action === 'highlight' && mapHighlight) {
      window.dispatchEvent(new CustomEvent('ai-map-focus', { detail: mapHighlight }));
    }
  };

  const handleLocationChange = async (lat, lng) => {
    setSimulationParams(prev => ({ ...prev, baseLat: lat, baseLng: lng }));
    
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m`);
      const data = await res.json();
      
      if (data && data.current) {
        setSimulationParams(prev => ({
          ...prev,
          temperature: Math.round(data.current.temperature_2m),
          humidity: Math.round(data.current.relative_humidity_2m),
          windSpeed: Math.max(1, Math.round(data.current.wind_speed_10m)),
          windDir: Math.round(data.current.wind_direction_10m)
        }));
      }
    } catch (err) {
      console.error("Failed to fetch real-time weather API:", err);
    }
  };

  if (!appStarted) {
    return <Hero onStart={() => setAppStarted(true)} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dark-900 text-white font-sans flex text-sm">
      {/* Absolute Map Background */}
      <div className="absolute inset-0 z-0">
        <InteractiveMap 
          fireData={fireData} 
          setFireData={setFireData} 
          params={simulationParams} 
          onLocationChange={handleLocationChange}
        />
      </div>

      {/* Top Navbar */}
      <div className="absolute top-0 left-0 right-0 h-16 glass z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-fire-500/20 rounded-lg">
            <Flame className="w-6 h-6 text-fire-500" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            FireSight AI
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 glass rounded-full text-green-400">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Live
          </div>
        </div>
      </div>

      {/* Left Sidebar - Simulation Controls */}
      <div className="absolute left-6 top-24 bottom-6 w-80 z-10 flex flex-col gap-6">
        <SimulatorControls params={simulationParams} setParams={setSimulationParams} />
        <ResourceDashboard />
      </div>

      {/* Right Sidebar - AI Predictions */}
      <div className="absolute right-6 top-24 bottom-6 w-80 z-10 pointer-events-none">
        <div className="pointer-events-auto h-full">
          <AIPredictionPanel fireData={fireData} params={simulationParams} />
        </div>
      </div>

      {/* AICopilot */}
      <AICopilot params={simulationParams} onActionTriggered={handleCopilotAction} />
    </div>
  );
}

export default App;
