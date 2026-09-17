import React from 'react';
import { PanelLeft, Layers, Radio, Eye, Globe2, Upload } from 'lucide-react';

export default function ModalityBar({
  onToggleSidebar,
  viewMode,
  onChangeViewMode,
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
  const renderLayerTabs = () => {
    if (!hasImage1 && !hasImage2) {
      return (
        <div className="modality-tabs">
          <button className="modality-tab active" type="button" aria-label="No image uploaded">
            <Upload size={13} />
            <span>No image uploaded</span>
          </button>
        </div>
      );
    }

    if (routingDecision === 'crossmodal' || (hasImage1 && hasImage2 && !evidenceArtifacts?.['Change Mask'])) {
      return (
        <div className="modality-tabs">
          <button
            className={`modality-tab ${activeLayer === 'optical' ? 'active' : ''}`}
            onClick={() => onSelectLayer('optical')}
            aria-label="Main image"
          >
            <Eye size={13} />
            <span>Image 1</span>
          </button>
          <button
            className={`modality-tab radar-tab ${activeLayer === 'sar' ? 'active' : ''}`}
            onClick={() => onSelectLayer('sar')}
          >
            <Radio size={13} />
            <span>Image 2</span>
          </button>
          {evidenceArtifacts?.['Optical Heatmap'] && (
            <button
              className={`modality-tab ${activeLayer === 'fusion' ? 'active' : ''}`}
              onClick={() => onSelectLayer('fusion')}
              aria-label="Compare both views"
            >
              <Layers size={13} />
            </button>
          )}
        </div>
      );
    }

    if (routingDecision === 'change_detect' || evidenceArtifacts?.['Change Mask']) {
      return (
        <div className="modality-tabs">
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
            aria-label="Change highlights"
          >
            <Layers size={13} />
          </button>
        </div>
      );
    }
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
            aria-label="Highlight key areas"
          >
            <Layers size={13} />
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
        <div className="view-mode-tabs">
          <button
            type="button"
            className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('map')}
            title="Full-Screen Satellite Map & Region Snapshotting"
          >
            <Globe2 size={14} /> Map
          </button>
          <button
            type="button"
            className={`view-tab ${viewMode === 'cockpit' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('cockpit')}
            title="Multi-Spectral Evidence Analysis & Conversation"
          >
            <Layers size={14} /> Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
