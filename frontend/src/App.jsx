import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  MessageSquare,
  Orbit,
  Satellite,
} from 'lucide-react';
import Sidebar from './components/Sidebar/Sidebar';
import VisualWorkspace from './components/Workspace/VisualWorkspace';
import ChatPanel from './components/Chat/ChatPanel';

function SiteHeader({ activePage, onNavigate }) {
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
      <button className="header-launch" onClick={() => onNavigate('analyze')} type="button">
        <MessageSquare size={15} /> Open workspace
      </button>
    </header>
  );
}

function HomePage({ onNavigate }) {
  return (
    <main className="marketing-page home-page">
      <section className="home-hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-pulse" /> MULTIMODAL EARTH INTELLIGENCE</div>
          <h1>Read the planet<br /><em>between the pixels.</em></h1>
          <p className="hero-lede">SatQuery turns optical, SAR, and time-series imagery into grounded answers you can inspect, compare, and trust.</p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => onNavigate('analyze')} type="button">Start an analysis <ArrowRight size={17} /></button>
            <button className="text-action" onClick={() => onNavigate('how-to-use')} type="button">See how it works</button>
          </div>
          <div className="hero-note"><CircleCheck size={15} /> Built for transparent, evidence-led exploration</div>
        </div>
        <div className="orbit-visual" aria-label="Orbital data visualization">
          <div className="orbit-grid" /><div className="orbit-ring orbit-ring-one" /><div className="orbit-ring orbit-ring-two" />
          <div className="planet"><div className="planet-land land-one" /><div className="planet-land land-two" /><div className="planet-glint" /></div>
          <div className="orbit-label label-top"><span>01</span> OPTICAL + SAR</div>
          <div className="orbit-label label-bottom"><span>LIVE</span> EVIDENCE LAYER</div>
        </div>
      </section>
      <section className="signal-strip">
        <span>ONE WORKSPACE</span><b>01</b><span>THREE SPECIALIST MODELS</span><b>03</b><span>TRACEABLE OUTPUTS</span><b>∞</b>
      </section>
      <section className="home-modules">
        <div><span className="module-index">01 / ASK</span><h2>Questions in plain language.</h2><p>Describe what you need to know. The router selects the right specialist for VQA, grounding, change detection, or cross-modal analysis.</p></div>
        <div><span className="module-index">02 / INSPECT</span><h2>Evidence beside the answer.</h2><p>Move from synthesis to imagery, heatmaps, masks, and attribution layers without losing the original context.</p></div>
        <div><span className="module-index">03 / COMPARE</span><h2>Make change visible.</h2><p>Load imagery one at a time, set the first scene deliberately, and compare time or sensor perspectives with confidence.</p></div>
      </section>
    </main>
  );
}

