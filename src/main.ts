import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import openaiService from './services/openai';
import geminiService from './services/gemini';
import audioRecorderService from './services/audioRecorder';
import { InterviewType } from './services/promptFactory';

const execFileAsync = promisify(execFile);

interface Screenshot {
  id: number;
  preview: string;
  path: string;
}

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');
console.log(CONFIG_FILE);

interface Config {
  provider: string;
  openaiApiKey: string;
  geminiApiKey: string;
  language: string;
  model: string;
  audioDeviceId: string;
  interviewType: InterviewType;
}

let config: Config | null = null;

let mainWindow: BrowserWindow | null = null;
let screenshotQueue: Screenshot[] = [];
let isProcessing = false;
const MAX_SCREENSHOTS = 4;
const SCREENSHOT_DIR = path.join(app.getPath('temp'), 'screenshots');

async function ensureScreenshotDir() {
  try {
    await fs.mkdir(SCREENSHOT_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating screenshot directory:', error);
  }
}

async function loadConfig(): Promise<Config | null> {
  try {
    // First try loading from environment variables
    const envOpenaiKey = process.env.OPENAI_API_KEY;
    const envGeminiKey = process.env.GEMINI_API_KEY;
    const envLanguage = process.env.APP_LANGUAGE;
    const envModel = process.env.AI_MODEL;
    const envProvider = process.env.AI_PROVIDER;
    const envInterviewType = process.env.INTERVIEW_TYPE as InterviewType;

    if ((envOpenaiKey || envGeminiKey) && envLanguage && envModel && envProvider) {
      const envConfig: Config = {
        provider: envProvider,
        openaiApiKey: envOpenaiKey || '',
        geminiApiKey: envGeminiKey || '',
        language: envLanguage,
        model: envModel,
        audioDeviceId: 'default',
        interviewType: envInterviewType || 'algorithmic'
      };
      
      // Initialize the appropriate service
      if (envProvider === 'openai' && envOpenaiKey) {
        openaiService.updateConfig({
          apiKey: envOpenaiKey,
          language: envLanguage,
          model: envModel,
          interviewType: envInterviewType || 'algorithmic'
        });
      } else if (envProvider === 'gemini' && envGeminiKey) {
        geminiService.updateConfig({
          geminiApiKey: envGeminiKey,
          language: envLanguage,
          model: envModel,
          interviewType: envInterviewType || 'algorithmic'
        });
      }
      
      return envConfig;
    }

    // If env vars not found, try loading from config file
    const data = await fs.readFile(CONFIG_FILE, 'utf-8');
    const loadedConfig = JSON.parse(data) as Partial<Config>;
    
    if (loadedConfig && loadedConfig.provider && loadedConfig.language && loadedConfig.model) {
      const completeConfig: Config = {
        provider: loadedConfig.provider,
        openaiApiKey: loadedConfig.openaiApiKey || '',
        geminiApiKey: loadedConfig.geminiApiKey || '',
        language: loadedConfig.language,
        model: loadedConfig.model,
        audioDeviceId: loadedConfig.audioDeviceId || 'default',
        interviewType: loadedConfig.interviewType || 'algorithmic'
      };
      
      // Initialize the appropriate service
      if (completeConfig.provider === 'openai' && completeConfig.openaiApiKey) {
        openaiService.updateConfig({
          apiKey: completeConfig.openaiApiKey,
          language: completeConfig.language,
          model: completeConfig.model,
          interviewType: completeConfig.interviewType
        });
      } else if (completeConfig.provider === 'gemini' && completeConfig.geminiApiKey) {
        geminiService.updateConfig({
          geminiApiKey: completeConfig.geminiApiKey,
          language: completeConfig.language,
          model: completeConfig.model,
          interviewType: completeConfig.interviewType
        });
      }
      
      // Update audio recorder config
      audioRecorderService.updateConfig(completeConfig.audioDeviceId);
      
      return completeConfig;
    }
    return null;
  } catch (error) {
    console.error('Error loading config:', error);
    return null;
  }
}

async function saveConfig(newConfig: Config): Promise<void> {
  try {
    if (!newConfig.provider || !newConfig.language || !newConfig.model) {
      throw new Error('Invalid configuration - missing required fields');
    }
    
    // Validate that the appropriate API key is provided
    if (newConfig.provider === 'openai' && !newConfig.openaiApiKey) {
      throw new Error('OpenAI API key is required when using OpenAI provider');
    }
    if (newConfig.provider === 'gemini' && !newConfig.geminiApiKey) {
      throw new Error('Gemini API key is required when using Gemini provider');
    }
    
    await fs.writeFile(CONFIG_FILE, JSON.stringify(newConfig, null, 2));
    config = newConfig;
    
    // Update the appropriate service with new config
    if (newConfig.provider === 'openai' && newConfig.openaiApiKey) {
      openaiService.updateConfig({
        apiKey: newConfig.openaiApiKey,
        language: newConfig.language,
        model: newConfig.model,
        interviewType: newConfig.interviewType
      });
    } else if (newConfig.provider === 'gemini' && newConfig.geminiApiKey) {
      geminiService.updateConfig({
        geminiApiKey: newConfig.geminiApiKey,
        language: newConfig.language,
        model: newConfig.model,
        interviewType: newConfig.interviewType
      });
    }
    
    // Update audio recorder config
    audioRecorderService.updateConfig(newConfig.audioDeviceId);
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,           
    transparent: true,     
    backgroundColor: "#00000000",  
    hasShadow: false,    
    alwaysOnTop: true,     
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Open DevTools by default in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Register DevTools shortcut
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Enable content protection to prevent screen capture
  mainWindow.setContentProtection(true);

  // Platform specific enhancements for macOS
  if (process.platform === 'darwin') {
    mainWindow.setHiddenInMissionControl(true);
    mainWindow.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true
    });
    mainWindow.setAlwaysOnTop(true, "floating");
  }

  // Load the index.html file from the dist directory
  mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));

  // Register global shortcuts
  registerShortcuts();
}

