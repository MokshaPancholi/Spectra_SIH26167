import React, { useState, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Upload,
} from 'lucide-react';
import ModalityBar from './ModalityBar';

export default function VisualWorkspace({
  onToggleSidebar,
  viewMode,
  onChangeViewMode,
  onUploadImages,
  image1,
  image2,
  image1Name,
  image2Name,
  routingDecision,
  evidenceArtifacts,
  activeLayer,
  onSelectLayer,
  opacity,
  onChangeOpacity,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const workspaceRef = useRef(null);
  const uploadInputRef = useRef(null);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleZoom = (delta) => {
    setZoom((prev) => parseFloat(Math.max(0.4, Math.min(prev + delta, 5.0)).toFixed(2)));
  };

  const handleWheel = (e) => {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 0.15 : -0.15);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      workspaceRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const getDisplayContent = () => {
    if (!image1 && !image2) {
      return (
        <div className="empty-viewport">
          <button
            className="empty-upload-btn"
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Upload size={18} />
            <span className="empty-upload-label">Upload image</span>
            <small>Choose one or two satellite images</small>
          </button>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length > 0) onUploadImages(files);
              event.target.value = '';
            }}
          />
          <h3>Image Analysis Workspace</h3>
          <p>
            Upload one or two images to start exploring remotely sensed data and grounded evidence.
          </p>
        </div>
      );
    }
    let baseImg = image1;
    if (activeLayer === 'sar' && image2) baseImg = image2;
    if (activeLayer === 'after' && image2) baseImg = image2;
    if (activeLayer === 'before') baseImg = image1;
    let overlayImg = null;
    if (activeLayer === 'heatmap') {
      overlayImg = evidenceArtifacts?.['Attention Heatmap'];
    } else if (activeLayer === 'fusion') {
      overlayImg = evidenceArtifacts?.['Optical Heatmap'] || evidenceArtifacts?.['SAR Heatmap'];
    } else if (activeLayer === 'mask') {
      overlayImg = evidenceArtifacts?.['Change Mask'] || evidenceArtifacts?.['Bounding Boxes'];
    }

    const boxes = evidenceArtifacts?.['boxes'] || [];

    return (
      <div
        className="canvas-stage"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        {baseImg && (
          <img
            src={baseImg}
            alt="Base Imagery"
            className="stage-image"
            style={{ width: '520px', height: '520px' }}
          />
        )}

        {overlayImg && (
          <img
            src={overlayImg}
            alt="Evidence Overlay"
            className="stage-overlay"
            style={{ opacity }}
          />
        )}

        {}
        {activeLayer === 'mask' && Array.isArray(boxes) && boxes.length > 0 && (
          <svg
            className="vector-overlay-layer"
            viewBox="0 0 224 224"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="box-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>
            {boxes.map((box, i) => {
              let x = 0, y = 0, w = 0, h = 0;
              let label = `R${i + 1}`;

              if (Array.isArray(box)) {
                [x, y, w, h] = box;
              } else if (box && typeof box === 'object') {
                x = box.x1 ?? box.x ?? 0;
                y = box.y1 ?? box.y ?? 0;
                w = box.w ?? ((box.x2 ?? x) - x);
                h = box.h ?? ((box.y2 ?? y) - y);
                if (box.area_pct !== undefined) label = `R${i + 1} (${box.area_pct}%)`;
              }

              return (
                <g key={i} filter="url(#box-glow)">
                  <rect
                    x={x} y={y}
                    width={Math.max(w, 4)} height={Math.max(h, 4)}
                    fill="rgba(244, 63, 94, 0.15)"
                    stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 2"
                  />
                  <text
                    x={x + 3} y={Math.max(y + 11, 11)}
                    fill="#fff" fontSize="8" fontWeight="bold"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.9))"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    );
  };

  return (
    <main className="visual-workspace" ref={workspaceRef}>
      <ModalityBar
        onToggleSidebar={onToggleSidebar}
        viewMode={viewMode}
        onChangeViewMode={onChangeViewMode}
        routingDecision={routingDecision}
        hasImage1={!!image1}
        hasImage2={!!image2}
        evidenceArtifacts={evidenceArtifacts}
        activeLayer={activeLayer}
        onSelectLayer={onSelectLayer}
        opacity={opacity}
        onChangeOpacity={onChangeOpacity}
      />

      <div
        className={`canvas-container ${isPanning ? 'panning' : ''}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {getDisplayContent()}

        {}
        {(image1 || image2) && (
          <div className="viewport-controls-pill">
            <button className="ctrl-btn" title="Zoom In" onClick={() => handleZoom(0.2)}>
              <ZoomIn size={15} />
            </button>
            <span className="zoom-level-badge">{Math.round(zoom * 100)}%</span>
            <button className="ctrl-btn" title="Zoom Out" onClick={() => handleZoom(-0.2)}>
              <ZoomOut size={15} />
            </button>
            <div className="ctrl-divider" />
            <button className="ctrl-btn" title="Reset View" onClick={resetView}>
              <RotateCcw size={14} />
            </button>
            <button className="ctrl-btn" title="Toggle Fullscreen" onClick={toggleFullscreen}>
              <Maximize size={14} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
