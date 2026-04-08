import React, { useEffect, useState, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl } from 'react-map-gl';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.dummy';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/fire-data';

export default function InteractiveMap({ fireData, setFireData, params }) {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 11,
    pitch: 45,
    bearing: -17.6
  });

  useEffect(() => {
    // Connect to WebSocket for real-time fire spread data
    const ws = new WebSocket(WS_URL);
    
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
  }, [setFireData]);

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
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      interactiveLayerIds={['fire-heatmap']}
    >
      <NavigationControl position="top-right" />
      
      {geojson && (
        <Source id="fire-data" type="geojson" data={geojson}>
          <Layer {...heatmapLayer} />
        </Source>
      )}
    </Map>
  );
}
