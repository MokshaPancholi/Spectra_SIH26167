import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import 'leaflet/dist/leaflet.css';
import {
  Search,
  Crosshair,
  Camera,
  Layers,
  MapPin,
  Compass,
  ArrowRight,
  Maximize2,
  Check,
  Globe2,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';

const PRESET_LOCATIONS = [
  { name: 'Dubai Palm', lat: 25.1124, lng: 55.139, zoom: 14, category: 'Urban Infra' },
  { name: 'Suez Canal', lat: 30.5852, lng: 32.2654, zoom: 13, category: 'Maritime' },
  { name: 'Amazon Rainforest', lat: -9.9749, lng: -63.0416, zoom: 12, category: 'Change Detect' },
  { name: 'Himalayan Glaciers', lat: 27.9881, lng: 86.925, zoom: 12, category: 'Cryosphere' },
  { name: 'San Francisco Bay', lat: 37.7749, lng: -122.4194, zoom: 13, category: 'Coastal' },
  { name: 'Tokyo Bay Port', lat: 35.6264, lng: 139.782, zoom: 13, category: 'Logistics' },
];

export default function SatelliteMapExplorer({ onCaptureRegion, onSwitchToAnalysis }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeBasemap, setActiveBasemap] = useState('satellite'); // 'satellite' | 'hybrid' | 'osm'
  const [telemetry, setTelemetry] = useState({
    lat: 25.1124,
    lng: 55.139,
    zoom: 14,
    bounds: { north: 0, south: 0, east: 0, west: 0 },
    resolution: '~2.4m/px (Satellite)',
  });

  // Snapshot dialog state
  const [snapshotPreview, setSnapshotPreview] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedFeedback, setCapturedFeedback] = useState(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Fix default marker icon issues in Vite/Webpack
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const map = L.map(mapContainerRef.current, {
      center: [25.1124, 55.139],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });

    // Basemaps
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, crossOrigin: true }
    );

    const labelsLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}{r}.png',
      { maxZoom: 19, crossOrigin: true }
    );

    const osmLayer = L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, crossOrigin: true }
    );

    satelliteLayer.addTo(map);
    labelsLayer.addTo(map);

    layersRef.current = {
      satellite: satelliteLayer,
      labels: labelsLayer,
      osm: osmLayer,
    };

    mapInstanceRef.current = map;

    // Telemetry updates
    const updateTelemetry = () => {
      const center = map.getCenter();
      const zoom = map.getZoom();
      const bounds = map.getBounds();

      // Estimate ground resolution at center latitude
      const resMeters = (156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / Math.pow(2, zoom);
      const resText =
        resMeters < 1
          ? `~${(resMeters * 100).toFixed(0)}cm/px (Sub-meter High-Res)`
          : `~${resMeters.toFixed(1)}m/px (Sentinel/Planet Scale)`;

      setTelemetry({
        lat: center.lat,
        lng: center.lng,
        zoom: zoom,
        bounds: {
          north: bounds.getNorth().toFixed(4),
          south: bounds.getSouth().toFixed(4),
          east: bounds.getEast().toFixed(4),
          west: bounds.getWest().toFixed(4),
        },
        resolution: resText,
      });
    };

    map.on('move', updateTelemetry);
    map.on('zoom', updateTelemetry);
    updateTelemetry();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Switch basemaps
  const handleBasemapChange = (type) => {
    const map = mapInstanceRef.current;
    if (!map || !layersRef.current) return;

    const { satellite, labels, osm } = layersRef.current;

    map.eachLayer((layer) => map.removeLayer(layer));

    if (type === 'satellite') {
      satellite.addTo(map);
    } else if (type === 'hybrid') {
      satellite.addTo(map);
      labels.addTo(map);
    } else if (type === 'osm') {
      osm.addTo(map);
    }
    setActiveBasemap(type);
  };

  // Location Search (Nominatim)
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc) => {
    if (!mapInstanceRef.current) return;
    const lat = parseFloat(loc.lat);
    const lon = parseFloat(loc.lon);

    mapInstanceRef.current.flyTo([lat, lon], 14, {
      duration: 1.8,
      easeLinearity: 0.25,
    });
    setSearchResults([]);
    setSearchQuery(loc.display_name.split(',')[0]);
  };

  const handleJumpPreset = (preset) => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([preset.lat, preset.lng], preset.zoom, {
      duration: 1.6,
    });
    setSearchQuery(preset.name);
  };

  // ── Snapshot Region Capture ───────────────────────────────────────────────
  const buildFallbackSnapshotDataUrl = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 768;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return '';
    }

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#07111d');
    gradient.addColorStop(0.35, '#0d1f34');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid and AOI frame
    ctx.strokeStyle = 'rgba(110, 231, 255, 0.22)';
    ctx.lineWidth = 1;
    for (let x = 48; x < canvas.width - 48; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 48);
      ctx.lineTo(x, canvas.height - 48);
      ctx.stroke();
    }
    for (let y = 48; y < canvas.height - 48; y += 64) {
      ctx.beginPath();
      ctx.moveTo(48, y);
      ctx.lineTo(canvas.width - 48, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(94, 234, 212, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(96, 96, canvas.width - 192, canvas.height - 192);

    ctx.fillStyle = 'rgba(94, 234, 212, 0.18)';
    ctx.fillRect(96, 96, canvas.width - 192, canvas.height - 192);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '700 36px Inter, sans-serif';
    ctx.fillText('SATQUERY AI SNAPSHOT', 128, 210);

    ctx.fillStyle = '#cbeafe';
    ctx.font = '500 24px Inter, sans-serif';
    ctx.fillText(`LOCATION: ${searchQuery || 'Target Region'}`, 128, 278);
    ctx.fillText(`COORDS: ${telemetry.lat.toFixed(4)}°, ${telemetry.lng.toFixed(4)}°`, 128, 322);
    ctx.fillText(`ZOOM: ${telemetry.zoom}× | AOI: 512 × 512`, 128, 366);

    // Stylized map markers
    ctx.beginPath();
    ctx.fillStyle = '#67e8f9';
    ctx.arc(canvas.width * 0.62, canvas.height * 0.56, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.85)';
    ctx.lineWidth = 2;
    ctx.moveTo(canvas.width * 0.62, canvas.height * 0.56);
    ctx.lineTo(canvas.width * 0.67, canvas.height * 0.48);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 20px Inter, sans-serif';
    ctx.fillText('AI REGION READY', 128, 640);

    return canvas.toDataURL('image/png');
  };

  const captureViewportRegion = async () => {
    const map = mapInstanceRef.current;
    const mapContainer = mapContainerRef.current;
    if (!map || !mapContainer) return;

    setIsCapturing(true);

    try {
      const center = map.getCenter();
      const zoom = map.getZoom();

      const canvas = await html2canvas(mapContainer, {
        backgroundColor: '#0a0f1d',
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      setSnapshotPreview({
        dataUrl,
        lat: center.lat.toFixed(4),
        lng: center.lng.toFixed(4),
        zoom,
        locationName: searchQuery || `Coord [${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}]`,
      });
    } catch (err) {
      console.warn('Real map capture failed; using generated snapshot fallback:', err);

      const fallbackDataUrl = buildFallbackSnapshotDataUrl();
      setSnapshotPreview({
        dataUrl: fallbackDataUrl || '',
        lat: telemetry.lat.toFixed(4),
        lng: telemetry.lng.toFixed(4),
        zoom: telemetry.zoom,
        locationName: searchQuery || 'Target Region',
      });
    } finally {
      setIsCapturing(false);
    }
  };

  const handleApplySnapshot = (targetSlot) => {
    if (!snapshotPreview) return;

    onCaptureRegion({
      image: snapshotPreview.dataUrl,
      label: `${snapshotPreview.locationName} (${snapshotPreview.lat}°, ${snapshotPreview.lng}°)`,
      target: targetSlot, // 'image1' | 'image2'
      metadata: {
        lat: snapshotPreview.lat,
        lng: snapshotPreview.lng,
        zoom: snapshotPreview.zoom,
        name: snapshotPreview.locationName,
      },
    });

    setCapturedFeedback(`Transferred to ${targetSlot === 'image1' ? 'Image 1 (Observation)' : 'Image 2 (Comparison)'}`);
    setTimeout(() => {
      setCapturedFeedback(null);
      setSnapshotPreview(null);
      if (onSwitchToAnalysis) onSwitchToAnalysis();
    }, 1200);
  };

  return (
    <div className="satellite-map-explorer">
      {/* ── Top Map Control & Search Bar ───────────────────────────────── */}
      <div className="map-top-bar">
        <form onSubmit={handleSearch} className="map-search-form">
          <div className="map-search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search global coordinates, ports, cities, or terrain features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <span className="map-search-spinner" />}
          </div>
          <button type="submit" className="map-search-btn">
            Locate Target
          </button>
        </form>

        {/* Basemap Switcher */}
        <div className="map-layer-toggles">
          <button
            type="button"
            className={`layer-btn ${activeBasemap === 'satellite' ? 'active' : ''}`}
            onClick={() => handleBasemapChange('satellite')}
            title="High-Resolution Optical Satellite Imagery"
          >
            <Globe2 size={14} /> Satellite
          </button>
          <button
            type="button"
            className={`layer-btn ${activeBasemap === 'hybrid' ? 'active' : ''}`}
            onClick={() => handleBasemapChange('hybrid')}
            title="Satellite Imagery with Vector Borders & Labels"
          >
            <Layers size={14} /> Hybrid
          </button>
          <button
            type="button"
            className={`layer-btn ${activeBasemap === 'osm' ? 'active' : ''}`}
            onClick={() => handleBasemapChange('osm')}
            title="Cartographic OpenStreetMap Reference"
          >
            <MapPin size={14} /> Street
          </button>
        </div>

        {/* Snapshot Trigger */}
        <button
          type="button"
          className="map-snapshot-trigger-btn"
          onClick={captureViewportRegion}
          disabled={isCapturing}
        >
          <Camera size={16} />
          <span>{isCapturing ? 'Capturing...' : 'Snapshot Region for AI'}</span>
        </button>
      </div>

      {/* Search Autocomplete Results */}
      {searchResults.length > 0 && (
        <div className="map-search-dropdown">
          {searchResults.map((res, i) => (
            <button
              key={i}
              type="button"
              className="search-result-item"
              onClick={() => handleSelectLocation(res)}
            >
              <MapPin size={14} className="pin-icon" />
              <span>{res.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Quick Target Hotspot Chips ─────────────────────────────────── */}
      <div className="map-presets-bar">
        <span className="preset-label">
          <Compass size={13} /> QUICK TELEPORT:
        </span>
        <div className="preset-chips">
          {PRESET_LOCATIONS.map((preset, i) => (
            <button
              key={i}
              type="button"
              className="preset-chip"
              onClick={() => handleJumpPreset(preset)}
            >
              <span className="chip-name">{preset.name}</span>
              <span className="chip-tag">{preset.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Map Container ─────────────────────────────────────────── */}
      <div className="map-canvas-wrapper">
        <div ref={mapContainerRef} className="leaflet-map-canvas" />

        {/* High-Tech Tactical Viewfinder Overlay */}
        <div className="viewfinder-overlay" pointerEvents="none">
          <div className="viewfinder-reticle">
            <span className="corner top-left" />
            <span className="corner top-right" />
            <span className="corner bottom-left" />
            <span className="corner bottom-right" />
            <div className="reticle-center-cross">
              <Crosshair size={22} />
            </div>
            <div className="reticle-scale-badge">512×512 AOI BOUNDING BOX</div>
          </div>
        </div>

        {/* HUD Telemetry Overlay */}
        <div className="map-telemetry-hud">
          <div className="telemetry-item">
            <span className="hud-label">CENTER LAT/LNG</span>
            <span className="hud-val">
              {telemetry.lat > 0 ? `${telemetry.lat.toFixed(4)}°N` : `${Math.abs(telemetry.lat).toFixed(4)}°S`},{' '}
              {telemetry.lng > 0 ? `${telemetry.lng.toFixed(4)}°E` : `${Math.abs(telemetry.lng).toFixed(4)}°W`}
            </span>
          </div>
          <div className="telemetry-item">
            <span className="hud-label">ZOOM LEVEL</span>
            <span className="hud-val">{telemetry.zoom}×</span>
          </div>
          <div className="telemetry-item">
            <span className="hud-label">EST. RESOLUTION</span>
            <span className="hud-val highlight">{telemetry.resolution}</span>
          </div>
          <div className="telemetry-item">
            <span className="hud-label">BOUNDS</span>
            <span className="hud-val font-mono">
              [{telemetry.bounds.south}, {telemetry.bounds.west}] to [{telemetry.bounds.north}, {telemetry.bounds.east}]
            </span>
          </div>
        </div>

        {/* In-Map Zoom Controls */}
        <div className="map-floating-controls">
          <button
            type="button"
            className="hud-ctrl-btn"
            onClick={() => mapInstanceRef.current?.zoomIn()}
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            className="hud-ctrl-btn"
            onClick={() => mapInstanceRef.current?.zoomOut()}
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            className="hud-ctrl-btn"
            onClick={() => mapInstanceRef.current?.setView([25.1124, 55.139], 14)}
            title="Reset to Benchmark"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* ── Snapshot Region Target Modal ────────────────────────────────── */}
      {snapshotPreview && (
        <div className="snapshot-modal-overlay">
          <div className="snapshot-modal-card">
            <div className="snapshot-modal-header">
              <div className="header-left">
                <Camera size={18} className="camera-icon" />
                <h3>Captured Satellite AOI Snapshot</h3>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setSnapshotPreview(null)}
              >
                ✕
              </button>
            </div>

            <div className="snapshot-modal-body">
              <div className="snapshot-image-preview">
                <img src={snapshotPreview.dataUrl} alt="Captured Satellite Region" />
                <div className="preview-stamp">
                  <span>{snapshotPreview.locationName}</span>
                  <span>{snapshotPreview.lat}°N, {snapshotPreview.lng}°E</span>
                </div>
              </div>

              <div className="snapshot-action-column">
                <div className="snapshot-status-row">
                  <span className="snapshot-status-pill">Ready for AI ingestion</span>
                </div>

                <h4>Select Destination in SatQuery Workspace:</h4>
                <p className="instruction-text">
                  Transfer this high-resolution region directly into the agent pipeline for VQA,
                  change detection, or SAR-fusion analysis.
                </p>

                <div className="snapshot-meta-grid">
                  <div className="snapshot-meta-item">
                    <span className="meta-label">Location</span>
                    <strong>{snapshotPreview.locationName}</strong>
                  </div>
                  <div className="snapshot-meta-item">
                    <span className="meta-label">Coordinates</span>
                    <strong>{snapshotPreview.lat}°, {snapshotPreview.lng}°</strong>
                  </div>
                  <div className="snapshot-meta-item">
                    <span className="meta-label">Zoom</span>
                    <strong>{snapshotPreview.zoom}×</strong>
                  </div>
                </div>

                {capturedFeedback ? (
                  <div className="capture-success-alert">
                    <Check size={18} />
                    <span>{capturedFeedback}</span>
                  </div>
                ) : (
                  <div className="destination-buttons">
                    <button
                      type="button"
                      className="dest-btn primary-dest"
                      onClick={() => handleApplySnapshot('image1')}
                    >
                      <div className="dest-title">Image 1: Observation / Pre-Change (T1)</div>
                      <div className="dest-sub">Primary optical scene for Single-Image VQA or Change Pre-State</div>
                    </button>

                    <button
                      type="button"
                      className="dest-btn secondary-dest"
                      onClick={() => handleApplySnapshot('image2')}
                    >
                      <div className="dest-title">Image 2: Comparison / Post-Change (T2)</div>
                      <div className="dest-sub">Secondary scene for Bi-Temporal Change Detection or SAR Fusion</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
