import React, { useState, useEffect } from 'react';
import './ConfigScreen.css';

import { InterviewType } from '../services/promptFactory';

interface ConfigProps {
  onSave: (config: {
    provider: string;
    openaiApiKey: string;
    geminiApiKey: string;
    language: string;
    model: string;
    audioDeviceId: string;
    interviewType: InterviewType;
  }) => void;
  initialConfig?: {
    provider: string;
    openaiApiKey: string;
    geminiApiKey: string;
    language: string;
    model: string;
    audioDeviceId: string;
    interviewType: InterviewType;
  };
}

const ConfigScreen: React.FC<ConfigProps> = ({ onSave, initialConfig }) => {
  const [provider, setProvider] = useState(initialConfig?.provider || 'openai');
  const [openaiApiKey, setOpenaiApiKey] = useState(initialConfig?.openaiApiKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(initialConfig?.geminiApiKey || '');
  const [language, setLanguage] = useState(initialConfig?.language || 'Python');
  const [model, setModel] = useState(initialConfig?.model || 'gpt-3.5-turbo');
  const [audioDeviceId, setAudioDeviceId] = useState(initialConfig?.audioDeviceId || 'default');
  const [interviewType, setInterviewType] = useState<InterviewType>(initialConfig?.interviewType || 'algorithmic');
  const [audioDevices, setAudioDevices] = useState<{id: string, label: string}[]>([]);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // Load available audio devices
  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices
          .filter(device => device.kind === 'audioinput')
          .map(device => ({
            id: device.deviceId,
            label: device.label || `Audio Input ${device.deviceId.slice(0, 8)}`
          }));
        setAudioDevices([{id: 'default', label: 'Default Audio Input'}, ...audioInputs]);
      } catch (error) {
        console.error('Error loading audio devices:', error);
        setAudioDevices([{id: 'default', label: 'Default Audio Input'}]);
      }
    };
    
    loadAudioDevices();
  }, []);

  // Update model when provider changes
  useEffect(() => {
    if (provider === 'openai' && !['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'].includes(model)) {
      setModel('gpt-3.5-turbo');
    } else if (provider === 'gemini' && !['gemini-2.5-flash', 'gemini-2.5-pro'].includes(model)) {
      setModel('gemini-2.5-flash');
    }
  }, [provider, model]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      provider,
      openaiApiKey: openaiApiKey.trim(),
      geminiApiKey: geminiApiKey.trim(),
      language,
      model,
      audioDeviceId,
      interviewType
    });
  };

  return (
    <div className="config-screen">
      <div className="config-container">
        <h2>Configuration</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="provider">AI Provider</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              required
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>
          
          {provider === 'openai' && (
            <div className="form-group">
              <label htmlFor="openaiApiKey">OpenAI API Key</label>
              <div className="api-key-input">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  id="openaiApiKey"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  required
                  placeholder="sk-..."
                  spellCheck="false"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}
          
          {provider === 'gemini' && (
            <div className="form-group">
              <label htmlFor="geminiApiKey">Google AI API Key</label>
              <div className="api-key-input">
                <input
                  type={showGeminiKey ? "text" : "password"}
                  id="geminiApiKey"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  required
                  placeholder="AI..."
                  spellCheck="false"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="language">Preferred Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              required
            >
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="Java">Java</option>
              <option value="C++">C++</option>
              <option value="C">C</option>
              <option value="Go">Go</option>
              <option value="Rust">Rust</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="interviewType">Interview Type</label>
            <select
              id="interviewType"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value as InterviewType)}
              required
            >
              <option value="algorithmic">Algorithmic</option>
              <option value="frontend">Frontend</option>
              <option value="java-microservices">Java Microservices</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="audioDevice">Audio Input Device</label>
            <select
              id="audioDevice"
              value={audioDeviceId}
              onChange={(e) => setAudioDeviceId(e.target.value)}
              required
            >
              {audioDevices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="model">Model</label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              required
            >
              {provider === 'openai' ? (
                <>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                  <option value="gpt-4">gpt-4</option>
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                </>
              ) : (
                <>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                </>
              )}
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" className="save-button">
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigScreen;
