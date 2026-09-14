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
          <span>What the system used</span>
          <ChevronDown size={12} />
        </summary>
        <div className="tech-grid">
          <div className="tech-item">
            <span>AI route used</span>
            <strong>{routingDecision ? routingDecision.replace(/_/g, ' ') : 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>Processing time</span>
            <strong>{latency ? `${latency}s` : 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>Confidence</span>
            <strong>{routingConfidence ? `${(routingConfidence * 100).toFixed(0)}%` : 'N/A'}</strong>
          </div>
          <div className="tech-item">
            <span>System</span>
            <strong>{mock ? 'Demo mode' : 'Live engine'}</strong>
          </div>
          {explanation && (
            <div className="tech-item" style={{ gridColumn: 'span 2' }}>
              <span>Why this answer makes sense</span>
              <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.4 }}>
                {explanation}
              </div>
            </div>
          )}
          {routingReason && (
            <div className="tech-item" style={{ gridColumn: 'span 2' }}>
              <span>How the system chose this route</span>
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
