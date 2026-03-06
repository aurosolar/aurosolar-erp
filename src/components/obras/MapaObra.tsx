'use client';
import { useState, useEffect, useRef } from 'react';

interface MapaObraProps {
  direccion: string | null;
  localidad: string | null;
  provincia: string | null;
  latitud: number | null;
  longitud: number | null;
  obraId: string;
  onCoordsUpdate: (lat: number, lng: number) => void;
}

export function MapaObra({ direccion, localidad, provincia, latitud, longitud, obraId, onCoordsUpdate }: MapaObraProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitud && longitud ? { lat: latitud, lng: longitud } : null
  );

  // Load Leaflet CSS & JS
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;

    const css = document.createElement('link');
    css.id = 'leaflet-css';
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);

    const js = document.createElement('script');
    js.id = 'leaflet-js';
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => initMap();
    document.head.appendChild(js);

    return () => {};
  }, []);

  // Init or update map when coords change
  useEffect(() => {
    if ((window as any).L && mapRef.current) initMap();
  }, [coords]);

  function initMap() {
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    const center = coords || { lat: 39.47, lng: -6.37 }; // Default: Cáceres

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: [center.lat, center.lng],
        zoom: coords ? 16 : 8,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);

      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

      // Click to place marker
      mapInstanceRef.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        placeMarker(lat, lng);
        onCoordsUpdate(lat, lng);
      });
    }

    if (coords) {
      placeMarker(coords.lat, coords.lng);
      mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
    }
  }

  function placeMarker(lat: number, lng: number) {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({
          className: '',
          html: '<div style="background:#10B981;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        }),
      }).addTo(mapInstanceRef.current);
    }

    setCoords({ lat, lng });
  }

  async function geocodeAddress(query: string) {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(query + (provincia ? `, ${provincia}, España` : ', España'));
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        placeMarker(lat, lng);
        onCoordsUpdate(lat, lng);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
        }
      }
    } catch (e) {
      console.error('Geocoding error:', e);
    }
    setSearching(false);
  }

  // Auto-geocode on first load if we have address but no coords
  useEffect(() => {
    if (!coords && direccion && (window as any).L) {
      geocodeAddress(direccion + (localidad ? `, ${localidad}` : ''));
    }
  }, []);

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden relative z-0">
      {/* Search bar */}
      <div className="bg-white p-2 border-b border-slate-100 flex gap-2">
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') geocodeAddress(searchQuery); }}
          placeholder="Buscar dirección..."
          className="flex-1 h-8 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-emerald-400"
        />
        <button onClick={() => geocodeAddress(searchQuery)} disabled={searching}
          className="h-8 px-3 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg transition-colors disabled:opacity-50 shrink-0">
          {searching ? '...' : '🔍 Buscar'}
        </button>
      </div>
      {/* Map */}
      <div ref={mapRef} className="h-40 bg-slate-100 relative z-0" />
      {/* Info bar */}
      <div className="bg-white p-2 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[10px] text-slate-400">
          {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Haz clic en el mapa o busca una dirección'}
        </span>
        {coords && (
          <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noopener"
            className="text-[10px] text-emerald-600 font-semibold hover:underline">
            Abrir en Google Maps ↗
          </a>
        )}
      </div>
    </div>
  );
}
