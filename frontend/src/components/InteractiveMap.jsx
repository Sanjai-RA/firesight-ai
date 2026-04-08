import React, { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, GeolocateControl } from 'react-map-gl';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const WS_URL_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/fire-data';

export default function InteractiveMap({ fireData, setFireData, params }) {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });
  
  const [baseLocation, setBaseLocation] = useState({ lat: 37.7749, lng: -122.4194 });

  useEffect(() => {
    const fetchIPLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.latitude && data.longitude) {
          setBaseLocation({ lat: data.latitude, lng: data.longitude });
          setViewState(prev => ({ ...prev, latitude: data.latitude, longitude: data.longitude }));
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
    return () => ws.close();
  }, [setFireData, baseLocation]);

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
      
      {geojson && (
        <Source id="fire-data" type="geojson" data={geojson}>
          <Layer {...heatmapLayer} />
        </Source>
      )}
    </Map>
  );
}
