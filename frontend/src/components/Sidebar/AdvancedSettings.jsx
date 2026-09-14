import React from 'react';
import { Sliders, Cpu, Sparkles } from 'lucide-react';

export default function AdvancedSettings({ forcedModel, onChangeModel, healthInfo }) {
  const modes = [
    { id: 'auto', label: 'Smart mode (recommended)' },
    { id: 'vqa', label: 'Ask about the image' },
    { id: 'crossmodal', label: 'Compare image + radar' },
    { id: 'change_detect', label: 'Spot changes over time' },
    { id: 'geospatial_qa', label: 'Ask about map details' },
  ];

  return (
    <div className="advanced-settings-section">
      <div className="section-label">
        <span>Choose how to analyze</span>
        <Sparkles size={12} color="var(--accent-cyan)" />
      </div>
      <p style={{ margin: '0 0 12px', fontSize: '11px', lineHeight: 1.5, color: 'var(--text-muted)' }}>
        Most first-time users should start in Smart mode.
      </p>
      <div className="mode-selector-wrap">
        <div className="mode-pills">
          {modes.map((m) => (
            <button
              key={m.id}
              className={`mode-pill ${forcedModel === m.id ? 'active' : ''}`}
              onClick={() => onChangeModel(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
