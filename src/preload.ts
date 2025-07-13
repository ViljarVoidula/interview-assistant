import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  quit: () => ipcRenderer.send('quit-app'),
  
  takeScreenshot: () => ipcRenderer.invoke('take-screenshot'),
  processScreenshots: () => ipcRenderer.invoke('process-screenshots'),
  resetQueue: () => ipcRenderer.invoke('reset-queue'),
  toggleRecording: () => ipcRenderer.invoke('toggle-recording'),
  resetAudioQueue: () => ipcRenderer.invoke('reset-audio-queue'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  
  toggleVisibility: () => ipcRenderer.send('toggle-visibility'),
  
  onProcessingComplete: (callback: (result: string) => void) => {
    ipcRenderer.on('processing-complete', (_, result) => callback(result));
  },
  onScreenshotTaken: (callback: (data: any) => void) => {
    ipcRenderer.on('screenshot-taken', (_, data) => callback(data));
  },
  onProcessingStarted: (callback: () => void) => {
    ipcRenderer.on('processing-started', () => callback());
  },
  onQueueReset: (callback: () => void) => {
    ipcRenderer.on('queue-reset', () => callback());
  },
  onShowConfig: (callback: () => void) => {
    ipcRenderer.on('show-config', () => callback());
  },
  
  // Audio recording event listeners
  onRecordingToggled: (callback: (data: { isRecording: boolean; filePath?: string }) => void) => {
    ipcRenderer.on('recording-toggled', (_, data) => callback(data));
  },
  onRecordingError: (callback: (error: string) => void) => {
    ipcRenderer.on('recording-error', (_, error) => callback(error));
  },
  onAudioProcessingStarted: (callback: () => void) => {
    ipcRenderer.on('audio-processing-started', () => callback());
  },
  onAudioStreamChunk: (callback: (chunk: string) => void) => {
    // Remove any existing listeners first to prevent duplicates
    ipcRenderer.removeAllListeners('audio-stream-chunk');
    console.log('Preload: Setting up audio-stream-chunk listener');
    ipcRenderer.on('audio-stream-chunk', (event, chunk) => {
      console.log('Preload: Received audio-stream-chunk:', typeof chunk, chunk.length, 'characters');
      callback(chunk);
    });
  },
  onAudioProcessingComplete: (callback: () => void) => {
    ipcRenderer.on('audio-processing-complete', () => callback());
  },
  onAudioProcessingError: (callback: (error: string) => void) => {
    ipcRenderer.on('audio-processing-error', (_, error) => callback(error));
  },
  onAudioQueueReset: (callback: () => void) => {
    ipcRenderer.on('audio-queue-reset', () => callback());
  }
}); 