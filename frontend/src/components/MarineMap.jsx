// WAYPOINT — MarineMap Component
// Integrates:
// - Leaflet 1.9.4
// - Base Tiles: CartoDB Dark Matter & OpenStreetMap (OSM)
// - Nautical Overlay: OpenSeaMap Seamarks (https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png)
// - Real-time Sea Weather: Open-Meteo Marine API (wave height, direction, swell - CC BY 4.0)
// - Real-time Hazards: GDACS Tropical Cyclone Alerts
// - Live Vessel Telemetry: AISStream Position Reports
// - Indian East Coast Ports (18 ports) & Global Partner Ports

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { WAYPOINT_DATA } from '../data/maritimeData';
import { CSV_INDIAN_PORTS, CSV_FOREIGN_PORTS } from '../data/maritimeCsvData';
import { 
  fetchMarineWeather, 
  fetchGdacsAlerts, 
  connectAisStream, 
  fetchNdbcObservations,
  fetchContainers
} from '../services/telemetryService';
import Icon from './Icon';

export default function MarineMap({
  center = [14.5, 84.5],
  zoom = 5,
  height = '480px',
  activeLayers: propActiveLayers = null,
  focusedRouteId = null,
  routes = null,
  showHazards = true,
  showVessels = true
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const refTileLayerRef = useRef(null);
  const seaMarksLayerRef = useRef(null);

  // Map Layer States
  const [baseTileType, setBaseTileType] = useState('dark'); // 'dark' | 'osm'
  const [layers, setLayers] = useState({
    routes: propActiveLayers?.routes !== undefined ? propActiveLayers.routes : true,
    ports: propActiveLayers?.ports !== undefined ? propActiveLayers.ports : true,
    vessels: propActiveLayers?.vessels !== undefined ? propActiveLayers.vessels : showVessels,
    hazards: propActiveLayers?.hazards !== undefined ? propActiveLayers.hazards : showHazards,
    containers: propActiveLayers?.containers !== undefined ? propActiveLayers.containers : true,
    seamarks: false, // OpenSeaMap seamark overlay
    waves: true,     // Open-Meteo marine wave stations
    gdacs: true      // GDACS storm alerts
  });

  // Telemetry data states
  const [waveStations, setWaveStations] = useState([]);
  const [observedBuoys, setObservedBuoys] = useState([]);
  const [gdacsAlerts, setGdacsAlerts] = useState([]);
  const [liveVessels, setLiveVessels] = useState(WAYPOINT_DATA.vessels || []);
  const [liveContainers, setLiveContainers] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);

  // Sync prop changes
  useEffect(() => {
    if (propActiveLayers) {
      setLayers(prev => ({ ...prev, ...propActiveLayers }));
    }
  }, [propActiveLayers]);

  // Load Open-Meteo & GDACS on mount
  useEffect(() => {
    // 1. Fetch Open-Meteo Marine Data for 2 primary ocean corridor waypoints (kept clean and uncluttered)
    const oceanPoints = [
      { id: 'BOB', name: 'Bay of Bengal Track', lat: 12.0, lng: 86.5 },
      { id: 'MAL', name: 'Malacca Strait Approach', lat: 5.5, lng: 97.0 }
    ];

    async function loadTelemetry() {
      // Forecast points from Open-Meteo
      const stationResults = [];
      for (const pt of oceanPoints) {
        const weather = await fetchMarineWeather(pt.lat, pt.lng);
        stationResults.push({ ...pt, ...weather });
      }
      setWaveStations(stationResults);

      // Real measured buoy observations from NOAA NDBC / RAMA
      const buoys = await fetchNdbcObservations();
      setObservedBuoys(buoys);

      // 2. Fetch GDACS Tropical Cyclone alerts
      const alerts = await fetchGdacsAlerts();
      setGdacsAlerts(alerts);

      // 3. Fetch 50 IoT Containers from live API
      const containers = await fetchContainers();
      if (containers && containers.length > 0) {
        setLiveContainers(containers);
      }
    }

    loadTelemetry();

    // 3. Connect to AISStream
    const disconnectAis = connectAisStream((vessels) => {
      setLiveVessels(prev => {
        const map = new Map();
        prev.forEach(v => map.set(v.mmsi || v.name, v));
        vessels.forEach(v => map.set(v.mmsi || v.name, { ...map.get(v.mmsi || v.name), ...v }));
        return Array.from(map.values());
      });
    });

    return () => {
      disconnectAis();
    };
  }, []);

  // Initialize and Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, zoom);

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // 1. Update Base Tiles (Zero API Key Required, No Watermark)
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (refTileLayerRef.current) {
      map.removeLayer(refTileLayerRef.current);
      refTileLayerRef.current = null;
    }

    let tileUrl;
    let maxZoom = 18;
    let subdomains = 'abc';

    if (baseTileType === 'dark') {
      // High-contrast clean dark maritime canvas (Free, no watermark)
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 16;
      refTileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
      }).addTo(map);
    } else if (baseTileType === 'ocean') {
      // Bathymetric marine depth contours and ocean ridges (Free, no watermark)
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 13;
      refTileLayerRef.current = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 13
      }).addTo(map);
    } else {
      // Standard OpenStreetMap (Free, CC-BY-SA, no watermark)
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 18;
    }

    baseTileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom,
      subdomains
    }).addTo(map);

    // 2. Update OpenSeaMap Seamarks Overlay
    if (seaMarksLayerRef.current) {
      map.removeLayer(seaMarksLayerRef.current);
    }
    if (layers.seamarks) {
      seaMarksLayerRef.current = L.tileLayer('https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png', {
        maxZoom: 18,
        opacity: 0.85
      }).addTo(map);
    }

    // 3. Rebuild Dynamic Overlays Layer Group
    if (map._overlayGroup) {
      map.removeLayer(map._overlayGroup);
    }
    const overlayGroup = L.layerGroup().addTo(map);
    map._overlayGroup = overlayGroup;

    // --- A. Shipping Routes Layer ---
    if (layers.routes) {
      const routesToRender = routes || WAYPOINT_DATA.routeOptions;
      routesToRender.forEach(r => {
        const isFocused = focusedRouteId === r.id;
        const color = r.color || (r.badgeColor === 'teal' ? '#2DD4BF' : '#FBBF24');
        const polyline = L.polyline(r.coords, {
          color: isFocused ? '#38BDF8' : color,
          weight: isFocused ? 4.5 : r.isRecommended ? 3.5 : 2.2,
          opacity: isFocused ? 1 : r.isRecommended ? 0.95 : 0.7,
          dashArray: r.isRecommended || isFocused ? null : '5, 5'
        }).addTo(overlayGroup);

        polyline.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; line-height:1.4;">
            <strong style="color:#fff; font-size:13px;">${r.name || r.label}</strong><br/>
            ${r.cost ? `<span style="color:#94A3B8;">Cost:</span> <strong style="color:#38BDF8;">$${r.cost.toLocaleString()}</strong><br/>` : ''}
            ${r.transitDays ? `<span style="color:#94A3B8;">Transit:</span> ${r.transitDays} Days • ` : ''}
            ${r.distanceNm ? `<span style="color:#94A3B8;">Distance:</span> ${r.distanceNm} nm<br/>` : ''}
            ${r.riskScore !== undefined ? `<span style="color:#94A3B8;">Risk Score:</span> <strong>${r.riskScore}/100</strong>` : ''}
          </div>
        `);
      });
    }

    // --- B. 18 Indian East Coast Ports & Global Hubs ---
    if (layers.ports) {
      CSV_INDIAN_PORTS.forEach(p => {
        const isDeepDraft = p.maxDraftM >= 16;
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: isDeepDraft ? 6 : 4.5,
          fillColor: isDeepDraft ? '#2DD4BF' : '#38BDF8',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0.95
        }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:180px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:#fff; font-size:13px;">${p.name}</strong>
              <span style="font-family:'JetBrains Mono',monospace; color:#38BDF8; font-weight:700; font-size:11px;">${p.unlocode}</span>
            </div>
            <div style="color:#94A3B8; font-size:11px;">State: <span style="color:#F8FAFC;">${p.state} (${p.type})</span></div>
            <div style="color:#94A3B8; font-size:11px;">Permissible Draft: <strong style="color:${isDeepDraft ? '#2DD4BF' : '#FBBF24'};">${p.maxDraftM}m</strong></div>
            <div style="color:#94A3B8; font-size:11px;">FY24 Traffic: <span style="color:#F8FAFC;">${p.trafficFY24MT} MT</span></div>
            ${p.containerCapacityTEU > 0 ? `<div style="color:#94A3B8; font-size:11px;">Container Terminal: <span style="color:#F8FAFC;">${(p.containerCapacityTEU/1000).toFixed(0)}k TEU</span></div>` : ''}
          </div>
        `);
      });

      // Foreign Hubs
      CSV_FOREIGN_PORTS.slice(0, 15).forEach(fp => {
        const marker = L.circleMarker([fp.lat, fp.lng], {
          radius: 5,
          fillColor: '#FBBF24',
          color: '#080E1A',
          weight: 1.5,
          fillOpacity: 0.9
        }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <strong style="color:#fff;">${fp.name}</strong><br/>
            <span style="color:#94A3B8;">Country:</span> ${fp.country}<br/>
            <span style="font-family:'JetBrains Mono',monospace; color:#FBBF24; font-weight:700;">${fp.unlocode}</span>
          </div>
        `);
      });
    }

    // --- C. Weather Telemetry: Open-Meteo (Forecast) & NOAA NDBC (Observed) ---
    if (layers.waves) {
      // 1. Open-Meteo Model Forecast Points (Clean & Uncluttered: 2 key ocean corridor points)
      (waveStations || []).slice(0, 2).forEach(st => {
        const waveIcon = L.divIcon({
          className: 'marine-forecast-pin',
          html: `
            <div style="
              background: rgba(14, 165, 233, 0.9);
              color: #070D18;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 800;
              font-size: 10px;
              padding: 2px 7px;
              border-radius: 12px;
              border: 1px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.6);
              white-space: nowrap;
            ">
              <span style="font-size:9px; background:#070D18; color:#38BDF8; padding:0 3px; border-radius:3px;">FCST</span>
              <span>${st.waveHeight}m</span>
            </div>
          `,
          iconSize: [85, 22],
          iconAnchor: [42, 11]
        });

        const marker = L.marker([st.lat, st.lng], { icon: waveIcon }).addTo(overlayGroup);
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:190px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="background:rgba(56,189,248,0.2); color:#38BDF8; font-weight:700; padding:2px 6px; border-radius:4px; font-size:10px;">FORECAST</span>
              <span style="color:#94A3B8; font-size:10px;">Open-Meteo</span>
            </div>
            <strong style="color:#fff; font-size:13px;">${st.name}</strong><br/>
            <div style="margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px;">
              <div>Wave: <strong>${st.waveHeight}m</strong></div>
              <div>Swell: <strong>${st.swellHeight}m</strong></div>
              <div>Period: <strong>${st.wavePeriod}s</strong></div>
              <div>Dir: <strong>${st.waveDirection}°</strong></div>
            </div>
            <div style="margin-top:6px; font-size:10px; color:#94A3B8; border-top:1px solid #334155; padding-top:4px;">
              Trajectory model forecast for rerouting simulation.
            </div>
          </div>
        `);
      });

      // 2. NOAA NDBC Real Measured Buoy Readings (Observed Ground Truth: 2 key stations)
      (observedBuoys || []).slice(0, 2).forEach(b => {
        const buoyIcon = L.divIcon({
          className: 'marine-observed-buoy-pin',
          html: `
            <div style="
              background: rgba(45, 212, 191, 0.92);
              color: #070D18;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 800;
              font-size: 10px;
              padding: 2px 7px;
              border-radius: 12px;
              border: 1px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 4px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.6);
              white-space: nowrap;
            ">
              <span style="font-size:9px; background:#070D18; color:#2DD4BF; padding:0 3px; border-radius:3px;">OBS</span>
              <span>${b.waveHeightM !== null ? `${b.waveHeightM}m` : 'Live'}</span>
            </div>
          `,
          iconSize: [85, 22],
          iconAnchor: [42, 11]
        });

        const marker = L.marker([b.lat, b.lon], { icon: buoyIcon }).addTo(overlayGroup);
        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:190px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span style="background:rgba(45,212,191,0.2); color:#2DD4BF; font-weight:700; padding:2px 6px; border-radius:4px; font-size:10px;">OBSERVED</span>
              <span style="color:#2DD4BF; font-size:10px; font-weight:600;">NOAA NDBC</span>
            </div>
            <strong style="color:#fff; font-size:13px;">${b.name || `Buoy Station ${b.stationId}`}</strong><br/>
            <div style="margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-family:'JetBrains Mono',monospace; font-size:11px;">
              <div>Measured Wave: <strong>${b.waveHeightM !== null ? `${b.waveHeightM}m` : 'N/A'}</strong></div>
              <div>Wind Speed: <strong>${b.windSpeedKts ? `${b.windSpeedKts} kts` : 'N/A'}</strong></div>
              <div>Pressure: <strong>${b.pressureHpa ? `${b.pressureHpa} hPa` : 'N/A'}</strong></div>
              <div>Water Temp: <strong>${b.waterTempC ? `${b.waterTempC}°C` : 'N/A'}</strong></div>
            </div>
            <div style="margin-top:6px; font-size:10px; color:#94A3B8; border-top:1px solid #334155; padding-top:4px;">
              Real ocean sensor ground truth for rerouting validation.
            </div>
          </div>
        `);
      });
    }

    // --- D. GDACS & Storm Alerts Layer ---
    if (layers.gdacs && gdacsAlerts.length > 0) {
      gdacsAlerts.forEach(a => {
        const isCrit = a.severity === 'Critical' || a.alertLevel === 'Red';
        const color = isCrit ? '#EF4444' : '#F59E0B';

        const circle = L.circle([a.lat, a.lng], {
          radius: 280000,
          color: color,
          fillColor: color,
          fillOpacity: 0.22,
          weight: 2,
          dashArray: '4, 4'
        }).addTo(overlayGroup);

        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:200px;">
            <span style="color:${color}; font-weight:800; font-size:10px; text-transform:uppercase;">GDACS Event Alert</span><br/>
            <strong style="color:#fff; font-size:13px;">${a.name}</strong><br/>
            <span style="color:#94A3B8;">Event Type:</span> ${a.eventtype} • Severity: <strong>${a.severity}</strong><br/>
            <span style="color:#94A3B8;">Sustained Winds:</span> <strong style="color:#EF4444;">${a.windSpeedKts} kts</strong><br/>
            <p style="margin-top:4px; color:#cbd5e1; font-size:11px; line-height:1.4;">${a.description}</p>
          </div>
        `);
      });
    }

    // --- E. AISStream Live Vessels Layer ---
    if (layers.vessels && liveVessels.length > 0) {
      liveVessels.forEach(v => {
        const marker = L.circleMarker([v.lat, v.lng], {
          radius: 5,
          fillColor: '#F8FAFC',
          color: '#080E1A',
          weight: 1.5,
          fillOpacity: 1
        }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:180px;">
            <strong style="color:#fff; font-size:13px;">${v.name}</strong><br/>
            <span style="color:#94A3B8;">MMSI:</span> <span style="font-family:'JetBrains Mono',monospace; color:#38BDF8;">${v.mmsi}</span><br/>
            <span style="color:#94A3B8;">Type:</span> ${v.type}<br/>
            <span style="color:#94A3B8;">Speed / Course:</span> <strong>${v.speed} kts • ${v.heading}°</strong><br/>
            <span style="color:#94A3B8;">Destination:</span> <strong style="color:#2DD4BF;">${v.dest}</strong>
          </div>
        `);
      });
    }

    // --- F. Live IoT Shipping Containers Layer (from containers.csv API) ---
    if (layers.containers && liveContainers.length > 0) {
      liveContainers.forEach(c => {
        const isCold = c.tempC < 0;
        const color = isCold ? '#38BDF8' : '#10B981';

        const marker = L.circleMarker([c.lat, c.lon], {
          radius: 5,
          fillColor: color,
          color: '#070D18',
          weight: 1.5,
          fillOpacity: 0.95
        }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:190px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <strong style="color:${color}; font-size:12px;">${c.containerId}</strong>
              <span style="background:rgba(56,189,248,0.2); color:#38BDF8; font-weight:700; padding:1px 5px; border-radius:3px; font-size:9px;">IoT ACTIVE</span>
            </div>
            <div><strong>Device:</strong> <code style="color:#38BDF8;">${c.deviceCode}</code></div>
            <div><strong>Vessel:</strong> ${c.shipName}</div>
            <div><strong>Cargo:</strong> ${c.cargoType}</div>
            <div><strong>Chamber:</strong> ${c.tempC}°C | ${c.humidityPct}% RH</div>
            <div><strong>Seal:</strong> <span style="color:#10B981;">${c.sealStatus}</span></div>
            <div><strong>Battery:</strong> ${c.batteryPct}%</div>
            <div style="margin-top:4px; font-size:10px; color:#94A3B8;">GPS: ${c.lat.toFixed(4)}°N, ${c.lon.toFixed(4)}°E</div>
          </div>
        `);
      });
    }

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [center, zoom, baseTileType, layers, focusedRouteId, routes, waveStations, gdacsAlerts, liveVessels, liveContainers]);

  const toggleLayer = (layerKey) => {
    setLayers(prev => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: height, overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
      {/* Map Layer Toolbar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 400,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        background: 'rgba(8, 14, 26, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '6px 8px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
      }}>
        {/* Base Tile Switcher (Dark / Ocean / OSM) */}
        <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
          {[
            { id: 'dark', label: 'Dark View' },
            { id: 'ocean', label: 'Ocean Depth' },
            { id: 'osm', label: 'OSM' }
          ].map(b => (
            <button
              key={b.id}
              onClick={() => setBaseTileType(b.id)}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: baseTileType === b.id ? 'var(--accent-cyan)' : 'transparent',
                color: baseTileType === b.id ? '#070D18' : 'var(--text-primary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={`Switch map to ${b.label}`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* OpenSeaMap Seamarks Toggle */}
        <button
          onClick={() => toggleLayer('seamarks')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${layers.seamarks ? 'var(--safe-teal)' : 'var(--border-subtle)'}`,
            background: layers.seamarks ? 'rgba(45, 212, 191, 0.18)' : 'var(--bg-surface-elevated)',
            color: layers.seamarks ? 'var(--safe-teal)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle OpenSeaMap navigational buoys, beacons, and channels"
        >
          <Icon name="Anchor" size={12} />
          <span>OpenSeaMap</span>
        </button>

        {/* Weather Layer Toggle (Forecast & Observed) */}
        <button
          onClick={() => toggleLayer('waves')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${layers.waves ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: layers.waves ? 'rgba(56, 189, 248, 0.18)' : 'var(--bg-surface-elevated)',
            color: layers.waves ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle Forecast (Open-Meteo) & Observed (NOAA NDBC) marine weather"
        >
          <Icon name="Wind" size={12} />
          <span>Weather (FCST & OBS)</span>
        </button>

        {/* GDACS Storms Toggle */}
        <button
          onClick={() => toggleLayer('gdacs')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${layers.gdacs ? 'var(--hazard-red)' : 'var(--border-subtle)'}`,
            background: layers.gdacs ? 'rgba(248, 113, 113, 0.18)' : 'var(--bg-surface-elevated)',
            color: layers.gdacs ? 'var(--hazard-red)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle GDACS Tropical Cyclone & disaster alerts"
        >
          <Icon name="AlertTriangle" size={12} />
          <span>GDACS Cyclones</span>
        </button>

        {/* AIS Vessels Toggle */}
        <button
          onClick={() => toggleLayer('vessels')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${layers.vessels ? '#ffffff' : 'var(--border-subtle)'}`,
            background: layers.vessels ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-elevated)',
            color: layers.vessels ? '#ffffff' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle AISStream live commercial vessels"
        >
          <Icon name="Ship" size={12} />
          <span>Fleet ({liveVessels.length})</span>
        </button>

        {/* IoT Containers Toggle */}
        <button
          onClick={() => toggleLayer('containers')}
          style={{
            padding: '4px 8px',
            borderRadius: 'var(--radius-xs)',
            border: `1px solid ${layers.containers ? 'var(--accent-cyan)' : 'var(--border-subtle)'}`,
            background: layers.containers ? 'rgba(56, 189, 248, 0.18)' : 'var(--bg-surface-elevated)',
            color: layers.containers ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title="Toggle live IoT shipping containers"
        >
          <Icon name="Radio" size={12} />
          <span>Containers ({liveContainers.length})</span>
        </button>
      </div>

      {/* Attribution Watermark (OpenStreetMap, OpenSeaMap, Open-Meteo, NOAA NDBC, AISStream) */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '10px',
        zIndex: 400,
        background: 'rgba(8, 14, 26, 0.75)',
        backdropFilter: 'blur(4px)',
        padding: '3px 8px',
        borderRadius: 'var(--radius-xs)',
        fontSize: '9.5px',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <span>© OpenStreetMap • OpenSeaMap</span>
        <span>•</span>
        <span>Forecast: Open-Meteo</span>
        <span>•</span>
        <span>Observed: NOAA NDBC</span>
        <span>•</span>
        <span>Alerts: GDACS</span>
        <span>•</span>
        <span>AIS: AISStream.io</span>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          height: '100%',
          width: '100%',
          backgroundColor: '#080E1A'
        }}
      />
    </div>
  );
}
