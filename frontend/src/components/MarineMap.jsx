// WAYPOINT — MarineMap Component (Leaflet wrapper with dark tiles)
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { WAYPOINT_DATA } from '../data/maritimeData';

export default function MarineMap({
  center = [15, 82],
  zoom = 4,
  height = '480px',
  activeLayers = { routes: true, vessels: true, hazards: true, ports: true, risks: false },
  focusedRouteId = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, zoom);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Dark Matter CartoDB tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    
    // Clear dynamic overlay layer group
    if (map._overlayGroup) {
      map.removeLayer(map._overlayGroup);
    }
    const overlayGroup = L.layerGroup().addTo(map);
    map._overlayGroup = overlayGroup;

    // 1. Shipping Routes Layer
    if (activeLayers.routes) {
      WAYPOINT_DATA.routeOptions.forEach(r => {
        const isFocused = focusedRouteId === r.id;
        const color = r.badgeColor === 'teal' ? '#2DD4BF' : '#FBBF24';
        const polyline = L.polyline(r.coords, {
          color: isFocused ? '#38BDF8' : color,
          weight: isFocused ? 4.5 : r.isRecommended ? 3.5 : 2,
          opacity: isFocused ? 1 : r.isRecommended ? 0.9 : 0.65,
          dashArray: r.isRecommended || isFocused ? null : '5, 5'
        }).addTo(overlayGroup);

        polyline.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px; line-height:1.4;">
            <strong style="color:#fff; font-size:13px;">${r.name}</strong><br/>
            <span style="color:#94A3B8;">Cost:</span> <strong style="color:#38BDF8;">$${r.cost.toLocaleString()}</strong><br/>
            <span style="color:#94A3B8;">Transit:</span> ${r.transitDays} Days • <span style="color:#94A3B8;">Distance:</span> ${r.distanceNm} nm<br/>
            <span style="color:#94A3B8;">Risk Score:</span> <strong>${r.riskScore}/100</strong>
          </div>
        `);
      });
    }

    // 2. Ports Layer
    if (activeLayers.ports) {
      WAYPOINT_DATA.ports.forEach(p => {
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 5.5,
          fillColor: '#38BDF8',
          color: '#ffffff',
          weight: 1.5,
          fillOpacity: 0.9
        }).addTo(overlayGroup);

        marker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <strong style="color:#fff;">${p.name}</strong><br/>
            <span style="color:#94A3B8;">Country:</span> ${p.country}<br/>
            <span style="color:#94A3B8;">Berth Queue:</span> ${p.waitHours} hrs (${p.congestion} Congestion)
          </div>
        `);
      });
    }

    // 3. Weather Hazards Layer
    if (activeLayers.hazards) {
      WAYPOINT_DATA.alerts.forEach(a => {
        const color = a.severityClass === 'crit' ? '#F87171' : '#FBBF24';
        const circle = L.circle([a.lat, a.lng], {
          radius: 260000,
          color: color,
          fillColor: color,
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: '4, 4'
        }).addTo(overlayGroup);

        circle.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <span style="color:${color}; font-weight:700; text-transform:uppercase; font-size:10px;">${a.severity} Severity</span><br/>
            <strong style="color:#fff; font-size:13px;">${a.title}</strong><br/>
            <span style="color:#94A3B8;">Region:</span> ${a.region}<br/>
            <p style="margin-top:4px; color:#cbd5e1; font-size:11px;">${a.description}</p>
          </div>
        `);
      });
    }

    // 4. Vessels (AIS) Layer
    if (activeLayers.vessels) {
      WAYPOINT_DATA.vessels.forEach(v => {
        const vesselMarker = L.circleMarker([v.lat, v.lng], {
          radius: 4.5,
          fillColor: '#F8FAFC',
          color: '#080E1A',
          weight: 1.5,
          fillOpacity: 1
        }).addTo(overlayGroup);

        vesselMarker.bindPopup(`
          <div style="font-family:Inter,sans-serif; font-size:12px;">
            <strong style="color:#fff;">${v.name}</strong><br/>
            <span style="color:#94A3B8;">Type:</span> ${v.type}<br/>
            <span style="color:#94A3B8;">Speed / Heading:</span> ${v.speed} • ${v.heading}<br/>
            <span style="color:#94A3B8;">Destination:</span> ${v.dest}
          </div>
        `);
      });
    }

    // 5. Risk Choke Zones Layer
    if (activeLayers.risks) {
      L.circle([9.5, 88.5], {
        radius: 380000,
        color: '#F87171',
        fillColor: '#F87171',
        fillOpacity: 0.22,
        weight: 2,
        dashArray: '5, 5'
      }).addTo(overlayGroup).bindPopup('<strong>Bay of Bengal Cyclonic Core</strong><br/>Gale Force Winds > 55 kts');
    }

    // Invalidate size on resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [center, zoom, activeLayers, focusedRouteId]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        height: height,
        width: '100%',
        backgroundColor: '#080E1A',
        borderRadius: '0 0 var(--radius-md) var(--radius-md)',
        overflow: 'hidden'
      }}
    />
  );
}
