'use client';

import { useEffect, useRef } from 'react';

interface MapMarker {
  id: string | number;
  name: string;
  type: 'hostel' | 'ngo' | 'driver';
  lat: number;
  lng: number;
  details: string;
}

interface LeafletMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  isDark?: boolean;
}

export default function LeafletMap({
  markers = [],
  center = [28.7532, 77.4975], // Default KIET Ghaziabad
  zoom = 12,
  height = '380px',
  isDark = false,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    // Clean up container if it already had a leaflet id from previous render
    if ((mapContainerRef.current as any)._leaflet_id) {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    import('leaflet').then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      // Double check container wasn't occupied in the interim
      if ((mapContainerRef.current as any)._leaflet_id) {
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.off();
            mapInstanceRef.current.remove();
          } catch (_) {}
          mapInstanceRef.current = null;
        }
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      // Default icon fix for Leaflet with Webpack/Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      // Initialize with animation disabled to eliminate '_leaflet_pos' race condition
      const map = L.map(mapContainerRef.current, {
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      }).setView(center, zoom);

      mapInstanceRef.current = map;

      // Tile layer
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      L.tileLayer(tileUrl, {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      // Add default hostel kitchen marker
      const kitchenIcon = L.divIcon({
        className: 'custom-kitchen-marker',
        html: `<div style="background-color: #1f7a4d; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">🍳</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const ngoIcon = L.divIcon({
        className: 'custom-ngo-marker',
        html: `<div style="background-color: #e0a21b; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4);">🤝</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      // Default markers if none provided
      const effectiveMarkers: MapMarker[] = markers.length > 0 ? markers : [
        { id: 1, name: "KIET Main Mess (Central Kitchen)", type: "hostel", lat: 28.7532, lng: 77.4975, details: "Hostel Food Hub · Active Kitchen" },
        { id: 2, name: "Aryabhatta Boys Hostel Canteen", type: "hostel", lat: 28.7510, lng: 77.4950, details: "Block B Canteen" },
        { id: 3, name: "Robin Hood Army Ghaziabad", type: "ngo", lat: 28.6692, lng: 77.4538, details: "Registered NGO Shelter · Cap 120kg" },
        { id: 4, name: "Feeding Hope Community Kitchen", type: "ngo", lat: 28.6986, lng: 77.4211, details: "Community Shelter · Cap 90kg" },
        { id: 5, name: "Seva Food Bank", type: "ngo", lat: 28.7041, lng: 77.4325, details: "Night Shelter · Cap 300kg" },
        { id: 6, name: "Asha Bal Sahara Home", type: "ngo", lat: 28.6850, lng: 77.5120, details: "Bal Shelter · Cap 60kg" },
      ];

      effectiveMarkers.forEach((m) => {
        const icon = m.type === 'hostel' ? kitchenIcon : ngoIcon;
        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 13px; line-height: 1.4; color: #1e293b;">
              <b style="font-size: 14px;">${m.name}</b><br/>
              <span style="color: ${m.type === 'hostel' ? '#1f7a4d' : '#d97706'}; font-weight: 600;">
                ${m.type === 'hostel' ? 'Hostel Mess Location' : 'Registered NGO Recipient'}
              </span><br/>
              <span style="color: #64748b;">${m.details}</span>
            </div>
          `);
      });
    }).catch((err) => {
      console.warn("Leaflet initialization caught error:", err);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.off();
          mapInstanceRef.current.remove();
        } catch (_) {}
        mapInstanceRef.current = null;
      }
      if (mapContainerRef.current && (mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }
    };
  }, [markers, center, zoom, isDark]);

  return (
    <div
      ref={mapContainerRef}
      style={{ height, width: '100%' }}
      className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner overflow-hidden relative"
    />
  );
}
