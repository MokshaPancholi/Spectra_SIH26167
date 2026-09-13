import React, { useRef, useEffect } from 'react';
import { ArrowLeftRight, Send, Upload, X } from 'lucide-react';

export default function ChatInput({
  inputPrompt,
  onChangePrompt,
  onSend,
  isLoading,
  image1,
  image2,
  image1Name,
  image2Name,
  onRemoveImage,
  onUploadImages,
  onSwapImages,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputPrompt]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && inputPrompt.trim()) {
        onSend();
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    onUploadImages(files);
    e.target.value = '';
  };

  const canSend = !isLoading && inputPrompt.trim().length > 0;

  return (
    <div className="chat-input-area">
      {/* Attached Images Pill Tray */}
      {(image1 || image2) && (
        <div className="input-image-tray">
          {image1 && (
            <div className="image-pill">
              <img src={image1} alt="Image 1" className="image-pill-thumb" />
              <span className="image-pill-label">{image1Name || 'Image 1'}</span>
              <button
                className="image-pill-remove"
                title="Remove image"
                onClick={() => onRemoveImage(1)}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {image2 && (
            <div className="image-pill">
              <img src={image2} alt="Image 2" className="image-pill-thumb" />
              <span className="image-pill-label">{image2Name || 'Image 2'}</span>
              <button
                className="image-pill-remove"
                title="Remove image"
                onClick={() => onRemoveImage(2)}
              >
                <X size={12} />
              </button>
            </div>
          )}
          {image1 && image2 && (
            <button className="image-order-btn" onClick={onSwapImages} type="button" title="Swap reference order">
              <ArrowLeftRight size={13} /> Swap order
            </button>
          )}
        </div>
      )}

      {/* Input box */}
      <div className="input-box-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Ask anything about your satellite imagery..."
          rows={1}
          value={inputPrompt}
          onChange={(e) => onChangePrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <div className="input-actions">
          <button
            className="upload-btn"
            title="Upload Satellite Imagery (Single or Pair)"
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <Upload size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          <button
            className={`send-btn ${canSend ? 'ready' : ''}`}
            title="Send query (Enter)"
            disabled={!canSend}
            onClick={onSend}
            type="button"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      <div className="input-helper-text">
        <span>Enter to send · Shift+Enter for new line</span>
        {isLoading && <span style={{ color: 'var(--accent-cyan)' }}>Processing...</span>}
      </div>
    </div>
  );
}