function registerShortcuts() {
  // Screenshot & Processing shortcuts
  globalShortcut.register('CommandOrControl+H', handleTakeScreenshot);
  globalShortcut.register('CommandOrControl+Enter', handleProcessScreenshots);
  globalShortcut.register('CommandOrControl+R', handleResetQueue);
  globalShortcut.register('CommandOrControl+Q', () => app.quit());
  
  // Audio recording
  globalShortcut.register('CommandOrControl+M', handleToggleRecording);
  
  // Window visibility
  globalShortcut.register('CommandOrControl+B', handleToggleVisibility);
  
  // Window movement
  globalShortcut.register('CommandOrControl+Left', () => moveWindow('left'));
  globalShortcut.register('CommandOrControl+Right', () => moveWindow('right'));
  globalShortcut.register('CommandOrControl+Up', () => moveWindow('up'));
  globalShortcut.register('CommandOrControl+Down', () => moveWindow('down'));

  // Config shortcut
  globalShortcut.register('CommandOrControl+P', () => {
    mainWindow?.webContents.send('show-config');
  });
}

async function captureScreenshot(): Promise<Buffer> {
  const tmpPath = path.join(SCREENSHOT_DIR, `${Date.now()}.png`);
  // log platform
  if (process.platform === 'darwin') {
    // macOS implementation using screencapture
    await execFileAsync('screencapture', ['-x', tmpPath]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  } else if (process.platform === 'linux') {
    // Linux implementation - try multiple screenshot tools
    const tools = [
      { cmd: 'gnome-screenshot', args: ['-f', tmpPath] },
      { cmd: 'scrot', args: [tmpPath] },
      { cmd: 'import', args: ['-window', 'root', tmpPath] }, // ImageMagick
      { cmd: 'maim', args: [tmpPath] },
      { cmd: 'spectacle', args: ['-b', '-n', '-o', tmpPath] }
    ];

    for (const tool of tools) {
      try {
        await execFileAsync(tool.cmd, tool.args);
        const buffer = await fs.readFile(tmpPath);
        await fs.unlink(tmpPath);
        return buffer;
      } catch (error) {
        // Tool not available or failed, try next one
        continue;
      }
    }
    
    throw new Error('No screenshot tool available on Linux. Please install one of: gnome-screenshot, scrot, imagemagick, maim, or spectacle');
  } else if (process.platform === 'win32') {
    // Windows implementation
    const script = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $screen = [System.Windows.Forms.Screen]::PrimaryScreen
      $bitmap = New-Object System.Drawing.Bitmap $screen.Bounds.Width, $screen.Bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $bitmap.Size)
      $bitmap.Save('${tmpPath.replace(/\\/g, "\\\\")}')
      $graphics.Dispose()
      $bitmap.Dispose()
    `;

    
    await execFileAsync('powershell', ['-command', script]);
    const buffer = await fs.readFile(tmpPath);
    await fs.unlink(tmpPath);
    return buffer;
  } else {
    // Fallback for unsupported platforms
    throw new Error(`Screenshot capture not supported on platform: ${process.platform}`);
  }
}

async function handleTakeScreenshot() {
  if (screenshotQueue.length >= MAX_SCREENSHOTS) return;

  try {
    // Hide window before taking screenshot
    mainWindow?.hide();
    await new Promise(resolve => setTimeout(resolve, 100));

    const buffer = await captureScreenshot();
    const id = Date.now();
    const screenshotPath = path.join(SCREENSHOT_DIR, `${id}.png`);
    
    await fs.writeFile(screenshotPath, buffer);
    const preview = `data:image/png;base64,${buffer.toString('base64')}`;
    
    const screenshot = { id, preview, path: screenshotPath };
    screenshotQueue.push(screenshot);

    mainWindow?.show();
    mainWindow?.webContents.send('screenshot-taken', screenshot);
  } catch (error) {
    console.error('Error taking screenshot:', error);
    mainWindow?.show();
  }
}

async function handleProcessScreenshots() {
  if (isProcessing || screenshotQueue.length === 0) return;
  
  if (!config) {
    console.error('No configuration found');
    mainWindow?.webContents.send('processing-complete', JSON.stringify({
      approach: 'Error',
      code: 'No configuration found. Please configure your API keys.',
      timeComplexity: '',
      spaceComplexity: ''
    }));
    return;
  }
  
  isProcessing = true;
  mainWindow?.webContents.send('processing-started');

  try {
    let result;
    
    // Use the appropriate service based on the configured provider
    if (config.provider === 'openai') {
      result = await openaiService.processScreenshots(screenshotQueue);
    } else if (config.provider === 'gemini') {
      // Convert screenshots to base64 images for Gemini
      const base64Images = screenshotQueue.map(screenshot => screenshot.preview);
      result = await geminiService.processImages(base64Images);
    } else {
      throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
    
    // Check if processing was cancelled
    if (!isProcessing) return;
    mainWindow?.webContents.send('processing-complete', JSON.stringify(result));
  } catch (error: any) {
    console.error('Error processing screenshots:', error);
    // Check if processing was cancelled
    if (!isProcessing) return;
    
    // Extract the most relevant error message
    let errorMessage = 'Error processing screenshots';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    mainWindow?.webContents.send('processing-complete', JSON.stringify({
      error: errorMessage,
      approach: 'Error occurred while processing',
      code: 'Error: ' + errorMessage,
      timeComplexity: 'N/A',
      spaceComplexity: 'N/A'
    }));
  } finally {
    isProcessing = false;
  }
}

async function handleResetQueue() {
  // Cancel any ongoing processing
  if (isProcessing) {
    isProcessing = false;
    mainWindow?.webContents.send('processing-complete', JSON.stringify({
      approach: 'Processing cancelled',
      code: '',
      timeComplexity: '',
      spaceComplexity: ''
    }));
  }

  // Delete all screenshot files
  for (const screenshot of screenshotQueue) {
    try {
      await fs.unlink(screenshot.path);
    } catch (error) {
      console.error('Error deleting screenshot:', error);
    }
  }
  
  screenshotQueue = [];
  mainWindow?.webContents.send('queue-reset');
}

function handleToggleVisibility() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
  }
}

function moveWindow(direction: 'left' | 'right' | 'up' | 'down') {
  if (!mainWindow) return;
  
  const [x, y] = mainWindow.getPosition();
  const moveAmount = 50;
  
  switch (direction) {
    case 'left':
      mainWindow.setPosition(x - moveAmount, y);
      break;
    case 'right':
      mainWindow.setPosition(x + moveAmount, y);
      break;
    case 'up':
      mainWindow.setPosition(x, y - moveAmount);
      break;
    case 'down':
      mainWindow.setPosition(x, y + moveAmount);
      break;
  }
}

// Audio recording handlers
async function handleToggleRecording() {
  try {
    const filePath = await audioRecorderService.toggleRecording();
    const isRecording = audioRecorderService.getRecordingStatus();
    
    mainWindow?.webContents.send('recording-toggled', { isRecording, filePath });
    
    if (!isRecording && filePath) {
      // Recording stopped, process the audio
      await handleProcessAudio(filePath);
    }
  } catch (error: any) {
    console.error('Error toggling recording:', error);
    mainWindow?.webContents.send('recording-error', error.message);
  }
}

async function handleProcessAudio(audioFilePath: string) {
  if (!config) {
    console.error('No configuration found');
    mainWindow?.webContents.send('audio-processing-error', 'No configuration found');
    return;
  }

  try {
    console.log('Starting audio processing for file:', audioFilePath);
    mainWindow?.webContents.send('audio-processing-started');
    
    // Convert audio to base64
    console.log('Converting audio to base64...');
    const audioBase64 = await audioRecorderService.audioFileToBase64(audioFilePath);
    console.log('Audio converted to base64, length:', audioBase64.length);
    
    if (config.provider === 'gemini') {
      // Stream the response
      console.log('Starting Gemini audio processing with streaming...');
      await geminiService.processAudioStream(audioBase64, (chunk: string) => {
        console.log('Main: Received chunk from Gemini, sending to renderer:', chunk.length, 'characters');
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('audio-stream-chunk', chunk);
        }
      });
      console.log('Gemini streaming completed');
      
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('audio-processing-complete');
      }
    } else {
      // For OpenAI, we'd need to implement audio processing (not available in current OpenAI service)
      throw new Error('Audio processing is currently only supported with Gemini provider');
    }
    
  } catch (error: any) {
    console.error('Error processing audio:', error);
    mainWindow?.webContents.send('audio-processing-error', error.message);
  }
}

async function handleResetAudioQueue() {
  // Reset any ongoing audio processing
  mainWindow?.webContents.send('audio-queue-reset');
}

// This method will be called when Electron has finished initialization
app.whenReady().then(async () => {
  await ensureScreenshotDir();
  // Load config before creating window
  config = await loadConfig();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  handleResetQueue();
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('take-screenshot', handleTakeScreenshot);
ipcMain.handle('process-screenshots', handleProcessScreenshots);
ipcMain.handle('reset-queue', handleResetQueue);
ipcMain.handle('toggle-recording', handleToggleRecording);
ipcMain.handle('reset-audio-queue', handleResetAudioQueue);

// Window control events
ipcMain.on('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow?.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow?.close();
});

ipcMain.on('quit-app', () => {
  app.quit();
});

ipcMain.on('toggle-visibility', handleToggleVisibility);

// Add these IPC handlers before app.whenReady()
ipcMain.handle('get-config', async () => {
  try {
    if (!config) {
      config = await loadConfig();
    }
    return config;
  } catch (error) {
    console.error('Error getting config:', error);
    return null;
  }
});

ipcMain.handle('save-config', async (_, newConfig: Config) => {
  try {
    await saveConfig(newConfig);
    return true;
  } catch (error) {
    console.error('Error in save-config handler:', error);
    return false;
  }
});
