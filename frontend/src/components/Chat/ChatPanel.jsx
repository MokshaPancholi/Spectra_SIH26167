import React, { useRef, useEffect } from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import ProgressStepper from './ProgressStepper';
import AnswerCard from './AnswerCard';
import EvidenceCard from './EvidenceCard';
import AnalysisDetails from './AnalysisDetails';
import ChatInput from './ChatInput';

export default function ChatPanel({
  messages,
  activeRoutingDecision,
  isLoading,
  currentStage,
  stageMessage,
  inputPrompt,
  onChangePrompt,
  onSend,
  image1,
  image2,
  image1Name,
  image2Name,
  onRemoveImage,
  onUploadImages,
  onSwapImages,
  onInspectEvidence,
}) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, currentStage]);

  const examplePrompts = [
    'What is visible in this image?',
    'Where are the buildings and roads located?',
    'Compare optical and SAR radar information.',
    'What changed between these two temporal acquisitions?',
  ];

  const handleSelectPrompt = (p) => {
    onChangePrompt(p);
  };

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <div className="chat-heading">
          <div className="chat-title">
            <MessageSquare size={16} />
            <span>Ask about this image</span>
          </div>
          <span className="chat-subtitle">Type what you want to learn in simple language</span>
        </div>
        <div className="chat-status"><span /> {
          activeRoutingDecision === 'vqa'
            ? 'Image Q&A'
            : activeRoutingDecision === 'crossmodal'
              ? 'Image + Radar'
              : activeRoutingDecision === 'change_detect'
                ? 'Change detection'
                : activeRoutingDecision === 'geospatial_qa'
                  ? 'Map Q&A'
                  : 'Smart mode'
        }</div>
      </div>

      <div className="messages-scrollable" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <div className="welcome-box">
              <div className="welcome-icon"><Sparkles size={17} /></div>
              <h3>What would you like to understand?</h3>
              <p>
                Ask about land cover, infrastructure, sensor fusion, or change across time.
              </p>
            </div>

            <div className="prompt-chips-label">Suggested Questions</div>
            <div className="prompt-chips">
              {examplePrompts.map((p, idx) => (
                <button
                  key={idx}
                  className="prompt-chip"
                  onClick={() => handleSelectPrompt(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className="message-item">
            {msg.role === 'user' ? (
              <div className="user-msg">{msg.content}</div>
            ) : (
              <div className="assistant-msg">
                <AnswerCard
                  rawAnswer={msg.content}
                  routingDecision={msg.routingDecision}
                  routingConfidence={msg.routingConfidence}
                  evidenceArtifacts={msg.evidenceArtifacts}
                />

                <EvidenceCard
                  routingDecision={msg.routingDecision}
                  evidenceArtifacts={msg.evidenceArtifacts}
                  onInspectEvidence={onInspectEvidence}
                />

                <AnalysisDetails
                  routingDecision={msg.routingDecision}
                  routingConfidence={msg.routingConfidence}
                  routingReason={msg.routingReason}
                  latency={msg.latency}
                  mock={msg.mock}
                  explanation={msg.explanation}
                />
              </div>
            )}
          </div>
        ))}

        {}
        {isLoading && (
          <ProgressStepper
            currentStage={currentStage}
            stageMessage={stageMessage}
          />
        )}
      </div>

      <ChatInput
        inputPrompt={inputPrompt}
        onChangePrompt={onChangePrompt}
        onSend={onSend}
        isLoading={isLoading}
        image1={image1}
        image2={image2}
        image1Name={image1Name}
        image2Name={image2Name}
        onRemoveImage={onRemoveImage}
        onUploadImages={onUploadImages}
        onSwapImages={onSwapImages}
      />
    </div>
  );
}
