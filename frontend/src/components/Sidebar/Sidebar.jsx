import React from 'react';
import {
  Satellite,
  History,
  MessageSquare,
  Clock,
  Trash2,
  ChevronRight,
  Plus,
  Map,
} from 'lucide-react';
import AdvancedSettings from './AdvancedSettings';

export default function Sidebar({
  isOpen,
  forcedModel,
  onChangeModel,
  healthInfo,
  sessions = [],
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onNewSession,
  onOpenMap,
}) {
  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>

      <div className="sidebar-scrollable">
        <div className="sidebar-action-wrap">
          <button
            type="button"
            className="sidebar-map-btn"
            onClick={onOpenMap}
          >
            <Map size={15} />
            <span>Map</span>
          </button>
          <button
            type="button"
            className="new-analysis-btn"
            onClick={onNewSession}
          >
            <Plus size={15} />
            <span>New chat</span>
          </button>
        </div>

        <div className="recent-sessions-panel">
          <div className="section-label">
            <span>Recent sessions</span>
            <History size={12} color="var(--accent-cyan)" />
          </div>

          {sessions.length === 0 ? (
            <div className="sidebar-empty-sessions">
              <Clock size={18} />
              <span>No sessions yet</span>
            </div>
          ) : (
            <div className="sidebar-session-list">
              {sessions.map((sess) => {
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
                    onClick={() => onSelectSession?.(sess.id)}
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
                        title="Delete session"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession?.(sess.id);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                      <ChevronRight size={14} className="arrow-icon" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AdvancedSettings
          forcedModel={forcedModel}
          onChangeModel={onChangeModel}
          healthInfo={healthInfo}
        />

      </div>

    </aside>
  );
}
