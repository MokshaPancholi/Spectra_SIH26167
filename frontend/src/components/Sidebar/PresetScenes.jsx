import React from 'react';
import { Layers, Radio, GitCompare } from 'lucide-react';

export default function PresetScenes({ presets, activePresetId, onSelectPreset }) {
  const getIcon = (cat) => {
    if (cat.includes('VQA')) return <Layers size={14} className="text-cyan-400" />;
    if (cat.includes('Fusion')) return <Radio size={14} className="text-indigo-400" />;
    return <GitCompare size={14} className="text-emerald-400" />;
  };

  return (
    <div className="presets-section">
      <div className="section-label">
        <span>Sample scenes</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Quick start</span>
      </div>
      <div className="presets-grid">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className={`preset-card ${activePresetId === preset.id ? 'active' : ''}`}
            onClick={() => onSelectPreset(preset)}
          >
            <div className="preset-top">
              <img
                src={preset.image1}
                alt={preset.title}
                className="preset-thumb"
              />
              <div className="preset-title-wrap">
                <div className="preset-title">{preset.title}</div>
                <div className="preset-badge">{preset.category}</div>
              </div>
            </div>
            <div className="preset-desc">{preset.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
