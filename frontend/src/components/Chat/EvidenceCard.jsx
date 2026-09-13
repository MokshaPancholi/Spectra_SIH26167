import React from 'react';
import { Eye, Layers, GitCompare } from 'lucide-react';

export default function EvidenceCard({
  routingDecision,
  evidenceArtifacts,
  onInspectEvidence,
}) {
  if (!evidenceArtifacts) return null;

  let thumb = null;
  let evidenceType = '';
  let sourceModel = '';
  let targetLayer = '';

  if (evidenceArtifacts['Attention Heatmap']) {
    thumb = evidenceArtifacts['Attention Heatmap'];
    evidenceType = 'Visual Attribution (ViT Heatmap)';
    sourceModel = 'Visual Question Answering';
    targetLayer = 'heatmap';
  } else if (evidenceArtifacts['Change Mask']) {
    thumb = evidenceArtifacts['Change Mask'];
    evidenceType = 'Surface Change Mask';
    sourceModel = 'Bi-Temporal Change Detection';
    targetLayer = 'mask';
  } else if (evidenceArtifacts['Optical Heatmap'] || evidenceArtifacts['SAR Heatmap']) {
    thumb = evidenceArtifacts['Optical Heatmap'] || evidenceArtifacts['SAR Heatmap'];
    evidenceType = 'Cross-Modal Sensor Attribution';
    sourceModel = 'Optical-SAR Fusion';
    targetLayer = 'fusion';
  }

  if (!thumb) return null;

  return (
    <div className="evidence-card">
      <div className="evidence-thumb-wrap">
        <img src={thumb} alt={evidenceType} className="evidence-thumb" />
      </div>
      <div className="evidence-meta">
        <div className="evidence-type">{evidenceType}</div>
        <div className="evidence-source">Source: {sourceModel}</div>
      </div>
      <button
        className="inspect-evidence-btn"
        onClick={() => onInspectEvidence(targetLayer)}
      >
        <Eye size={12} />
        <span>Inspect</span>
      </button>
    </div>
  );
}
