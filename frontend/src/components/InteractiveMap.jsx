import React, { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, GeolocateControl, Popup } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import { Plane, Truck, Users, Crosshair } from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL_BASE = import.meta.env.VITE_WS_URL || (API_BASE.replace(/^http/, 'ws') + '/ws/fire-data');

export default function InteractiveMap({ fireData, setFireData, params, onLocationChange }) {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });
  
  const [baseLocation, setBaseLocation] = useState({ lat: 37.7749, lng: -122.4194 });
  const [resourceMarkers, setResourceMarkers] = useState([]);
  const [wsInstance, setWsInstance] = useState(null);
  const [popupInfo, setPopupInfo] = useState(null);

  // Generate initial scattered resources
  useEffect(() => {
    const activeCells = (fireData || []).filter(c => c.intensity > 0).length;
    // Default to some minor presence if fire hasn't fully computed yet, but scale heavily if big fire
    const tankerCount = Math.max(1, Math.floor(activeCells / 50)) + 2; 
    const engineCount = Math.max(3, Math.floor(activeCells / 20)) + 6;
    const crewCount = Math.max(10, Math.floor(activeCells / 10)) + 20;

    const generateMarkers = (type, count, radiusDeg) => {
      // Use pseudo-random based on index and location to prevent chaotic respawning
      return Array.from({ length: count }).map((_, i) => {
        const seedLat = Math.sin(baseLocation.lat * (i + 1)) * radiusDeg;
        const seedLng = Math.cos(baseLocation.lng * (i + 1)) * radiusDeg;
        return {
          id: `${type}-${i}`,
          type,
          lat: baseLocation.lat + seedLat,
          lng: baseLocation.lng + seedLng
        };
      });
    };

    setResourceMarkers([
      ...generateMarkers('plane', tankerCount, 0.4),
      ...generateMarkers('truck', engineCount, 0.2),
      ...generateMarkers('users', crewCount, 0.1)
    ]);
  }, [baseLocation.lat, baseLocation.lng, Math.floor(((fireData || []).filter(c => c.intensity > 0).length) / 20)]);

  // Listen for AI optimization to simulate mobilizing units
  useEffect(() => {
    const handleOptimize = () => {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        setResourceMarkers(prev => prev.map(m => {
          // Create a realistic swarming effect by moving 10% closer each frame until stopping around the fire
          const targetDist = 0.01; // stopping distance
          const dx = baseLocation.lng - m.lng;
          const dy = baseLocation.lat - m.lat;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          if (dist <= targetDist) return m; // Reached perimeter

          // Move 15% of the remaining distance per frame
          return {
            ...m,
            lat: m.lat + dy * 0.15,
            lng: m.lng + dx * 0.15
          };
        }));
        if (step > 30) clearInterval(interval); // finish anim loop
      }, 50);
    };

    window.addEventListener('ai-optimize', handleOptimize);
    return () => window.removeEventListener('ai-optimize', handleOptimize);
  }, [baseLocation.lat, baseLocation.lng]);

  useEffect(() => {
    const fetchIPLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setBaseLocation({ lat: data.latitude, lng: data.longitude });
          setViewState(prev => ({ ...prev, latitude: data.latitude, longitude: data.longitude }));
          if (onLocationChange) onLocationChange(data.latitude, data.longitude);
        }
      } catch (err) {
        console.error('IP Fallback failed', err);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setBaseLocation({ lat: latitude, lng: longitude });
          setViewState(prev => ({ ...prev, latitude, longitude }));
          if (onLocationChange) onLocationChange(latitude, longitude);
        },
        (err) => {
          console.warn('Browser GPS unavailable, using IP Fallback...', err);
          fetchIPLocation();
        },
        { timeout: 5000 }
      );
    } else {
      fetchIPLocation();
    }
  }, []);

  useEffect(() => {
    // Connect to WebSocket for real-time fire spread data with dynamic geo-location
    const ws = new WebSocket(`${WS_URL_BASE}?lat=${baseLocation.lat}&lng=${baseLocation.lng}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.grid) {
          setFireData(data.grid);
        }
      } catch (e) {
        console.error("WS Parse error", e);
      }
    };

    setWsInstance(ws);
    return () => ws.close();
  }, [setFireData, baseLocation]);

  useEffect(() => {
    if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
      wsInstance.send(JSON.stringify({
        wind_speed: params.windSpeed,
        wind_dir_deg: params.windDir,
        temperature: params.temperature,
        humidity: params.humidity
      }));
    }
  }, [params, wsInstance]);

  const handleMapClick = (e) => {
    // Find if clicked on a heatmap point
    const features = e.features;
    if (features && features.length > 0) {
      const feature = features[0];
      const coords = feature.geometry.coordinates;
      const pointLat = coords[1];
      const pointLng = coords[0];
      
      // Calculate distances to resources
      const R = 6371; // Earth's radius in km
      let closestResources = [...resourceMarkers].map(res => {
        const dLat = (res.lat - pointLat) * Math.PI / 180;
        const dLng = (res.lng - pointLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(pointLat * Math.PI / 180) * Math.cos(res.lat * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // Distance in km
        return { ...res, distance: d };
      }).sort((a,b) => a.distance - b.distance).slice(0, 3);
      
      setPopupInfo({
        lng: pointLng,
        lat: pointLat,
        intensity: feature.properties.intensity,
        resources: closestResources
      });
    } else {
      setPopupInfo(null);
    }
  };

  useEffect(() => {
    const handleFocus = (e) => {
      if (e.detail && e.detail.lng && e.detail.lat) {
        setViewState(prev => ({
          ...prev,
          longitude: e.detail.lng,
          latitude: e.detail.lat,
          zoom: 14,
          pitch: 60
        }));
      }
    };
    window.addEventListener('ai-map-focus', handleFocus);
    return () => window.removeEventListener('ai-map-focus', handleFocus);
  }, []);

  // Convert grid data to GeoJSON for Mapbox Heatmap
  const geojson = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: fireData.filter(d => d.intensity > 0).map(d => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [d.lng, d.lat] },
        properties: { intensity: d.intensity }
      }))
    };
  }, [fireData]);

  const heatmapLayer = {
    id: 'fire-heatmap',
    type: 'heatmap',
    source: 'fire-data',
    paint: {
      // Increase weight based on intensity
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      // Intensity multiplier
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 11, 1, 15, 3],
      // Color ramp: dark -> orange -> red -> white
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(20,20,20,0)',
        0.2, '#ff4500',
        0.5, '#cc3700',
        0.8, '#ff6347',
        1, '#ffffff'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 11, 15, 15, 40],
      'heatmap-opacity': 0.8
    }
  };

  return (
    <Map
      {...viewState}
      onMove={evt => setViewState(evt.viewState)}
      mapLib={maplibregl}
      mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
      interactiveLayerIds={['fire-heatmap']}
      onClick={handleMapClick}
      cursor={popupInfo ? "pointer" : "crosshair"}
    >
      <NavigationControl position="top-right" />
      <GeolocateControl 
        position="top-right" 
        trackUserLocation={true} 
        showUserHeading={true}
      />
      
      {/* Ignition Point Marker */}
      <Marker longitude={baseLocation.lng} latitude={baseLocation.lat} anchor="center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-12 h-12 bg-fire-500/50 rounded-full animate-ping"></div>
          <div className="w-4 h-4 bg-fire-600 rounded-full border-[3px] border-white shadow-[0_0_15px_rgba(255,69,0,0.8)] z-10"></div>
        </div>
      </Marker>

      {/* Resource Markers */}
      {resourceMarkers.map(m => {
        let IconElement, colorClass;
        if (m.type === 'plane') { IconElement = Plane; colorClass = 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]'; }
        if (m.type === 'truck') { IconElement = Truck; colorClass = 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]'; }
        if (m.type === 'users') { IconElement = Users; colorClass = 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]'; }
        
        return (
          <Marker key={m.id} longitude={m.lng} latitude={m.lat} anchor="center">
            <div className={`p-1.5 rounded-full ${colorClass} text-white`}>
              <IconElement className="w-3 h-3" />
            </div>
          </Marker>
        );
      })}
      
      {geojson && (
        <Source id="fire-data" type="geojson" data={geojson}>
          <Layer {...heatmapLayer} />
        </Source>
      )}

      {/* Dynamic Map Popup */}
      {popupInfo && (
        <Popup
          longitude={popupInfo.lng}
          latitude={popupInfo.lat}
          anchor="bottom"
          onClose={() => setPopupInfo(null)}
          className="rounded-2xl"
          closeButton={false}
          maxWidth="260px"
        >
          <div className="bg-dark-900 border border-white/20 p-3 rounded-xl text-white shadow-2xl text-xs w-[240px]">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
              <Crosshair className="w-4 h-4 text-red-500" />
              <h4 className="font-bold">Fire Perimeter Zone</h4>
            </div>
            <div className="mb-3 text-gray-300">
              Intensity: <strong className="text-white">{(popupInfo.intensity * 100).toFixed(0)}%</strong>
            </div>
            
            <div className="uppercase text-[10px] font-bold text-gray-500 mb-1">Nearest Responders</div>
            <div className="space-y-1.5">
              {popupInfo.resources.map((res, i) => (
                <div key={i} className="flex items-center justify-between bg-dark-800 p-1.5 rounded relative overflow-hidden group">
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="flex items-center gap-2 z-10">
                   {res.type === 'plane' && <Plane className="w-3 h-3 text-blue-400"/>}
                   {res.type === 'truck' && <Truck className="w-3 h-3 text-red-400"/>}
                   {res.type === 'users' && <Users className="w-3 h-3 text-yellow-500"/>}
                   <span className="capitalize">{res.type}</span>
                  </div>
                  <div className="z-10 font-mono text-[10px] text-gray-400">{res.distance.toFixed(1)} km</div>
                </div>
              ))}
            </div>
          </div>
        </Popup>
      )}
    </Map>

  );
}
