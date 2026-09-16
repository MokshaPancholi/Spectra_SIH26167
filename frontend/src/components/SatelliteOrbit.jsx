import { useEffect, useRef } from 'react';


export default function SatelliteOrbit({ size = 420 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    let frame;
    let angle = 0;
    let scanAngle = 0;

    const animate = () => {
      const svg = svgRef.current;
      if (!svg) return;

      angle = (angle + 0.35) % 360;
      scanAngle = (scanAngle + 0.6) % 360;

      const sat = svg.querySelector('#sat-dot');
      const scanBeam = svg.querySelector('#scan-beam');
      const satGlow = svg.querySelector('#sat-glow');

      if (sat) {
        const cx = 210 + 155 * Math.cos((angle * Math.PI) / 180);
        const cy = 210 + 65 * Math.sin((angle * Math.PI) / 180);
        sat.setAttribute('cx', cx);
        sat.setAttribute('cy', cy);
        if (satGlow) {
          satGlow.setAttribute('cx', cx);
          satGlow.setAttribute('cy', cy);
        }
      }

      if (scanBeam) {
        const x2 = 210 + 210 * Math.cos((scanAngle * Math.PI) / 180);
        const y2 = 210 + 210 * Math.sin((scanAngle * Math.PI) / 180);
        scanBeam.setAttribute('x2', x2);
        scanBeam.setAttribute('y2', y2);
      }

      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <defs>
        <radialGradient id="planetGrad" cx="38%" cy="32%" r="60%">
          <stop offset="0%" stopColor="#6abf8a" />
          <stop offset="45%" stopColor="#2d7a6e" />
          <stop offset="72%" stopColor="#133550" />
          <stop offset="100%" stopColor="#090e18" />
        </radialGradient>
        <radialGradient id="glintGrad" cx="30%" cy="25%" r="60%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.28)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="satGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="orbitGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="scanGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.25)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {}
      <ellipse
        cx={cx} cy={cy} rx="155" ry="65"
        fill="none"
        stroke="rgba(56,189,248,0.35)"
        strokeWidth="1"
        filter="url(#orbitGlow)"
      />
      {}
      <ellipse
        cx={cx} cy={cy} rx="185" ry="82"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.75"
        strokeDasharray="6 10"
      />

      {}
      <line
        id="scan-beam"
        x1={cx} y1={cy}
        x2={cx + 210} y2={cy}
        stroke="rgba(56,189,248,0.18)"
        strokeWidth="1.5"
      />

      {}
      <circle cx={cx} cy={cy} r="88" fill="url(#planetGrad)" />
      {}
      <ellipse cx={cx - 22} cy={cy - 18} rx="32" ry="14" fill="rgba(155,220,135,0.5)" style={{ filter: 'blur(4px)' }} />
      <ellipse cx={cx + 25} cy={cy + 22} rx="24" ry="11" fill="rgba(155,220,135,0.4)" style={{ filter: 'blur(3px)' }} />
      {}
      <circle cx={cx} cy={cy} r="88" fill="url(#glintGrad)" />
      {}
      <circle cx={cx} cy={cy} r="92" fill="none" stroke="rgba(96,200,168,0.12)" strokeWidth="8" />

      {}
      <line x1={cx - 185} y1={cy} x2={cx + 185} y2={cy} stroke="rgba(56,189,248,0.06)" strokeWidth="1" />
      <line x1={cx} y1={cy - 90} x2={cx} y2={cy + 90} stroke="rgba(56,189,248,0.06)" strokeWidth="1" />

      {}
      <circle id="sat-glow" cx={cx + 155} cy={cy} r="8" fill="rgba(56,189,248,0.25)" filter="url(#satGlow)" />
      {}
      <circle id="sat-dot" cx={cx + 155} cy={cy} r="4.5" fill="#38bdf8" />

      {}
      {[0, 90, 180, 270].map((deg, i) => (
        <circle
          key={i}
          cx={cx + 155 * Math.cos((deg * Math.PI) / 180)}
          cy={cy + 65 * Math.sin((deg * Math.PI) / 180)}
          r="2.5"
          fill="rgba(56,189,248,0.4)"
        />
      ))}

      {}
      <text x={cx - 175} y={cy - 72} fill="rgba(215,255,85,0.7)" fontSize="8" fontFamily="monospace" letterSpacing="2">01 OPTICAL+SAR</text>
      <text x={cx + 80} y={cy + 85} fill="rgba(56,189,248,0.6)" fontSize="8" fontFamily="monospace" letterSpacing="2">LIVE EVIDENCE</text>
    </svg>
  );
}
