import React from 'react';
import { CheckCircle2, Circle, Loader2, ScanLine, Cpu, Eye, Zap, FileText } from 'lucide-react';

const STAGES = [
  { key: 'understanding_query',  label: 'Understanding query',  icon: ScanLine },
  { key: 'selecting_model',      label: 'Selecting model',       icon: Cpu },
  { key: 'analysing_imagery',    label: 'Analysing imagery',     icon: Eye },
  { key: 'generating_evidence',  label: 'Generating evidence',   icon: Zap },
  { key: 'preparing_response',   label: 'Preparing response',    icon: FileText },
];

const PROGRESS_MAP = {
  understanding_query: 18,
  selecting_model: 38,
  analysing_imagery: 64,
  generating_evidence: 84,
  preparing_response: 96,
  complete: 100,
};

export default function ProgressStepper({ currentStage, stageMessage }) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);
  const progress = PROGRESS_MAP[currentStage] ?? 5;

  return (
    <div className="progress-stepper">
      <div className="stepper-header">
        <span>Analysis Pipeline</span>
        {}
        <span className="typing-indicator">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </span>
      </div>

      {}
      <div className="stepper-progress-bar">
        <div className="stepper-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="stepper-list">
        {STAGES.map((st, idx) => {
          const isDone   = currentIndex > idx;
          const isActive = currentStage === st.key;
          const StageIcon = st.icon;

          return (
            <div
              key={st.key}
              className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-icon">
                {isDone ? (
                  <CheckCircle2 size={13} color="var(--accent-emerald)" />
                ) : isActive ? (
                  <Loader2
                    size={13}
                    color="var(--accent-cyan)"
                    style={{ animation: 'orbit-rotate 1s linear infinite' }}
                  />
                ) : (
                  <StageIcon size={12} color="var(--text-muted)" strokeWidth={1.5} />
                )}
              </div>
              <span>{st.label}</span>
            </div>
          );
        })}
      </div>

      {}
      {stageMessage && (
        <div style={{
          fontSize: '10px', color: 'var(--accent-cyan)',
          borderTop: '1px solid rgba(56,189,248,0.12)',
          paddingTop: '8px', lineHeight: 1.5,
          opacity: 0.85,
        }}>
          {stageMessage}
        </div>
      )}
    </div>
  );
}
