import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  MessageSquare,
  Orbit,
  Satellite,
  Globe2,
  Layers,
  History,
  User,
  LogIn,
  LogOut,
  Database,
} from 'lucide-react';
import Sidebar from './components/Sidebar/Sidebar';
import VisualWorkspace from './components/Workspace/VisualWorkspace';
import ChatPanel from './components/Chat/ChatPanel';
import SatelliteMapExplorer from './components/Map/SatelliteMapExplorer';
import AuthModal from './components/Auth/AuthModal';
import SessionHistory from './components/Sidebar/SessionHistory';

function SiteHeader({ activePage, onNavigate, currentUser, onOpenAuth, onLogout }) {
  const navItems = [
    { id: 'home', label: 'Home' },
    { id: 'how-to-use', label: 'How to use' },
    { id: 'about', label: 'About' },
  ];

  return (
    <header className="site-header">
      <button className="site-brand" onClick={() => onNavigate('home')} type="button">
        <span className="site-brand-mark"><Satellite size={19} /></span>
        <span><strong>SatQuery</strong><small>EARTH OBSERVATION LAB</small></span>
      </button>
      <nav className="site-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={activePage === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="header-right-actions">
        {currentUser ? (
          <div className="header-user-badge">
            <span className="user-icon"><User size={15} /></span>
            <span className="user-name">{currentUser.username}</span>
            <button className="logout-btn" onClick={onLogout} title="Sign Out" type="button">
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button className="header-login-btn" onClick={onOpenAuth} type="button">
            <LogIn size={15} /> Sign In
          </button>
        )}

        <button className="header-launch" onClick={() => onNavigate('analyze')} type="button">
          <MessageSquare size={15} /> Command Center
        </button>
      </div>
    </header>
  );
}

