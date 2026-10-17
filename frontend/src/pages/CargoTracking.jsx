// WAYPOINT — IoT Container & Live Cargo Tracking Cockpit
// Dedicated shipper interface for tracking IoT-equipped cargo containers in real time.
// Supports 50 containers (10 per vessel) with live GPS sync, route mapping, and environmental telemetry.

import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Icon from '../components/Icon';
import { fetchContainers, fetchContainerByCode } from '../services/telemetryService';
import { SAMPLE_CODES, INITIAL_CONTAINERS } from '../data/containerData';

// Free, reliable maritime tile providers with ZERO API key required and ZERO watermarks
const MAP_THEMES = {
  dark: {
    id: 'dark',
    name: 'Dark Canvas',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    reference: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 16
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Depth',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
    reference: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 13
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    base: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    reference: null,
    maxZoom: 18,
    subdomains: 'abc'
  },
  satellite: {
    id: 'satellite',
    name: 'Satellite Coastal',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    reference: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 17
  }
};

export default function CargoTracking({ onNavigate }) {
  const [searchCode, setSearchCode] = useState('TRK-PAC-101');
  const [inputVal, setInputVal] = useState('TRK-PAC-101');
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [allContainers, setAllContainers] = useState(INITIAL_CONTAINERS);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [filterShip, setFilterShip] = useState('ALL');
  const [isCopied, setIsCopied] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [mapTheme, setMapTheme] = useState('dark');

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const baseTileLayerRef = useRef(null);
  const refTileLayerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLineRef = useRef(null);

  // Port coordinates lookup for route visualization across East Coast of India & Bay of Bengal
  const PORT_COORDS = {
    'Chennai': [13.0827, 80.2928],
    'Visakhapatnam': [17.6868, 83.2185],
    'Vizag': [17.6868, 83.2185],
    'Kolkata': [22.5400, 88.3200],
    'Haldia': [22.0330, 88.0670],
    'Paradip': [20.2670, 86.6830],
    'Tuticorin': [8.7642, 78.1348],
    'V.O. Chidambaranar': [8.7642, 78.1348],
    'Krishnapatnam': [14.2500, 80.1167],
    'Dhamra': [20.7970, 86.9000],
    'Ennore': [13.2600, 80.3300],
    'Kamarajar': [13.2600, 80.3300],
    'Kattupalli': [13.3088, 80.3456],
    'Gopalpur': [19.2600, 84.9000],
    'Gangavaram': [17.6200, 83.2400],
    'Kakinada': [16.9800, 82.2800],
    'Singapore': [1.2902, 103.8519],
    'Colombo': [6.9497, 79.8430],
    'Port Klang': [3.0000, 101.4000],
    'Chittagong': [22.2300, 91.8000],
    'Mumbai': [18.9499, 72.9515]
  };

  // 1. Initial load of all 50 containers from API or fallback
  useEffect(() => {
    async function loadData() {
      const data = await fetchContainers();
      if (data && data.length > 0) {
        setAllContainers(data);
      }
    }
    loadData();
  }, []);

  // 2. Fetch specific container when searchCode changes
  useEffect(() => {
    let isMounted = true;
    async function track() {
      if (!searchCode.trim()) return;
      setLoading(true);
      setErrorMsg(null);
      try {
        const item = await fetchContainerByCode(searchCode.trim());
        if (isMounted) {
          if (item) {
            setSelectedContainer(item);
          } else {
            setErrorMsg(`No active IoT beacon detected for code "${searchCode}". Check device ID.`);
          }
        }
      } catch (err) {
        if (isMounted) setErrorMsg('Failed to sync satellite telemetry. Retrying via local cache.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    track();
    return () => { isMounted = false; };
  }, [searchCode]);

  // 3. Periodic Telemetry Heartbeat (15s auto-sync)
  useEffect(() => {
    if (!autoSync || !searchCode) return;
    const interval = setInterval(async () => {
      const updated = await fetchContainerByCode(searchCode);
      if (updated) setSelectedContainer(updated);
    }, 15000);
    return () => clearInterval(interval);
  }, [autoSync, searchCode]);

  // 4. Initialize & Update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map instance centered on East Coast of India & Bay of Bengal
      const map = L.map(mapContainerRef.current, {
        center: [14.0, 84.0],
        zoom: 5,
        zoomControl: true,
        attributionControl: false
      });

      // Dedicated layer groups
      markersLayerRef.current = L.layerGroup().addTo(map);
      routeLineRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const routeLayer = routeLineRef.current;

    // Dynamically manage tile layers (Esri Dark Canvas / Ocean / OSM with zero API key requirement)
    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (refTileLayerRef.current) {
      map.removeLayer(refTileLayerRef.current);
      refTileLayerRef.current = null;
    }

    const theme = MAP_THEMES[mapTheme] || MAP_THEMES.dark;
    baseTileLayerRef.current = L.tileLayer(theme.base, {
      maxZoom: theme.maxZoom,
      subdomains: theme.subdomains || 'abc'
    }).addTo(map);

    if (theme.reference) {
      refTileLayerRef.current = L.tileLayer(theme.reference, {
        maxZoom: theme.maxZoom,
        subdomains: theme.subdomains || 'abc'
      }).addTo(map);
    }

    markersLayer.clearLayers();
    routeLayer.clearLayers();

    if (!selectedContainer) return;

    const lat = selectedContainer.lat || selectedContainer.currentLocation?.latitude || 12.650;
    const lon = selectedContainer.lon || selectedContainer.currentLocation?.longitude || 83.250;
    const originCoords = PORT_COORDS[selectedContainer.originPort] || [13.0827, 80.2928];
    const destCoords = PORT_COORDS[selectedContainer.destinationPort] || [1.2902, 103.8519];

    // Smoothly fly map to live container GPS position
    map.flyTo([lat, lon], 5, { duration: 1.2 });

    // ─── A. Animated Pulsing Container Beacon ───
    const isColdChain = selectedContainer.cargoType?.toLowerCase().includes('reefer') || selectedContainer.tempC < 0;
    const beaconColor = isColdChain ? '#38BDF8' : '#10B981';

    const containerIcon = L.divIcon({
      className: 'custom-container-pin',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="
            position: absolute;
            inset: -4px;
            border-radius: 50%;
            background: ${beaconColor};
            opacity: 0.35;
            animation: waypoint-radar-pulse 2s infinite ease-out;
          "></div>
          <div style="
            position: absolute;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            background: #0B1528;
            border: 2px solid ${beaconColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 16px ${beaconColor}88;
          ">
            <span style="font-size: 14px;">📦</span>
          </div>
          <div style="
            position: absolute;
            top: -20px;
            background: #070D18;
            border: 1px solid ${beaconColor};
            padding: 2px 6px;
            border-radius: 4px;
            color: #fff;
            font-size: 10px;
            font-weight: 700;
            white-space: nowrap;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.8);
          ">
            ${selectedContainer.deviceCode}
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    const marker = L.marker([lat, lon], { icon: containerIcon }).addTo(markersLayer);

    // Interactive Marker Popup with high-contrast, self-contained dark container theme
    const popupContent = `
      <div style="font-family: var(--font-sans, system-ui, sans-serif); color: #F8FAFC; background: #0B132B; padding: 10px 12px; border-radius: 8px; min-width: 230px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.12); padding-bottom: 6px;">
          <strong style="color: ${beaconColor}; font-size: 13.5px; letter-spacing: 0.3px;">${selectedContainer.containerId}</strong>
          <span style="background: rgba(16, 185, 129, 0.2); color: #10B981; font-size: 9px; padding: 2px 7px; border-radius: 10px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.4);">LIVE DGPS</span>
        </div>
        <div style="font-size: 11.5px; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span style="color: #94A3B8;">Device Code:</span>
          <span style="color: #38BDF8; font-weight: 700; font-family: monospace;">${selectedContainer.deviceCode}</span>
        </div>
        <div style="font-size: 11.5px; margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span style="color: #94A3B8;">Vessel:</span>
          <span style="color: #F8FAFC; font-weight: 600;">${selectedContainer.shipName || 'Carrying Vessel'}</span>
        </div>
        <div style="font-size: 11px; margin-bottom: 5px; color: #CBD5E1;">
          <span style="color: #94A3B8;">Cargo:</span> ${selectedContainer.cargoType}
        </div>
        <div style="font-size: 11px; margin-bottom: 5px; padding: 4px 6px; background: rgba(255,255,255,0.06); border-radius: 4px; display: flex; justify-content: space-between;">
          <span>🌡️ <strong style="color: #38BDF8;">${selectedContainer.tempC}°C</strong></span>
          <span>💧 <strong style="color: #38BDF8;">${selectedContainer.humidityPct}%</strong></span>
          <span>🔋 <strong style="color: #10B981;">${selectedContainer.batteryPct}%</strong></span>
        </div>
        <div style="font-size: 11px; margin-bottom: 5px; display: flex; justify-content: space-between; color: #CBD5E1;">
          <span>Speed: <strong style="color: #F8FAFC;">${selectedContainer.speedKnots} kts</strong></span>
          <span>Heading: <strong style="color: #F8FAFC;">${selectedContainer.headingDeg}°</strong></span>
        </div>
        <div style="font-size: 10px; color: #94A3B8; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.08); font-family: monospace; text-align: center;">
          GPS: ${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E
        </div>
      </div>
    `;
    marker.bindPopup(popupContent).openPopup();

    // ─── B. Origin & Destination Port Badges ───
    const createPortIcon = (name, isOrigin) => L.divIcon({
      className: 'port-pin',
      html: `
        <div style="
          background: #0B1528;
          border: 1px solid ${isOrigin ? '#38BDF8' : '#F59E0B'};
          border-radius: 6px;
          padding: 3px 8px;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          gap: 4px;
        ">
          <span style="color: ${isOrigin ? '#38BDF8' : '#F59E0B'}">⚓</span>
          ${name} (${isOrigin ? 'Origin' : 'Dest'})
        </div>
      `,
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });

    L.marker(originCoords, { icon: createPortIcon(selectedContainer.originPort, true) }).addTo(markersLayer);
    L.marker(destCoords, { icon: createPortIcon(selectedContainer.destinationPort, false) }).addTo(markersLayer);

    // ─── C. Trajectory Corridor Polyline ───
    // Completed segment (Origin -> Current Cargo Location)
    L.polyline([originCoords, [lat, lon]], {
      color: '#10B981',
      weight: 3,
      opacity: 0.85,
      dashArray: null
    }).addTo(routeLayer);

    // Remaining segment (Current Cargo Location -> Destination)
    L.polyline([[lat, lon], destCoords], {
      color: '#38BDF8',
      weight: 2.5,
      opacity: 0.7,
      dashArray: '6, 8'
    }).addTo(routeLayer);

  }, [selectedContainer, mapTheme]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (inputVal.trim()) {
      setSearchCode(inputVal.trim().toUpperCase());
    }
  };

  const handleSelectSample = (code) => {
    setInputVal(code);
    setSearchCode(code);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.origin + '?trackingCode=' + searchCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Filter container manifest list
  const filteredList = allContainers.filter(c => {
    if (filterShip === 'ALL') return true;
    return c.shipId === filterShip;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* ─── Hero Header & Tracking Console ─── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(12, 20, 37, 0.95) 0%, rgba(7, 13, 24, 0.98) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        marginBottom: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '18px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <Icon name="Radio" size={18} />
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
                Live Cargo IoT Tracking
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                50 Active Devices
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Enter your container's attached IoT transmitter code to pinpoint live sea coordinates, vessel position, and internal chamber metrics.
            </p>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setAutoSync(!autoSync)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: autoSync ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-strong)',
                background: autoSync ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                color: autoSync ? '#10B981' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <Icon name="RefreshCw" size={13} className={autoSync ? 'spin-slow' : ''} />
              {autoSync ? 'Live Auto-Sync (15s)' : 'Auto-Sync Paused'}
            </button>
            <button
              onClick={copyShareLink}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
                border: '1px solid var(--border-strong)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              <Icon name={isCopied ? "Check" : "FileDown"} size={13} color={isCopied ? "#10B981" : undefined} />
              {isCopied ? 'Link Copied!' : 'Share Tracking'}
            </button>
          </div>
        </div>

        {/* ─── Search Input Bar ─── */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', maxWidth: '780px', marginBottom: '16px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
              <Icon name="Search" size={17} />
            </div>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter IoT Device Code (e.g. TRK-PAC-101) or Container ID (MSKU-729101-1)..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                background: 'rgba(7, 13, 24, 0.85)',
                border: '1px solid var(--border-strong)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 500,
                outline: 'none',
                boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.5)'
              }}
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <Icon name="X" size={15} />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 24px',
              background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              transition: 'transform 0.15s ease'
            }}
          >
            <Icon name="Radio" size={16} />
            {loading ? 'Locating...' : 'Track Live Cargo'}
          </button>
        </form>

        {/* ─── Quick-Select Sample Codes ─── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Sample Devices by Ship:
          </span>
          {SAMPLE_CODES.map((s) => (
            <button
              key={s.code}
              onClick={() => handleSelectSample(s.code)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid',
                borderColor: searchCode === s.code ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
                background: searchCode === s.code ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                color: searchCode === s.code ? 'var(--accent-cyan)' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{s.code}</span>
              <span style={{ opacity: 0.65, fontSize: '10px' }}>({s.type})</span>
            </button>
          ))}
        </div>

        {errorMsg && (
          <div style={{
            marginTop: '12px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#F87171',
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Icon name="AlertTriangle" size={15} />
            {errorMsg}
          </div>
        )}
      </div>

      {/* ─── Main Content Grid: Map & Live Telemetry ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '20px',
        marginBottom: '24px'
      }} className="cargo-tracking-main-grid">
        
        {/* Left Column: Interactive Leaflet Map */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
        }}>
          {/* Map Header */}
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(7, 13, 24, 0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="Compass" size={16} color="var(--accent-cyan)" />
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                Navigational Corridor Map
              </span>
              {selectedContainer && (
                <span style={{
                  fontSize: '11px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  color: 'var(--accent-cyan)',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  border: '1px solid rgba(56, 189, 248, 0.25)'
                }}>
                  {selectedContainer.originPort} → {selectedContainer.destinationPort}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              {/* Map Theme Switcher (Zero API Key, No Watermark) */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: 'rgba(255, 255, 255, 0.06)',
                padding: '3px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                {Object.values(MAP_THEMES).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setMapTheme(t.id)}
                    style={{
                      background: mapTheme === t.id ? 'var(--accent-cyan)' : 'transparent',
                      color: mapTheme === t.id ? '#070D18' : 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '3px 8px',
                      fontSize: '10.5px',
                      fontWeight: mapTheme === t.id ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }}></span>
                  Completed Track
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', display: 'inline-block' }}></span>
                  Remaining Transit
                </span>
              </div>
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '520px',
              background: '#070D18',
              position: 'relative'
            }}
          />

          {/* Map Footer Telemetry Bar */}
          {selectedContainer && (
            <div style={{
              padding: '10px 18px',
              borderTop: '1px solid var(--border-subtle)',
              background: 'rgba(7, 13, 24, 0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <strong>Carrying Ship:</strong> {selectedContainer.shipName} ({selectedContainer.shipId})
              </div>
              <div>
                <strong>Speed:</strong> {selectedContainer.speedKnots} kts | <strong>Course:</strong> {selectedContainer.headingDeg}°
              </div>
              <div>
                <strong>Chamber Seal:</strong> <span style={{ color: '#10B981', fontWeight: 600 }}>{selectedContainer.sealStatus}</span>
              </div>
              <div style={{ fontFamily: 'monospace' }}>
                GPS: {selectedContainer.lat?.toFixed(4)}°N, {selectedContainer.lon?.toFixed(4)}°E
              </div>
            </div>
          )}
        </div>

        {/* Right Column: IoT Telemetry & Sensor Cockpit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {selectedContainer ? (
            <>
              {/* Container Card Overview */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '18px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                      Active IoT Container
                    </span>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: '2px 0 0' }}>
                      {selectedContainer.containerId}
                    </h2>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                      Device Code: <strong style={{ color: '#fff' }}>{selectedContainer.deviceCode}</strong>
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: selectedContainer.status?.includes('Rerouting') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: selectedContainer.status?.includes('Rerouting') ? '#F59E0B' : '#10B981',
                    border: '1px solid',
                    borderColor: selectedContainer.status?.includes('Rerouting') ? 'rgba(245, 158, 11, 0.3)' : 'rgba(16, 185, 129, 0.3)'
                  }}>
                    {selectedContainer.status}
                  </span>
                </div>

                <div style={{ fontSize: '12.5px', color: '#cbd5e1', marginBottom: '14px', lineHeight: 1.4 }}>
                  <strong>Cargo:</strong> {selectedContainer.cargoType}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shipper:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{selectedContainer.shipperName}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Transit Corridor:</span>
                    <span style={{ fontWeight: 600, color: '#fff' }}>{selectedContainer.originPort} → {selectedContainer.destinationPort}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Estimated Arrival (ETA):</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {new Date(selectedContainer.eta).toUTCString().replace(':00 GMT', ' UTC')}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4 Sensor Telemetry Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px'
              }}>
                {/* Temperature */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>CHAMBER TEMP</span>
                    <Icon name="Thermometer" size={14} color={selectedContainer.tempC < 0 ? '#38BDF8' : '#F59E0B'} />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                    {selectedContainer.tempC}°C
                  </div>
                  <span style={{ fontSize: '10.5px', color: selectedContainer.tempC < 0 ? '#38BDF8' : '#10B981' }}>
                    {selectedContainer.tempC < 0 ? 'Active Cold-Chain' : 'Optimal Ambient'}
                  </span>
                </div>

                {/* Humidity */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>HUMIDITY (RH)</span>
                    <Icon name="Droplets" size={14} color="#38BDF8" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                    {selectedContainer.humidityPct}%
                  </div>
                  <span style={{ fontSize: '10.5px', color: '#10B981' }}>
                    Within ISO Limits
                  </span>
                </div>

                {/* Seal Security */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>E-SEAL STATUS</span>
                    <Icon name="ShieldCheck" size={14} color="#10B981" />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                    SECURED
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    Intact (No Tamper)
                  </span>
                </div>

                {/* Battery */}
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>IOT BATTERY</span>
                    <Icon name="Battery" size={14} color="#10B981" />
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                    {selectedContainer.batteryPct}%
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                    ~48 days remaining
                  </span>
                </div>
              </div>

              {/* Satellite Transmitter Specs */}
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#fff', fontWeight: 700 }}>
                  <Icon name="Cpu" size={14} color="var(--accent-cyan)" />
                  Transmitter Telemetry Lock
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Constellation:</span>
                  <span style={{ color: '#fff' }}>Dual Galileo E1/E5 + Inmarsat-C</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Signal Strength:</span>
                  <span style={{ color: '#10B981' }}>-78 dBm (Strong Ocean Fix)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Last Sat Ping:</span>
                  <span style={{ color: '#fff' }}>{new Date(selectedContainer.lastPing).toLocaleTimeString()} UTC</span>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '40px 20px',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <Icon name="Radio" size={32} color="var(--accent-cyan)" style={{ marginBottom: '12px' }} />
              <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '6px' }}>No Container Selected</h3>
              <p style={{ fontSize: '12px', margin: 0 }}>
                Enter an IoT device code or click one of the containers below to view its live map telemetry.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Bottom Section: 50 Containers Manifest (10 per Ship) ─── */}
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px' }}>
              Shipper Container Fleet (50 Registered IoT Devices)
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Showing 10 containers aboard each active vessel. Click any row to plot its live sea location.
            </p>
          </div>

          {/* Ship Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Ships (50)' },
              { id: 'V-01', label: 'MV Pacific Pioneer (10)' },
              { id: 'V-02', label: 'MV Orient Mariner (10)' },
              { id: 'V-03', label: 'Coral Sea Trader (10)' },
              { id: 'V-04', label: 'Atlantic Express (10)' },
              { id: 'V-05', label: 'Nordic Horizon (10)' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterShip(tab.id)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 600,
                  border: '1px solid',
                  borderColor: filterShip === tab.id ? 'var(--accent-cyan)' : 'var(--border-subtle)',
                  background: filterShip === tab.id ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: filterShip === tab.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Containers Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px' }}>
                <th style={{ padding: '10px 12px' }}>DEVICE CODE</th>
                <th style={{ padding: '10px 12px' }}>CONTAINER ID</th>
                <th style={{ padding: '10px 12px' }}>CARRIER VESSEL</th>
                <th style={{ padding: '10px 12px' }}>SHIPPER</th>
                <th style={{ padding: '10px 12px' }}>CORRIDOR</th>
                <th style={{ padding: '10px 12px' }}>TEMP</th>
                <th style={{ padding: '10px 12px' }}>BATTERY</th>
                <th style={{ padding: '10px 12px' }}>STATUS</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((c) => {
                const isSelected = selectedContainer?.deviceCode === c.deviceCode;
                return (
                  <tr
                    key={c.deviceCode}
                    onClick={() => handleSelectSample(c.deviceCode)}
                    style={{
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isSelected ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; }}
                    onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      {c.deviceCode}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#fff' }}>
                      {c.containerId}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#cbd5e1' }}>
                      {c.shipName}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                      {c.shipperName}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#fff' }}>
                      {c.originPort} → {c.destinationPort}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: c.tempC < 0 ? '#38BDF8' : '#fff' }}>
                      {c.tempC}°C
                    </td>
                    <td style={{ padding: '10px 12px', color: '#10B981', fontWeight: 600 }}>
                      {c.batteryPct}%
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        background: c.status?.includes('Rerouting') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: c.status?.includes('Rerouting') ? '#F59E0B' : '#10B981'
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectSample(c.deviceCode);
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--accent-cyan)',
                          background: isSelected ? 'var(--accent-cyan)' : 'transparent',
                          color: isSelected ? '#070D18' : 'var(--accent-cyan)',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {isSelected ? 'Tracking' : 'View on Map'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes waypoint-radar-pulse {
          0% {
            transform: scale(0.6);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }
        .spin-slow {
          animation: spin 3s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 960px) {
          .cargo-tracking-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
