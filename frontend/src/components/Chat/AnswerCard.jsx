import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function AnswerCard({
  rawAnswer,
  routingDecision,
  routingConfidence,
  evidenceArtifacts,
}) {
  const optPct = evidenceArtifacts?.['optical_pct'];
  const sarPct = evidenceArtifacts?.['sar_pct'];
  const changePct = evidenceArtifacts?.['change_pct'];
  const boxCount = evidenceArtifacts?.['boxes']?.length;

  return (
    <div className="answer-card">
      <div className="answer-header">
        <div className="answer-title">
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span>Synthesis</span>
        </div>
        {routingConfidence && (
          <div className="active-model-chip">
            {Math.round(routingConfidence * 100)}% Match
          </div>
        )}
      </div>

      <div className="answer-content">{rawAnswer}</div>

      {/* Cross-Modal Dual-Sensor Attribution Bar */}
      {optPct !== undefined && sarPct !== undefined && (
        <div className="attribution-bar-container">
          <div className="attribution-labels">
            <span>Optical: {optPct.toFixed(1)}%</span>
            <span>SAR Radar: {sarPct.toFixed(1)}%</span>
          </div>
          <div className="attribution-bar">
            <div className="attribution-opt" style={{ width: `${optPct}%` }} />
            <div className="attribution-sar" style={{ width: `${sarPct}%` }} />
          </div>
        </div>
      )}

      {/* Bi-temporal change metrics */}
      {changePct !== undefined && (
        <div style={{
          display: 'flex',
          gap: '12px',
          background: 'rgba(0,0,0,0.25)',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '11px',
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Surface Change: </span>
            <strong style={{ color: 'var(--accent-rose)' }}>{changePct.toFixed(2)}%</strong>
          </div>
          {boxCount !== undefined && (
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Detected Clusters: </span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{boxCount}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
