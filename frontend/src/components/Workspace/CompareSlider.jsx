import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

export default function CompareSlider({ beforeImg, afterImg, width = 600, height = 600 }) {
  const [sliderPos, setSliderPos] = useState(50);
  const isDragging = useRef(false);
  const containerRef = useRef(null);

  const handleMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let pos = (x / rect.width) * 100;
    if (pos < 2) pos = 2;
    if (pos > 98) pos = 98;
    setSliderPos(pos);
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging.current || !e.touches[0]) return;
    handleMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      isDragging.current = false;
    };
    const onGlobalMouseMove = (e) => {
      if (isDragging.current) handleMove(e.clientX);
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('mousemove', onGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('mousemove', onGlobalMouseMove);
    };
  }, [handleMove]);

  return (
    <div
      ref={containerRef}
      className="compare-container"
      style={{ width: `${width}px`, height: `${height}px` }}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
      onTouchMove={handleTouchMove}
    >
      {/* Before Layer (clipped to sliderPos) */}
      <div
        className="compare-layer-before"
        style={{ width: `${sliderPos}%` }}
      >
        <img
          src={beforeImg}
          alt="Before Acquisition (T1)"
          style={{ width: `${width}px`, height: `${height}px`, maxWidth: 'none', objectFit: 'contain' }}
        />
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          color: '#38bdf8'
        }}>
          BEFORE (T1)
        </div>
      </div>

      {/* After Layer (full width background) */}
      <div className="compare-layer-after" style={{ width: `${width}px`, height: `${height}px` }}>
        <img
          src={afterImg}
          alt="After Acquisition (T2)"
          style={{ width: `${width}px`, height: `${height}px`, objectFit: 'contain' }}
        />
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 600,
          color: '#10b981'
        }}>
          AFTER (T2)
        </div>
      </div>

      {/* Handle */}
      <div
        className="compare-handle"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="compare-line" />
        <div className="compare-knob">
          <ChevronsLeftRight size={14} />
        </div>
      </div>
    </div>
  );
}