function InfoPage({ type, onNavigate }) {
  const isGuide = type === 'how-to-use';
  const rows = isGuide ? [
    ['01', 'Choose your imagery', 'Upload one image for scene questions, or two images for a temporal or optical-SAR comparison.'],
    ['02', 'Set the order', 'The first slot is always the reference. Use the swap control when your before/after or sensor order needs changing.'],
    ['03', 'Ask naturally', 'Write a focused question. SatQuery routes it to the specialist model best suited to the evidence.'],
    ['04', 'Inspect the evidence', 'Open the returned mask, heatmap, or attribution layer to understand what supports the answer.'],
  ] : [
    ['01', 'Specialist by design', 'VQA, change detection, cross-modal reasoning, and grounding each have a distinct role.'],
    ['02', 'Evidence is first-class', 'Answers are paired with visual artifacts and a visible execution trace.'],
    ['03', 'Prototype, openly labeled', 'The current system is a focused research prototype, designed to make the path from model output to human judgment legible.'],
  ];

  return (
    <main className="marketing-page info-page">
      <div className="info-heading"><div className="eyebrow">{isGuide ? 'FIELD GUIDE / 04 STEPS' : 'THE SATQUERY MISSION'}</div><h1>{isGuide ? 'From image to insight.' : 'A clearer view of Earth.'}</h1><p>{isGuide ? 'A calm, deliberate workflow for turning your imagery into an answer with context.' : 'SatQuery is a research prototype for natural-language analysis of remote-sensing imagery. It brings specialist vision models into one auditable workspace.'}</p></div>
      <div className="info-layout">
        <div className="info-list">{rows.map(([number, title, description]) => <div className="info-row" key={number}><span>{number}</span><div><h2>{title}</h2><p>{description}</p></div><ArrowRight size={17} /></div>)}</div>
        <aside className="info-aside"><div className="aside-icon">{isGuide ? <BookOpen size={25} /> : <Orbit size={25} />}</div><span className="module-index">{isGuide ? 'QUICK START' : 'SYSTEM NOTE'}</span><h2>{isGuide ? 'Your first pass takes three moves.' : 'Made for inspection, not magic.'}</h2><p>{isGuide ? 'Upload. Order. Ask. The workspace handles the specialist routing and keeps the visual context close.' : 'Every answer is designed to stay close to its source imagery, with model choice and confidence available when you need them.'}</p><button className="secondary-action" onClick={() => onNavigate('analyze')} type="button">Open the workspace <ArrowRight size={15} /></button></aside>
      </div>
    </main>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [presets, setPresets] = useState([]);
  const [activePresetId, setActivePresetId] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);

  // Workspace & Imagery state
  const [image1, setImage1] = useState(null);
  const [image2, setImage2] = useState(null);
  const [image1Name, setImage1Name] = useState(null);
  const [image2Name, setImage2Name] = useState(null);

  // Active layer in visual viewer
  const [activeLayer, setActiveLayer] = useState('original');
  const [opacity, setOpacity] = useState(0.85);

  // Routing & Evidence state
  const [routingDecision, setRoutingDecision] = useState(null);
  const [evidenceArtifacts, setEvidenceArtifacts] = useState(null);
  const [forcedModel, setForcedModel] = useState('auto');

  // Chat & Stream state
  const [sessionId, setSessionId] = useState(() => 'sess_' + Math.random().toString(36).substring(2, 9));
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('');
  const [stageMessage, setStageMessage] = useState('');

  // ── 1. Fetch System Health & Presets on Load ──────────────────────────────
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealthInfo(data))
      .catch((err) => console.warn('Could not fetch health:', err));

    fetch('/api/presets')
      .then((res) => res.json())
      .then((data) => {
        setPresets(data);
      })
      .catch((err) => console.warn('Could not fetch presets:', err));
  }, []);

  // ── 2. Preset Selection ──────────────────────────────────────────────────
  const handleSelectPreset = (preset) => {
    setActivePresetId(preset.id);
    setImage1(preset.image1);
    setImage2(preset.image2 || null);
    setImage1Name(preset.image1_label || 'Scene 1');
    setImage2Name(preset.image2_label || (preset.image2 ? 'Scene 2' : null));
    setEvidenceArtifacts(null);
    setRoutingDecision(null);

    // Initial layer selection
    if (preset.id === 'bitemporal_change') {
      setActiveLayer('split');
    } else if (preset.id === 'crossmodal_coastal') {
      setActiveLayer('optical');
    } else {
      setActiveLayer('original');
    }

    // Populate recommended question
    if (preset.recommended_query) {
      setInputPrompt(preset.recommended_query);
    }
  };

  // ── 3. Reset / New Analysis ──────────────────────────────────────────────
  const handleNewAnalysis = () => {
    const newSess = 'sess_' + Math.random().toString(36).substring(2, 9);
    setSessionId(newSess);
    setMessages([]);
    setImage1(null);
    setImage2(null);
    setImage1Name(null);
    setImage2Name(null);
    setEvidenceArtifacts(null);
    setRoutingDecision(null);
    setActivePresetId(null);
    setActiveLayer('original');
    setInputPrompt('');

    fetch('/api/session/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: newSess }),
    }).catch(() => {});
  };

  // ── 4. Image Upload (Local Files) ────────────────────────────────────────
  const handleUploadImages = (files) => {
    setActivePresetId(null);
    const readAsDataUrl = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve({ name: file.name, url: e.target.result });
        reader.readAsDataURL(file);
      });

    Promise.all(files.slice(0, 2).map(readAsDataUrl)).then((results) => {
      let nextImage1 = image1;
      let nextImage2 = image2;
      let nextImage1Name = image1Name;
      let nextImage2Name = image2Name;

      results.forEach((result) => {
        if (!nextImage1) {
          nextImage1 = result.url;
          nextImage1Name = result.name;
        } else if (!nextImage2) {
          nextImage2 = result.url;
          nextImage2Name = result.name;
        }
      });

      setImage1(nextImage1);
      setImage1Name(nextImage1Name);
      setImage2(nextImage2);
      setImage2Name(nextImage2Name);
      setActiveLayer(nextImage2 ? 'split' : 'original');
    });
  };

  const handleSwapImages = () => {
    if (!image1 || !image2) return;
    setImage1(image2);
    setImage1Name(image2Name);
    setImage2(image1);
    setImage2Name(image1Name);
  };

  const handleRemoveImage = (imgNum) => {
    if (imgNum === 1) {
      setImage1(null);
      setImage1Name(null);
    } else {
      setImage2(null);
      setImage2Name(null);
    }
    setActiveLayer('original');
  };

  // ── 5. Send Query & Stream Execution ─────────────────────────────────────
  const handleSend = async () => {
    if (!inputPrompt.trim() || isLoading) return;

    const queryText = inputPrompt.trim();
    setInputPrompt('');
    setIsLoading(true);
    setCurrentStage('understanding_query');
    setStageMessage('Parsing geospatial prompt and intent...');

    // Add user message to chat immediately
    setMessages((prev) => [...prev, { role: 'user', content: queryText }]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        buffer = lines.pop(); // Keep partial line

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
                  {
                    role: 'assistant',
                    content: parsed.message || 'Analysis could not be completed.',
                  },
                ]);
                return;
              }

              if (parsed.stage === 'complete') {
                // Final response reached
                setIsLoading(false);
                // Populate images from backend if user queried without prior image upload
                const artifacts = parsed.evidence_artifacts || {};
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

                // Auto-switch visual viewer to the relevant evidence layer
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
                    evidenceArtifacts: parsed.evidence_artifacts,
                    latency: parsed.latency,
                    mock: parsed.mock,
                    explanation: parsed.explanation,
                  },
                ]);
              } else {
                // Progressive stage update
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
          content: `Unable to complete request: ${err.message}. Please verify the FastAPI backend server is running.`,
        },
      ]);
    }
  };

  const handleInspectEvidence = (layerName) => {
    setActiveLayer(layerName);
  };

  if (activePage !== 'analyze') {
    return (
      <div className="site-shell">
        <SiteHeader activePage={activePage} onNavigate={setActivePage} />
        {activePage === 'home' ? <HomePage onNavigate={setActivePage} /> : <InfoPage type={activePage} onNavigate={setActivePage} />}
      </div>
    );
  }

  return (
    <div className="workspace-route">
      <div className="workspace-topbar">
        <button className="workspace-back" onClick={() => setActivePage('home')} type="button"><Satellite size={16} /> SatQuery <span>/ Analysis workspace</span></button>
        <div className="workspace-status"><span /> SYSTEM ONLINE <button onClick={() => setActivePage('how-to-use')} type="button">Guide</button></div>
      </div>
      <div className="app-container">
        {/* 1. Left Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          presets={presets}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          forcedModel={forcedModel}
          onChangeModel={setForcedModel}
          onNewAnalysis={handleNewAnalysis}
          healthInfo={healthInfo}
        />

      {/* 2. Center Visual Workspace */}
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

      {/* 3. Right Analysis & Conversation Panel */}
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
      </div>
    </div>
  );
}
