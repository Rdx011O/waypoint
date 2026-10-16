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
import { fetchMarineWeather, fetchGdacsAlerts, connectAisStream } from '../services/telemetryService';
import Icon from './Icon';

export default function MarineMap({
  center = [15, 82],
  zoom = 4,
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
  const seaMarksLayerRef = useRef(null);

  // Map Layer States
  const [baseTileType, setBaseTileType] = useState('dark'); // 'dark' | 'osm'
  const [layers, setLayers] = useState({
    routes: propActiveLayers?.routes !== undefined ? propActiveLayers.routes : true,
    ports: propActiveLayers?.ports !== undefined ? propActiveLayers.ports : true,
    vessels: propActiveLayers?.vessels !== undefined ? propActiveLayers.vessels : showVessels,
    hazards: propActiveLayers?.hazards !== undefined ? propActiveLayers.hazards : showHazards,
    seamarks: false, // OpenSeaMap seamark overlay
    waves: true,     // Open-Meteo marine wave stations
    gdacs: true      // GDACS storm alerts
  });

  // Telemetry data states
  const [waveStations, setWaveStations] = useState([]);
  const [gdacsAlerts, setGdacsAlerts] = useState([]);
  const [liveVessels, setLiveVessels] = useState(WAYPOINT_DATA.vessels || []);
  const [selectedStation, setSelectedStation] = useState(null);

  // Sync prop changes
  useEffect(() => {
    if (propActiveLayers) {
      setLayers(prev => ({ ...prev, ...propActiveLayers }));
    }
  }, [propActiveLayers]);

  // Load Open-Meteo & GDACS on mount
  useEffect(() => {
    // 1. Fetch Open-Meteo Marine Data for 4 primary ocean corridors
    const oceanPoints = [
      { id: 'AS', name: 'Arabian Sea Corridor', lat: 15.0, lng: 68.0 },
      { id: 'BOB', name: 'Central Bay of Bengal', lat: 12.0, lng: 86.5 },
      { id: 'EQ', name: 'Equatorial Ocean Track', lat: 3.5, lng: 82.0 },
      { id: 'MAL', name: 'Malacca Strait Approach', lat: 5.5, lng: 97.0 }
    ];

    async function loadTelemetry() {
      const stationResults = [];
      for (const pt of oceanPoints) {
        const weather = await fetchMarineWeather(pt.lat, pt.lng);
        stationResults.push({ ...pt, ...weather });
      }
      setWaveStations(stationResults);

      // 2. Fetch GDACS Tropical Cyclone alerts
      const alerts = await fetchGdacsAlerts();
      setGdacsAlerts(alerts);
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
    }

    let tileUrl;
    let maxZoom = 18;
    let subdomains = 'abc';

    if (baseTileType === 'dark') {
      // High-contrast clean dark maritime canvas (Free, no watermark)
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 16;
    } else if (baseTileType === 'ocean') {
      // Bathymetric marine depth contours and ocean ridges (Free, no watermark)
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 13;
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

    // --- C. Open-Meteo Marine Waves Layer ---
    if (layers.waves && waveStations.length > 0) {
      waveStations.forEach(st => {
        const isSwellHigh = st.waveHeight >= 2.5;
        const waveIcon = L.divIcon({
          className: 'marine-wave-pin',
          html: `
            <div style="
              background: ${isSwellHigh ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)'};
              color: #070D18;
              font-family: 'JetBrains Mono', monospace;
              font-weight: 800;
              font-size: 10px;
              padding: 2px 6px;
              border-radius: 10px;
              border: 1px solid #ffffff;
              display: flex;
              align-items: center;
              gap: 3px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.5);
              white-space: nowrap;
            ">
              <span>🌊</span>
              <span>${st.waveHeight}m</span>
            </div>
          `,
          iconSize: [50, 20],
          iconAnchor: [25, 10]
        });

        const marker = L.marker([st.lat, st.lng], { icon: waveIcon }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; min-width:180px;">
            <strong style="color:#fff; font-size:13px;">${st.name}</strong><br/>
            <span style="color:#94A3B8;">Source:</span> <span style="color:#38BDF8;">Open-Meteo Marine (CC BY 4.0)</span><br/>
            <div style="margin-top:6px; display:grid; grid-template-columns:1fr 1fr; gap:6px; font-family:'JetBrains Mono',monospace;">
              <div>Wave Height: <strong>${st.waveHeight}m</strong></div>
              <div>Swell Height: <strong>${st.swellHeight}m</strong></div>
              <div>Period: <strong>${st.wavePeriod}s</strong></div>
              <div>Direction: <strong>${st.waveDirection}°</strong></div>
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

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [center, zoom, baseTileType, layers, focusedRouteId, routes, waveStations, gdacsAlerts, liveVessels]);

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

        {/* Open-Meteo Waves Toggle */}
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
          title="Toggle Open-Meteo real-time wave heights & swell stations"
        >
          <Icon name="Wind" size={12} />
          <span>Open-Meteo Waves</span>
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
          <span>AISStream ({liveVessels.length})</span>
        </button>
      </div>

      {/* Attribution Watermark (OpenStreetMap, OpenSeaMap, Open-Meteo CC BY 4.0, AISStream) */}
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
        <span>Weather: Open-Meteo (CC BY 4.0)</span>
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
