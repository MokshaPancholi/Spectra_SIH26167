import React from 'react';
import { ChevronDown, Info } from 'lucide-react';

export default function AnalysisDetails({
  routingDecision,
  routingConfidence,
  routingReason,
  latency,
  mock,
  explanation,
}) {
  return (
    <div className="tech-details">
      <details>
        <summary className="tech-details-summary">
          <Info size={12} />
          <span>Analysis Details & Diagnostics</span>
          <ChevronDown size={12} />
        </summary>
        <div className="tech-grid">
          <div className="tech-item">
            <span>Specialized Pipeline</span>
            <strong>{routingDecision?.toUpperCase() || 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>Inference Latency</span>
            <strong>{latency ? `${latency}s` : 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>Router Confidence</span>
            <strong>{routingConfidence ? `${(routingConfidence * 100).toFixed(0)}%` : 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>Compute Engine</span>
            <strong>{mock ? 'CPU Mock' : 'CUDA Active'}</strong>
          </div>
          {explanation && (
            <div className="tech-item" style={{ gridColumn: 'span 2' }}>
              <span>Evidence Grounding Note</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                {explanation}
              </div>
            </div>
          )}
          {routingReason && (
            <div className="tech-item" style={{ gridColumn: 'span 2' }}>
              <span>Routing Rationale</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                {routingReason}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