function HomePage({ onNavigate }) {
  const capabilities = [
    { label: 'Satellite Search', detail: 'Explore any region on Earth', icon: Globe2 },
    { label: 'AI Vision', detail: 'Ask questions about imagery', icon: Layers },
    { label: 'Grounded Evidence', detail: 'See why the answer is trusted', icon: Database },
  ];

  return (
    <main className="marketing-page home-page">
      <section className="earth-hero">
        <div className="earth-hero-media" aria-hidden="true">
          <div className="earth-photo" />
          <div className="earth-photo-shade" />
          <div className="earth-atmosphere" />
          <div className="earth-stars" />
          <div className="earth-dateline" />
        </div>

        <div className="earth-hero-inner">
          <div className="earth-copy">
            <div className="earth-eyebrow">
              <span className="earth-live-dot" />
              EARTH OBSERVATION · AI RESEARCH WORKSPACE
            </div>
            <h1>SatQuery AI</h1>
            <p>
              Turns satellite imagery into clear, evidence-grounded answers —
              so you can move from a place on the map to an explanation in seconds.
            </p>
            <div className="earth-actions">
              <button className="earth-primary" onClick={() => onNavigate('analyze')} type="button">
                Open Command Center <ArrowRight size={16} />
              </button>
              <button className="earth-secondary" onClick={() => onNavigate('how-to-use')} type="button">
                See how it works
              </button>
            </div>
            <div className="earth-trust-row">
              <span><CircleCheck size={13} /> Multimodal reasoning</span>
              <span><CircleCheck size={13} /> Visual evidence</span>
              <span><CircleCheck size={13} /> Auditable sessions</span>
            </div>
          </div>

          <div className="earth-observation-card" aria-label="SatQuery Earth observation preview">
            <div className="observation-topline">
              <span>LIVE ORBITAL VIEW</span>
              <span className="observation-status"><i /> ONLINE</span>
            </div>
            <div className="observation-image">
              <div className="observation-map-lines" />
              <div className="observation-crosshair"><span /><span /></div>
              <div className="observation-label observation-label-one">35.6762° N</div>
              <div className="observation-label observation-label-two">139.6503° E</div>
            </div>
            <div className="observation-bottom">
              <div>
                <small>OBSERVATION</small>
                <strong>Earth · Multispectral</strong>
                <span className="observation-description">High-resolution surface scan</span>
              </div>
              <span className="observation-arrow"><ArrowRight size={15} /></span>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoPage({ type, onNavigate }) {
  const isGuide = type === 'how-to-use';
  const rows = isGuide ? [
    ['01', 'Explore the Satellite Map', 'Navigate to any region, port, or forest on Earth and capture a snapshot directly as Image 1 or Image 2.'],
    ['02', 'Set the Order & Sensor Types', 'Use the reference slot for baseline imagery and the second slot for temporal comparison or SAR backscatter.'],
    ['03', 'Query in Natural Language', 'Describe what you need to discover. SatQuery routes automatically with confidence calibration.'],
    ['04', 'Inspect Grounded Evidence', 'Review ViT attention heatmaps, Siamese difference masks, and confidence telemetry saved to your database history.'],
  ] : [
    ['01', 'Specialist by Design', 'VQA, change detection, optical-SAR fusion, and grounding nodes each fulfill a mathematically specialized role.'],
    ['02', 'Evidence Beside the Answer', 'Synthesized conclusions are strictly paired with spatial attention maps and reproducible visual layers.'],
    ['03', 'Production Ready & Auditable', 'Supported by PostgreSQL persistence, session tracking, and seamless fallback demonstration modes.'],
  ];

  return (
    <main className="marketing-page info-page">
      <div className="info-heading">
        <div className="eyebrow">{isGuide ? 'FIELD GUIDE / 04 STEPS' : 'THE SATQUERY MISSION'}</div>
        <h1>{isGuide ? 'From orbit to insight.' : 'A clearer view of Earth.'}</h1>
        <p>{isGuide ? 'A deliberate workflow for capturing remote sensing imagery, routing through specialist vision models, and inspecting grounded findings.' : 'SatQuery combines multi-modal remote sensing models into one unified, auditable intelligence workspace.'}</p>
      </div>
      <div className="info-layout">
        <div className="info-list">
          {rows.map(([number, title, description]) => (
            <div className="info-row" key={number}>
              <span>{number}</span>
              <div>
                <h2>{title}</h2>
                <p>{description}</p>
              </div>
              <ArrowRight size={17} />
            </div>
          ))}
        </div>
        <aside className="info-aside">
          <div className="aside-icon">{isGuide ? <BookOpen size={25} /> : <Orbit size={25} />}</div>
          <span className="module-index">{isGuide ? 'QUICK START' : 'SYSTEM NOTE'}</span>
          <h2>{isGuide ? 'Snapshot, ask, verify.' : 'Transparent Intelligence'}</h2>
          <p>{isGuide ? 'Use the embedded satellite map to snapshot any location, ask questions naturally, and view full spatial attributions.' : 'Every answer remains tightly coupled to its source raster imagery and verified historical audit logs.'}</p>
          <button className="secondary-action" onClick={() => onNavigate('analyze')} type="button">
            Open Command Center <ArrowRight size={15} />
          </button>
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try {
      localStorage.setItem('satquery-theme', 'dark');
    } catch {
      // ignore storage issues
    }
  }, []);

  const [activePage, setActivePage] = useState('home');
  const [viewMode, setViewMode] = useState('cockpit'); // 'cockpit' | 'map'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // User & Auth State
  const [currentUser, setCurrentUser] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  // Presets & Health
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);
  const [sessions, setSessions] = useState([]);

  const handleNavigate = (page) => {
    if (page === 'analyze' && !currentUser) {
      setAuthModalOpen(true);
      return;
    }

    setActivePage(page);
  };

  // Workspace & Imagery state
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image1Name, setImage1Name] = useState(null);
  const [image2Name, setImage2Name] = useState(null);

  // Active layer in visual viewer
  const [activeLayer, setActiveLayer] = useState('original');
  const [opacity, setOpacity] = useState(0.85);

  // Routing & Evidence state
  const [evidenceArtifacts, setEvidenceArtifacts] = useState(null);
  const [routingDecision, setRoutingDecision] = useState(null);
  const [forcedModel, setForcedModel] = useState('auto');

  // Chat & Stream state
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(null);
  const [stageMessage, setStageMessage] = useState(null);

  // Load Presets, Health, and User Sessions on mount
  const loadSessions = useCallback(() => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    fetch('/api/sessions', { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setSessions(data))
      .catch((err) => console.warn('Could not load sessions:', err));
  }, [authToken]);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthInfo(data))
      .catch((err) => console.warn('Health check unreachable:', err));

    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => setPresets(data))
      .catch((err) => console.warn('Could not fetch presets:', err));

    loadSessions();
  }, [loadSessions]);

  // Auth Handlers
  const handleAuthSuccess = (user, token) => {
    setCurrentUser(user);
    setAuthToken(token);
    loadSessions();
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAuthToken(null);
    setSessions([]);
  };

  // Session Management
  const handleSelectSession = async (sessId) => {
    try {
      const res = await fetch(`/api/sessions/${sessId}/messages`);
      if (res.ok) {
        const histMessages = await res.json();
        setSessionId(sessId);
        setMessages(histMessages);
        setHistoryDrawerOpen(false);

        // Find last artifacts if available
        for (let i = histMessages.length - 1; i >= 0; i--) {
          if (histMessages[i].evidenceArtifacts && Object.keys(histMessages[i].evidenceArtifacts).length > 0) {
            setEvidenceArtifacts(histMessages[i].evidenceArtifacts);
            setRoutingDecision(histMessages[i].routingDecision);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load session messages:', err);
    }
  };

  const handleNewSession = async () => {
    const newId = 'sess_' + Math.random().toString(36).substring(2, 9);
    setSessionId(newId);
    setMessages([]);
    setImage1(null);
    setImage2(null);
    setImage1Name(null);
    setImage2Name(null);
    setEvidenceArtifacts(null);
    setRoutingDecision(null);
    setActivePresetId(null);
    setHistoryDrawerOpen(false);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };
      await fetch('/api/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: 'New Analysis Session' }),
      });
      loadSessions();
    } catch (err) {
      console.warn('Could not create DB session:', err);
    }
  };

  const handleDeleteSession = async (sessId) => {
    try {
      await fetch(`/api/sessions/${sessId}`, { method: 'DELETE' });
      loadSessions();
      if (sessId === sessionId) {
        handleNewSession();
      }
    } catch (err) {
      console.warn('Could not delete session:', err);
    }
  };

  // Preset Selection
  const handleSelectPreset = (preset) => {
    setActivePresetId(preset.id);
    setImage1(preset.image1 || null);
    setImage2(preset.image2 || null);
    setImage1Name(preset.image1_label || null);
    setImage2Name(preset.image2_label || null);
    setEvidenceArtifacts(null);
    setRoutingDecision(null);

    if (preset.id === 'crossmodal_coastal') {
      setActiveLayer('fusion');
    } else {
      setActiveLayer('original');
    }

    if (preset.recommended_query) {
      setInputPrompt(preset.recommended_query);
    }
  };

  const handleNewAnalysis = () => {
    setImage1(null);
    setImage2(null);
    setImage1Name(null);
    setImage2Name(null);
    setEvidenceArtifacts(null);
    setRoutingDecision(null);
    setActivePresetId(null);
    setActiveLayer('original');
  };

  // Image Upload / Swap / Remove Handlers
  const handleUploadImages = async (slotOrFiles, fileDataUri, fileName) => {
    if (Array.isArray(slotOrFiles)) {
      const files = slotOrFiles.slice(0, 2);

      if (files.length === 0) return;

      const loadedFiles = await Promise.all(
        files.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                resolve({
                  dataUri: reader.result,
                  fileName: file.name || 'Uploaded Satellite Image',
                });
              };
              reader.onerror = () => reject(new Error(`Failed to load ${file.name}`));
              reader.readAsDataURL(file);
            })
        )
      );

      loadedFiles.forEach(({ dataUri, fileName }, index) => {
        if (index === 0) {
          setImage1(dataUri);
          setImage1Name(fileName || 'Observation Scene (1)');
        } else if (index === 1) {
          setImage2(dataUri);
          setImage2Name(fileName || 'Comparison Scene (2)');
        }
      });

      setActivePresetId(null);
      setEvidenceArtifacts(null);
      setActiveLayer('original');
      return;
    }

    if (slotOrFiles === 1) {
      setImage1(fileDataUri);
      setImage1Name(fileName || 'Observation Scene (1)');
    } else if (slotOrFiles === 2) {
      setImage2(fileDataUri);
      setImage2Name(fileName || 'Comparison Scene (2)');
    }
    setActivePresetId(null);
    setEvidenceArtifacts(null);
  };

  const handleRemoveImage = (slot) => {
    if (slot === 1) {
      setImage1(null);
      setImage1Name(null);
    } else if (slot === 2) {
      setImage2(null);
      setImage2Name(null);
    }
    setEvidenceArtifacts(null);
  };

  const handleSwapImages = () => {
    const tempImg = image1;
    const tempName = image1Name;
    setImage1(image2);
    setImage1Name(image2Name);
    setImage2(tempImg);
    setImage2Name(tempName);
  };

  // Map Region Snapshotting
  const handleCaptureRegion = ({ image, label, target, metadata }) => {
    if (target === 'image1') {
      setImage1(image);
      setImage1Name(label);
      if (!inputPrompt) {
        setInputPrompt(`What geospatial features, infrastructure, or land use types are visible in this area (${metadata.name})?`);
      }
    } else if (target === 'image2') {
      setImage2(image);
      setImage2Name(label);
    }
    setActivePresetId(null);
    setEvidenceArtifacts(null);
    // Switch to Cockpit view if currently in pure map mode
    if (viewMode === 'map') {
      setViewMode('cockpit');
    }
  };

  // Send Message with SSE Streaming & DB Persistence
  const handleSend = async () => {
    if (!inputPrompt.trim() || isLoading) return;

    const queryText = inputPrompt.trim();
    setInputPrompt('');
    setIsLoading(true);
    setRoutingDecision(null);
    setEvidenceArtifacts(null);
    setCurrentStage('understanding_query');
    setStageMessage('Parsing geospatial prompt and intent...');

    setMessages((prev) => [...prev, { role: 'user', content: queryText }]);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      };

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          session_id: sessionId,
          query: queryText,
          image1: image1 || undefined,
          image2: image2 || undefined,
          image1_name: image1Name || undefined,
          image2_name: image2Name || undefined,
          forced_model: forcedModel,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '').trim();
            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr);

              if (parsed.stage === 'error') {
                setIsLoading(false);
                setMessages((prev) => [
                  ...prev,
                  { role: 'assistant', content: parsed.message || 'Analysis could not be completed.' },
                ]);
                return;
              }

              if (parsed.stage === 'complete') {
                setIsLoading(false);

                const artifacts = parsed.evidence_artifacts || {};
                setEvidenceArtifacts(artifacts);
                setRoutingDecision(parsed.routing_decision);

                if (artifacts['Before (T1)'] && !image1) {
                  setImage1(artifacts['Before (T1)']);
                  setImage1Name('Pre-Acquisition (T1)');
                }
                if (artifacts['After (T2)'] && !image2) {
                  setImage2(artifacts['After (T2)']);
                  setImage2Name('Post-Acquisition (T2)');
                }
                if (artifacts['Original Image'] && !image1) {
                  setImage1(artifacts['Original Image']);
                  setImage1Name('Observation Image');
                }
                if (artifacts['Optical Image'] && !image1) {
                  setImage1(artifacts['Optical Image']);
                  setImage1Name('Optical RGB');
                }
                if (artifacts['SAR Image'] && !image2) {
                  setImage2(artifacts['SAR Image']);
                  setImage2Name('SAR Sentinel-1');
                }

                if (parsed.routing_decision === 'vqa' && artifacts['Attention Heatmap']) {
                  setActiveLayer('heatmap');
                } else if (parsed.routing_decision === 'change_detect' && artifacts['Change Mask']) {
                  setActiveLayer('mask');
                } else if (parsed.routing_decision === 'crossmodal') {
                  setActiveLayer('fusion');
                }

                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: parsed.raw_answer,
                    routingDecision: parsed.routing_decision,
                    routingConfidence: parsed.routing_confidence,
                    routingReason: parsed.routing_reason,
                    evidenceArtifacts: artifacts,
                    latency: parsed.latency,
                    mock: parsed.mock,
                    explanation: parsed.explanation,
                  },
                ]);

                // Refresh sessions from database
                loadSessions();
              } else {
                setCurrentStage(parsed.stage);
                if (parsed.message) setStageMessage(parsed.message);
                if (parsed.decision) setRoutingDecision(parsed.decision);
              }
            } catch (err) {
              console.warn('Error parsing SSE event:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Unable to complete request: ${err.message}. Please verify the FastAPI backend server is running on port 8000.`,
        },
      ]);
    }
  };

  const handleInspectEvidence = (layerName) => {
    setActiveLayer(layerName);
    if (viewMode === 'map') {
      setViewMode('cockpit');
    }
  };

  if (activePage !== 'analyze') {
    return (
      <div className="site-shell">
        <SiteHeader
          activePage={activePage}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
          onLogout={handleLogout}
        />
        {activePage === 'home' ? (
          <HomePage
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        ) : (
          <InfoPage type={activePage} onNavigate={handleNavigate} />
        )}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="workspace-route">
      {/* ── Futuristic Command Cockpit Topbar ───────────────────────────── */}
      <div className="workspace-topbar">
        <div className="topbar-left">
          <button className="workspace-back" onClick={() => setActivePage('home')} type="button">
            <Satellite size={16} /> SatQuery <span className="cockpit-tag">/ Command Center</span>
          </button>

          {/* View Mode Selector Tabs */}
          <div className="view-mode-tabs">
            <button
              type="button"
              className={`view-tab ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Full-Screen Satellite Map & Region Snapshotting"
            >
              <Globe2 size={14} /> Map
            </button>
            <button
              type="button"
              className={`view-tab ${viewMode === 'cockpit' ? 'active' : ''}`}
              onClick={() => setViewMode('cockpit')}
              title="Multi-Spectral Evidence Analysis & Conversation"
            >
              <Layers size={14} /> Workspace
            </button>
          </div>
        </div>

        <div className="topbar-center-telemetry" />

        <div className="topbar-right">
          {currentUser ? (
            <div className="cockpit-user-chip">
              <User size={13} />
              <span className="chip-username">{currentUser.username}</span>
              <button
                type="button"
                className="chip-logout"
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="cockpit-signin-btn"
              onClick={() => setAuthModalOpen(true)}
            >
              <LogIn size={13} /> Sign In
            </button>
          )}

          <button
            className="guide-link-btn"
            onClick={() => setActivePage('how-to-use')}
            type="button"
          >
            Guide
          </button>
        </div>
      </div>

      {/* ── Main Cockpit Area ───────────────────────────────────────────── */}
      <div className={`app-container view-${viewMode}`}>
        {/* Session History Drawer */}
        <SessionHistory
          isOpen={historyDrawerOpen}
          onClose={() => setHistoryDrawerOpen(false)}
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* 1. Left Sidebar (Shown in Cockpit and Dual modes) */}
        {viewMode !== 'map' && (
          <Sidebar
            isOpen={sidebarOpen}
            presets={presets}
            activePresetId={activePresetId}
            onSelectPreset={handleSelectPreset}
            forcedModel={forcedModel}
            onChangeModel={setForcedModel}
            healthInfo={healthInfo}
            sessions={sessions}
            activeSessionId={sessionId}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* 2. Central Component: Dynamic depending on viewMode */}
        {viewMode === 'map' && (
          <div className="center-map-fullscreen">
            <SatelliteMapExplorer
              onCaptureRegion={handleCaptureRegion}
              onSwitchToAnalysis={() => setViewMode('cockpit')}
            />
          </div>
        )}

        {viewMode === 'cockpit' && (
          <VisualWorkspace
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            image1={image1}
            image2={image2}
            image1Name={image1Name}
            image2Name={image2Name}
            routingDecision={routingDecision}
            evidenceArtifacts={evidenceArtifacts}
            activeLayer={activeLayer}
            onSelectLayer={setActiveLayer}
            opacity={opacity}
            onChangeOpacity={setOpacity}
          />
        )}

        {/* 3. Right Analysis & Conversation Panel (Shown in Cockpit mode) */}
        {viewMode !== 'map' && (
          <ChatPanel
            messages={messages}
            activeRoutingDecision={routingDecision}
            isLoading={isLoading}
            currentStage={currentStage}
            stageMessage={stageMessage}
            inputPrompt={inputPrompt}
            onChangePrompt={setInputPrompt}
            onSend={handleSend}
            image1={image1}
            image2={image2}
            image1Name={image1Name}
            image2Name={image2Name}
            onRemoveImage={handleRemoveImage}
            onUploadImages={handleUploadImages}
            onSwapImages={handleSwapImages}
            onInspectEvidence={handleInspectEvidence}
          />
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
