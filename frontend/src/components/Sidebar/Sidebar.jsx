import React from 'react';
import { Satellite, Plus, History, Cpu } from 'lucide-react';
import PresetScenes from './PresetScenes';
import AdvancedSettings from './AdvancedSettings';

export default function Sidebar({
  isOpen,
  presets,
  activePresetId,
  onSelectPreset,
  forcedModel,
  onChangeModel,
  onNewAnalysis,
  healthInfo,
}) {
  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="brand-badge">
          <Satellite size={20} />
        </div>
        <div className="brand-info">
          <h1>
            SatQuery AI
            <span>v1.0</span>
          </h1>
          <p>Remote Sensing Multimodal AI</p>
        </div>
      </div>

      <div className="sidebar-action-wrap">
        <button className="new-analysis-btn" onClick={onNewAnalysis}>
          <Plus size={16} />
          <span>Start fresh</span>
        </button>
      </div>

      <div className="sidebar-help-panel">
        <div className="sidebar-help-title">Quick start</div>
        <div className="sidebar-help-list">
          <div className="sidebar-help-item">
            <span>1</span>
            <p>Choose a sample scene or upload your own images.</p>
          </div>
          <div className="sidebar-help-item">
            <span>2</span>
            <p>Ask a question in simple language.</p>
          </div>
          <div className="sidebar-help-item">
            <span>3</span>
            <p>Review the result and switch views if needed.</p>
          </div>
        </div>
      </div>

      <div className="sidebar-scrollable">
        <PresetScenes
          presets={presets}
          activePresetId={activePresetId}
          onSelectPreset={onSelectPreset}
        />

        <AdvancedSettings
          forcedModel={forcedModel}
          onChangeModel={onChangeModel}
          healthInfo={healthInfo}
        />
      </div>

      <div className="sidebar-footer">
        <div className="hardware-indicator">
          <div className="dot-status" />
          <span>{healthInfo?.hardware || 'Engine Ready'}</span>
        </div>
        <span style={{ fontSize: '10px' }}>
          {healthInfo?.mock_mode ? 'CPU Demo' : 'CUDA Active'}
        </span>
      </div>
    </aside>
  );
}
