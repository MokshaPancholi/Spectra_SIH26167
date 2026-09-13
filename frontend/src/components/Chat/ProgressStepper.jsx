import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';

export default function ProgressStepper({ currentStage, stageMessage }) {
  const stages = [
    { key: 'understanding_query', label: 'Understanding query' },
    { key: 'selecting_model', label: 'Selecting model' },
    { key: 'analysing_imagery', label: 'Analysing imagery' },
    { key: 'generating_evidence', label: 'Generating evidence' },
    { key: 'preparing_response', label: 'Preparing response' },
  ];

  const stageOrder = stages.map((s) => s.key);
  const currentIndex = stageOrder.indexOf(currentStage);

  return (
    <div className="progress-stepper">
      <div className="stepper-header">
        <span>Analysis Pipeline</span>
        {stageMessage && (
          <span style={{ fontSize: '10px', color: 'var(--accent-cyan)', textTransform: 'none' }}>
            {stageMessage}
          </span>
        )}
      </div>

      <div className="stepper-list">
        {stages.map((st, idx) => {
          const isDone = currentIndex > idx || currentStage === 'complete';
          const isActive = currentStage === st.key;

          return (
            <div
              key={st.key}
              className={`step-item ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
            >
              <div className="step-icon">
                {isDone ? (
                  <CheckCircle2 size={13} color="var(--accent-emerald)" />
                ) : isActive ? (
                  <Loader2 size={13} className="animate-spin" color="var(--accent-cyan)" />
                ) : (
                  <Circle size={13} color="var(--text-muted)" />
                )}
              </div>
              <span>{st.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
