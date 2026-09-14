import React from 'react';
import {
  History,
  MessageSquare,
  Trash2,
  PlusCircle,
  Clock,
  ChevronRight,
  Database,
} from 'lucide-react';

export default function SessionHistory({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isOpen,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="session-history-drawer">
      <div className="history-drawer-header">
        <div className="header-title">
          <History size={16} />
          <span>Investigation History</span>
        </div>
        <button type="button" className="close-drawer-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="history-db-badge">
        <Database size={12} />
        <span>Saved to your account</span>
      </div>

      <div className="new-session-action">
        <button type="button" className="new-session-btn" onClick={onNewSession}>
          <PlusCircle size={15} />
          <span>Start New Investigation</span>
        </button>
      </div>

      <div className="session-list-scroll">
        {sessions.length === 0 ? (
          <div className="no-sessions-msg">
            <Clock size={24} />
            <p>No previous analysis sessions found.</p>
            <span>Ask a question or upload satellite imagery to start your first record.</span>
          </div>
        ) : (
          sessions.map((sess) => {
            const isActive = sess.id === activeSessionId;
            const dateStr = sess.created_at
              ? new Date(sess.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Recent';

            return (
              <div
                key={sess.id}
                className={`session-history-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectSession(sess.id)}
              >
                <div className="session-card-content">
                  <div className="session-title-row">
                    <MessageSquare size={14} className="msg-icon" />
                    <span className="session-title">{sess.title}</span>
                  </div>
                  <div className="session-meta-row">
                    <span className="session-date">{dateStr}</span>
                    <span className="session-count">
                      {sess.message_count} {sess.message_count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </div>

                <div className="session-card-actions">
                  <button
                    type="button"
                    className="delete-session-btn"
                    title="Delete Session"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(sess.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={14} className="arrow-icon" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
