import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  RotateCcw,
  Image as ImageIcon,
  Compass,
} from 'lucide-react';
import ModalityBar from './ModalityBar';
import CompareSlider from './CompareSlider';

export default function VisualWorkspace({
  onToggleSidebar,
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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoom = (delta) => {
    setZoom((prev) => {
      const next = Math.max(0.5, Math.min(prev + delta, 4.0));
      return parseFloat(next.toFixed(2));
    });
  };

  const handleWheel = (e) => {
    if (activeLayer === 'split') return; // Don't zoom on swipe slider
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    handleZoom(delta);
  };

  const handleMouseDown = (e) => {
    if (activeLayer === 'split') return;
    if (e.button !== 0) return; // Left click only
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      workspaceRef.current?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Determine what image to show based on activeLayer
  const getDisplayContent = () => {
    if (!image1 && !image2) {
      return (
        <div className="empty-viewport">
          <div className="empty-viewport-icon">
            <Compass size={32} />
          </div>
          <h3>Geospatial AI Workspace</h3>
          <p>
            Upload satellite imagery or select a benchmark scene from the sidebar to inspect land cover, cross-modal radar fusion, and temporal changes.
          </p>
        </div>
      );
    }

    // Bi-temporal swipe comparison
    if (activeLayer === 'split' && image1 && image2) {
      return (
        <div className="canvas-stage">
          <CompareSlider beforeImg={image1} afterImg={image2} width={520} height={520} />
        </div>
      );
    }

    // Determine base image
    let baseImg = image1;
    if (activeLayer === 'sar' && image2) baseImg = image2;
    if (activeLayer === 'after' && image2) baseImg = image2;
    if (activeLayer === 'before') baseImg = image1;

    // Determine overlay image
    let overlayImg = null;
    if (activeLayer === 'heatmap') {
      overlayImg = evidenceArtifacts?.['Attention Heatmap'];
    } else if (activeLayer === 'fusion') {
      overlayImg = evidenceArtifacts?.['Optical Heatmap'] || evidenceArtifacts?.['SAR Heatmap'];
    } else if (activeLayer === 'mask') {
      overlayImg = evidenceArtifacts?.['Change Mask'];
    }

    // Bounding boxes for change detection
    const boxes = evidenceArtifacts?.['boxes'] || [];

    return (
      <div
        className="canvas-stage"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
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
            style={{ opacity: opacity }}
          />
        )}

        {/* Vector SVG Bounding Boxes */}
        {activeLayer === 'mask' && Array.isArray(boxes) && boxes.length > 0 && (
          <svg
            className="vector-overlay-layer"
            viewBox="0 0 224 224"
            preserveAspectRatio="none"
          >
            {boxes.map((box, i) => {
              let x = 0, y = 0, w = 0, h = 0;
              let label = `Region #${i + 1}`;

              if (Array.isArray(box)) {
                x = box[0] || 0;
                y = box[1] || 0;
                w = box[2] || 0;
                h = box[3] || 0;
              } else if (box && typeof box === 'object') {
                x = box.x1 !== undefined ? box.x1 : (box.x || 0);
                y = box.y1 !== undefined ? box.y1 : (box.y || 0);
                w = box.w !== undefined ? box.w : ((box.x2 !== undefined ? box.x2 : x) - x);
                h = box.h !== undefined ? box.h : ((box.y2 !== undefined ? box.y2 : y) - y);
                if (box.area_pct !== undefined) {
                  label = `R#${i + 1} (${box.area_pct}%)`;
                }
              }

              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(w, 4)}
                    height={Math.max(h, 4)}
                    fill="rgba(244, 63, 94, 0.2)"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <text
                    x={x + 3}
                    y={Math.max(y + 12, 12)}
                    fill="#fff"
                    fontSize="9"
                    fontWeight="bold"
                    filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
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

        {/* Viewport Floating Controls Pill */}
        {(image1 || image2) && (
          <div className="viewport-controls-pill">
            <button
              className="ctrl-btn"
              title="Zoom In"
              onClick={() => handleZoom(0.2)}
            >
              <ZoomIn size={16} />
            </button>
            <span className="zoom-level-badge">{Math.round(zoom * 100)}%</span>
            <button
              className="ctrl-btn"
              title="Zoom Out"
              onClick={() => handleZoom(-0.2)}
            >
              <ZoomOut size={16} />
            </button>
            <div className="ctrl-divider" />
            <button
              className="ctrl-btn"
              title="Reset View"
              onClick={resetView}
            >
              <RotateCcw size={15} />
            </button>
            <button
              className="ctrl-btn"
              title="Toggle Fullscreen"
              onClick={toggleFullscreen}
            >
              <Maximize size={15} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
