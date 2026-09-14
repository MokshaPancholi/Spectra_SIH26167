import React from 'react';
import { PanelLeft, Layers, Sliders, Radio, GitCompare, Eye } from 'lucide-react';

export default function ModalityBar({
  onToggleSidebar,
  currentMode,
  routingDecision,
  hasImage1,
  hasImage2,
  evidenceArtifacts,
  activeLayer,
  onSelectLayer,
  opacity,
  onChangeOpacity,
}) {
  // Determine relevant layer tabs based on active routing / imagery
  const renderLayerTabs = () => {
    if (!hasImage1 && !hasImage2) {
      return (
        <div className="modality-tabs">
          <button className="modality-tab active">
            <Layers size={13} />
            <span>Overview</span>
          </button>
        </div>
      );
    }

    if (routingDecision === 'crossmodal' || (hasImage1 && hasImage2 && !evidenceArtifacts?.['Change Mask'])) {
      return (
        <div className="modality-tabs">
          <button
            className={`modality-tab ${activeLayer === 'split' ? 'active' : ''}`}
            onClick={() => onSelectLayer('split')}
          >
            <GitCompare size={13} />
            <span>Compare side by side</span>
          </button>
          <button
            className={`modality-tab ${activeLayer === 'optical' ? 'active' : ''}`}
            onClick={() => onSelectLayer('optical')}
          >
            <Eye size={13} />
            <span>Main image</span>
          </button>
          <button
            className={`modality-tab ${activeLayer === 'sar' ? 'active' : ''}`}
            onClick={() => onSelectLayer('sar')}
          >
            <Radio size={13} />
            <span>Radar view</span>
          </button>
          {evidenceArtifacts?.['Optical Heatmap'] && (
            <button
              className={`modality-tab ${activeLayer === 'fusion' ? 'active' : ''}`}
              onClick={() => onSelectLayer('fusion')}
            >
              <Layers size={13} />
              <span>Compare both views</span>
            </button>
          )}
        </div>
      );
    }

    if (routingDecision === 'change_detect' || evidenceArtifacts?.['Change Mask']) {
      return (
        <div className="modality-tabs">
          <button
            className={`modality-tab ${activeLayer === 'split' ? 'active' : ''}`}
            onClick={() => onSelectLayer('split')}
          >
            <GitCompare size={13} />
            <span>Compare side by side</span>
          </button>
          <button
            className={`modality-tab ${activeLayer === 'before' ? 'active' : ''}`}
            onClick={() => onSelectLayer('before')}
          >
            <span>First image</span>
          </button>
          <button
            className={`modality-tab ${activeLayer === 'after' ? 'active' : ''}`}
            onClick={() => onSelectLayer('after')}
          >
            <span>Second image</span>
          </button>
          <button
            className={`modality-tab ${activeLayer === 'mask' ? 'active' : ''}`}
            onClick={() => onSelectLayer('mask')}
          >
            <Layers size={13} />
            <span>Change highlights</span>
          </button>
        </div>
      );
    }

    // Default VQA / Single-image
    return (
      <div className="modality-tabs">
        <button
          className={`modality-tab ${activeLayer === 'original' ? 'active' : ''}`}
          onClick={() => onSelectLayer('original')}
        >
          <Eye size={13} />
          <span>Main image</span>
        </button>
        {evidenceArtifacts?.['Attention Heatmap'] && (
          <button
            className={`modality-tab ${activeLayer === 'heatmap' ? 'active' : ''}`}
            onClick={() => onSelectLayer('heatmap')}
          >
            <Layers size={13} />
            <span>Highlight key areas</span>
          </button>
        )}
      </div>
    );
  };

  const showOpacityControl =
    activeLayer === 'heatmap' ||
    activeLayer === 'fusion' ||
    activeLayer === 'mask';

  return (
    <div className="modality-bar">
      <div className="modality-left">
        <button
          className="sidebar-toggle-btn"
          title="Toggle Navigation"
          onClick={onToggleSidebar}
        >
          <PanelLeft size={16} />
        </button>
        {renderLayerTabs()}
      </div>

      <div className="modality-right">
        {showOpacityControl && (
          <div className="opacity-control">
            <label>Overlay Opacity</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={opacity}
              onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
              className="opacity-slider"
            />
            <span className="opacity-val">{Math.round(opacity * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
