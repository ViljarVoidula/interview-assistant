import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ConfigScreen from './ConfigScreen';

interface Screenshot {
  id: number;
  preview: string;
  path: string;
}

interface ProcessedSolution {
  approach: string;
  code: string;
  timeComplexity: string;
  spaceComplexity: string;
}

interface HistoryItem {
  id: number;
  type: 'screenshot' | 'audio';
  timestamp: Date;
  result: ProcessedSolution | string; // ProcessedSolution for screenshots, string for audio
  screenshots?: Screenshot[]; // Only for screenshot processing
}

interface Config {
  provider: string;
  openaiApiKey: string;
  geminiApiKey: string;
  language: string;
  model: string;
  audioDeviceId: string;
}

declare global {
  interface Window {
    electron: {
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      quit: () => void;
      takeScreenshot: () => Promise<void>;
      processScreenshots: () => Promise<void>;
      resetQueue: () => Promise<void>;
      toggleRecording: () => Promise<void>;
      resetAudioQueue: () => Promise<void>;
      getConfig: () => Promise<Config | null>;
      saveConfig: (config: Config) => Promise<boolean>;
      onProcessingComplete: (callback: (result: string) => void) => void;
      onScreenshotTaken: (callback: (data: Screenshot) => void) => void;
      onProcessingStarted: (callback: () => void) => void;
      onQueueReset: (callback: () => void) => void;
      onShowConfig: (callback: () => void) => void;
      onRecordingToggled: (callback: (data: { isRecording: boolean; filePath?: string }) => void) => void;
      onRecordingError: (callback: (error: string) => void) => void;
      onAudioProcessingStarted: (callback: () => void) => void;
      onAudioStreamChunk: (callback: (chunk: string) => void) => void;
      onAudioProcessingComplete: (callback: () => void) => void;
      onAudioProcessingError: (callback: (error: string) => void) => void;
      onAudioQueueReset: (callback: () => void) => void;
    };
  }
}

