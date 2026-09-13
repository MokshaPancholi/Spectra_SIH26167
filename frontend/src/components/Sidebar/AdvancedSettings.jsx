import React from 'react';
import { Sliders, Cpu, Sparkles } from 'lucide-react';

export default function AdvancedSettings({ forcedModel, onChangeModel, healthInfo }) {
  const modes = [
    { id: 'auto', label: 'AUTO (Agent)' },
    { id: 'vqa', label: 'VQA (LoRA)' },
    { id: 'crossmodal', label: 'Opt-SAR Fusion' },
    { id: 'change_detect', label: 'Change Detect' },
    { id: 'geospatial_qa', label: 'Geospatial QA' },
  ];

  return (
    <div className="advanced-settings-section">
      <div className="section-label">
        <span>Routing Mode</span>
        <Sparkles size={12} color="var(--accent-cyan)" />
      </div>
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