const App: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedSolution | null>(null);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioProcessing, setIsAudioProcessing] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [showStreamingResponse, setShowStreamingResponse] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [currentItem, setCurrentItem] = useState<HistoryItem | null>(null);
  const streamingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await window.electron.getConfig();
      setConfig(savedConfig);
      if (!savedConfig) {
        setShowConfig(true);
      }
    };

    loadConfig();
  }, []);

  useEffect(() => {
    console.log('Setting up event listeners...');
    console.log('window.electron available:', !!window.electron);
    console.log('onAudioStreamChunk available:', !!window.electron?.onAudioStreamChunk);

    // Listen for show config events
    window.electron.onShowConfig(() => {
      setShowConfig(prev => !prev);
    });

    // Listen for processing started events
    window.electron.onProcessingStarted(() => {
      console.log('Processing started');
      setIsProcessing(true);
      setCurrentItem(null); // Clear current item while processing
    });

    // Audio recording event listeners
    window.electron.onRecordingToggled((data) => {
      setIsRecording(data.isRecording);
      if (data.isRecording) {
        // Clear previous streaming response when starting new recording
        setStreamingResponse('');
        setShowStreamingResponse(false);
      }
      if (!data.isRecording && data.filePath) {
        console.log('Recording stopped, file saved:', data.filePath);
      }
    });

    window.electron.onRecordingError((error) => {
      console.error('Recording error:', error);
      setError(error);
      setIsRecording(false);
    });

    window.electron.onAudioProcessingStarted(() => {
      console.log('Audio processing started');
      console.log('Setting isAudioProcessing=true, showStreamingResponse=true, clearing streamingResponse');
      setIsAudioProcessing(true);
      setStreamingResponse('');
      setShowStreamingResponse(true);
      setCurrentItem(null); // Clear current item while processing
    });

    window.electron.onAudioStreamChunk((chunk) => {
      console.log('App.tsx: RECEIVED STREAM CHUNK!', chunk.length, 'characters');
      console.log('Current state before update - showStreamingResponse:', showStreamingResponse, 'isAudioProcessing:', isAudioProcessing);
      setStreamingResponse(prev => {
        const newResponse = prev + chunk;
        console.log('App.tsx: Updated streaming response total length:', newResponse.length);
        
        // Auto-scroll to bottom after state update
        setTimeout(() => {
          if (streamingRef.current) {
            streamingRef.current.scrollTop = streamingRef.current.scrollHeight;
          }
        }, 0);
        
        return newResponse;
      });
      
      // Ensure streaming response is visible
      setShowStreamingResponse(true);
    });

    window.electron.onAudioProcessingComplete(() => {
      console.log('Audio processing complete');
      console.log('Setting isAudioProcessing=false, keeping showStreamingResponse=true');
      setIsAudioProcessing(false);
      
      // Add audio response to history
      if (streamingResponse.trim()) {
        const historyItem: HistoryItem = {
          id: Date.now(),
          type: 'audio',
          timestamp: new Date(),
          result: streamingResponse
        };
        
        setHistory(prev => [historyItem, ...prev]); // Add to beginning
        setCurrentItem(historyItem);
        setShowStreamingResponse(false); // Hide streaming response since we now show from history
      }
    });

    window.electron.onAudioProcessingError((error) => {
      console.error('Audio processing error:', error);
      setError(error);
      setIsAudioProcessing(false);
    });

    window.electron.onAudioQueueReset(() => {
      setStreamingResponse('');
      setShowStreamingResponse(false);
      setIsAudioProcessing(false);
    });

    // Keyboard event listener
    const handleKeyDown = async (event: KeyboardEvent) => {
      console.log('Key pressed:', event.key);
      
      // Check if Cmd/Ctrl is pressed
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;

      switch (event.key.toLowerCase()) {
        case 'h':
          console.log('Screenshot hotkey pressed');
          await handleTakeScreenshot();
          break;
        case 'enter':
          console.log('Process hotkey pressed');
          await handleProcess();
          break;
        case 'r':
          if (isCmdOrCtrl) {
            console.log('Reset hotkey pressed');
            await handleReset(); // This now resets everything
          }
          break;
        case 'm':
          if (isCmdOrCtrl) {
            console.log('Toggle recording hotkey pressed');
            await handleToggleRecording();
          }
          break;
        case 'p':
          if (isCmdOrCtrl) {
            console.log('Toggle config hotkey pressed');
            setShowConfig(prev => !prev);
          }
          break;
        case 'b':
          if (isCmdOrCtrl) {
            console.log('Toggle visibility hotkey pressed');
            // Toggle visibility logic here
          }
          break;
        case 'q':
          if (isCmdOrCtrl) {
            console.log('Quit hotkey pressed');
            handleQuit();
          }
          break;
      }
    };

    // Add keyboard event listener
    window.addEventListener('keydown', handleKeyDown);

    // Listen for processing complete events
    window.electron.onProcessingComplete((resultStr) => {
      console.log('Processing complete. Result:', resultStr);
      let historyItem: HistoryItem;
      try {
        const parsedResult = JSON.parse(resultStr) as ProcessedSolution;
        
        // Add to history
        historyItem = {
          id: Date.now(),
          type: 'screenshot',
          timestamp: new Date(),
          result: parsedResult,
          screenshots: [...screenshots] // Capture current screenshots
        };
        
      } catch (error) {
        console.error('Error parsing result, treating as raw string:', error);
        historyItem = {
          id: Date.now(),
          type: 'screenshot',
          timestamp: new Date(),
          result: resultStr,
          screenshots: [...screenshots]
        };
      }
      setHistory(prev => [historyItem, ...prev]); // Add to beginning
      setCurrentItem(historyItem);
      setResult(null); // Clear old result state since we use currentItem now
      setIsProcessing(false);
    });

    // Listen for new screenshots
    window.electron.onScreenshotTaken((screenshot) => {
      console.log('New screenshot taken:', screenshot);
      setScreenshots(prev => {
        const newScreenshots = [...prev, screenshot];
        console.log('Updated screenshots array:', newScreenshots);
        return newScreenshots;
      });
    });

    // Listen for queue reset
    window.electron.onQueueReset(() => {
      console.log('Queue reset triggered');
      setScreenshots([]);
      // Don't clear history/currentItem here - only clear screenshots
    });

    // Cleanup
    return () => {
      console.log('Cleaning up event listeners...');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000); // Hide error after 5 seconds
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleTakeScreenshot = async () => {
    console.log('Taking screenshot, current count:', screenshots.length);
    if (screenshots.length >= 4) {
      console.log('Maximum screenshots reached');
      return;
    }
    try {
      await window.electron.takeScreenshot();
      console.log('Screenshot taken successfully');
    } catch (error) {
      console.error('Error taking screenshot:', error);
    }
  };

  const handleProcess = async () => {
    console.log('Starting processing. Current screenshots:', screenshots);
    if (screenshots.length === 0) {
      console.log('No screenshots to process');
      return;
    }
    setIsProcessing(true);
    setResult(null);
    setError(null);
    try {
      await window.electron.processScreenshots();
      console.log('Process request sent successfully');
    } catch (error: any) {
      console.error('Error processing screenshots:', error);
      setError(error?.message || 'Error processing screenshots');
      setIsProcessing(false);
    }
  };

  const handleReset = async () => {
    console.log('Resetting all state...');
    // Reset screenshot processing
    await window.electron.resetQueue();
    // Reset audio processing
    setStreamingResponse('');
    setShowStreamingResponse(false);
    setIsAudioProcessing(false);
    await window.electron.resetAudioQueue();
    // Clear history and current item
    setHistory([]);
    setCurrentItem(null);
    setResult(null);
    // Reset processing states
    setIsProcessing(false);
    setIsRecording(false);
    // Clear any errors
    setError(null);
  };

  const handleToggleRecording = async () => {
    console.log('Toggling recording...');
    await window.electron.toggleRecording();
  };

  const handleResetAudio = async () => {
    console.log('Resetting audio queue...');
    setStreamingResponse('');
    setShowStreamingResponse(false);
    setIsAudioProcessing(false);
    await window.electron.resetAudioQueue();
  };

  const handleQuit = () => {
    console.log('Quitting application...');
    window.electron.quit();
  };

  const handleConfigSave = async (newConfig: Config) => {
    try {
      const success = await window.electron.saveConfig(newConfig);
      if (success) {
        setConfig(newConfig);
        setShowConfig(false);
        setError(null);
      } else {
        setError('Failed to save configuration');
      }
    } catch (error: any) {
      console.error('Error saving configuration:', error);
      setError(error?.message || 'Error saving configuration');
    }
  };

  // Log state changes for debugging
  useEffect(() => {
    console.log('State update:', {
      isProcessing,
      isAudioProcessing,
      showStreamingResponse,
      streamingResponseLength: streamingResponse.length,
      result: !!result,
      currentItem: currentItem ? `${currentItem.type}-${currentItem.id}` : null,
      historyCount: history.length,
      screenshotCount: screenshots.length
    });
  }, [isProcessing, isAudioProcessing, showStreamingResponse, streamingResponse, result, currentItem, history, screenshots]);

  const formatCode = (code: string) => {
    return code.split('\n').map((line, index) => (
      <div key={index} className="code-line">
        <span className="line-number">{index + 1}</span>
        {line}
      </div>
    ));
  };

  // Log rendering decision
  console.log('Render decision - isProcessing:', isProcessing, 'showStreamingResponse:', showStreamingResponse, 'isAudioProcessing:', isAudioProcessing, 'currentItem:', currentItem?.type, 'historyCount:', history.length);

  return (
    <div className="app">
      {error && (
        <div className="error-bar">
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}
      {showConfig && (
        <ConfigScreen
          onSave={handleConfigSave}
          initialConfig={config || undefined}
        />
      )}
      
      {/* Preview Row */}
      <div className="shortcuts-row">
        <div className="shortcut"><code>⌘/Ctrl + H</code> Screenshot</div>
        <div className="shortcut"><code>⌘/Ctrl + ↵</code> Solution</div>
        <div className="shortcut"><code>⌘/Ctrl + R</code> Reset</div>
        <div className="hover-shortcuts">
          <div className="hover-shortcuts-content">
            <div className="shortcut"><code>⌘/Ctrl + B</code> Show/Hide</div>
            <div className="shortcut"><code>⌘/Ctrl + P</code> Settings</div>
            <div className="shortcut"><code>⌘/Ctrl + Q</code> Quit</div>
            <div className="shortcut"><code>⌘/Ctrl + Arrow Keys</code> Move Around</div>
          </div>
        </div>
      </div>
      <div className="preview-row">
        {screenshots.map(screenshot => (
          <div key={screenshot.id} className="preview-item">
            <img src={screenshot.preview} alt="Screenshot preview" />
          </div>
        ))}
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="history-section">
          <div className="history-header">
            <h4>Processing History ({history.length})</h4>
            <button onClick={() => setHistory([])} className="clear-history-btn">
              Clear History
            </button>
          </div>
          <div className="history-items">
            {history.slice(0, 5).map((item) => (
              <div 
                key={item.id} 
                className={`history-item ${currentItem?.id === item.id ? 'active' : ''}`}
                onClick={() => setCurrentItem(item)}
              >
                <div className="history-item-header">
                  <span className={`history-type ${item.type}`}>
                    {item.type === 'screenshot' ? '📸' : '🎤'} {item.type}
                  </span>
                  <span className="history-time">
                    {item.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="history-preview">
                  {item.type === 'screenshot' && typeof item.result === 'object' 
                    ? item.result.approach.substring(0, 60) + '...'
                    : typeof item.result === 'string' 
                    ? item.result.substring(0, 60) + '...'
                    : 'Processing result'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Row */}
      <div className="status-row">
        {isProcessing ? (
          <div className="processing">Processing... ({screenshots.length} screenshots)</div>
        ) : showStreamingResponse ? (
          <div className="result">
            <div className="solution-section">
              <h3>Question Response {isAudioProcessing && <span className="streaming-indicator">●</span>}</h3>
              <div className="streaming-response" ref={streamingRef}>
                <pre>{streamingResponse}</pre>
              </div>
            </div>
            <div className="hint">(Press ⌘/Ctrl + M to record new question)</div>
          </div>
        ) : isAudioProcessing ? (
          <div className="processing">Processing audio...</div>
        ) : currentItem ? (
          <div className="result">
            {currentItem.type === 'screenshot' && typeof currentItem.result === 'object' ? (
              <>
                <div className="solution-section">
                  <h3>Approach</h3>
                  <p>{currentItem.result.approach}</p>
                </div>
                <div className="solution-section">
                  <h3>Solution</h3>
                  <pre>
                    <code>{formatCode(currentItem.result.code)}</code>
                  </pre>
                </div>
                <div className="solution-section">
                  <h3>Complexity</h3>
                  <p>Time: {currentItem.result.timeComplexity}</p>
                  <p>Space: {currentItem.result.spaceComplexity}</p>
                </div>
              </>
            ) : typeof currentItem.result === 'string' ? (
              <div className="solution-section">
                <h3>{currentItem.type === 'audio' ? 'Question Response' : 'Raw Response'}</h3>
                <div className="streaming-response">
                  <pre>{currentItem.result}</pre>
                </div>
              </div>
            ) : null}
            <div className="solution-section">
              <small>Processed: {currentItem.timestamp.toLocaleString()}</small>
            </div>
            <div className="hint">(Press ⌘/Ctrl + R to reset all history)</div>
          </div>
        ) : (
          <div className="empty-status">
            {isRecording ? (
              <div className="recording-status">
                <span className="recording-indicator">🔴</span> Recording... (Press ⌘/Ctrl + M to stop)
              </div>
            ) : screenshots.length > 0 ? (
              `Press ⌘/Ctrl + ↵ to process ${screenshots.length} screenshot${screenshots.length > 1 ? 's' : ''}`
            ) : history.length > 0 ? (
              <div className="instructions">
                <p>Latest result shown above</p>
                <p>Press ⌘/Ctrl + H to take screenshot or ⌘/Ctrl + M to record audio</p>
              </div>
            ) : (
              <div className="instructions">
                <p>Press ⌘/Ctrl + H to take a screenshot</p>
                <p>Press ⌘/Ctrl + M to record audio question</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;