import * as fs from 'fs/promises';
import * as path from 'path';
import { app } from 'electron';
import { spawn, ChildProcess } from 'child_process';

interface AudioRecorderConfig {
  deviceId: string;
  sampleRate: number;
  channels: number;
}

class AudioRecorderService {
  private isRecording = false;
  private recordingProcess: ChildProcess | null = null;
  private outputPath = '';
  private questionCounter = 1;
  private config: AudioRecorderConfig = {
    deviceId: 'default',
    sampleRate: 16000,
    channels: 1
  };

  constructor() {
    this.ensureRecordingDir();
  }

  private async ensureRecordingDir() {
    const recordingDir = path.join(app.getPath('userData'), 'recordings');
    try {
      await fs.mkdir(recordingDir, { recursive: true });
      console.log('Recording directory ensured:', recordingDir);
    } catch (error) {
      console.error('Error creating recording directory:', error);
    }
  }

  updateConfig(deviceId: string) {
    this.config.deviceId = deviceId;
  }

  private async checkRecordingCapability(): Promise<string> {
    // Check if we have recording tools available
    const commands = ['arecord', 'sox', 'ffmpeg'];
    
    for (const cmd of commands) {
      try {
        const result = await new Promise<boolean>((resolve) => {
          const process = spawn('which', [cmd], { stdio: 'ignore' });
          process.on('close', (code) => resolve(code === 0));
        });
        if (result) {
          return cmd;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('No audio recording tool found. Please install arecord, sox, or ffmpeg.');
  }

  async startRecording(): Promise<string> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    const recordingDir = path.join(app.getPath('userData'), 'recordings');
    this.outputPath = path.join(recordingDir, `question-${this.questionCounter}.wav`);
    
    try {
      const recordingTool = await this.checkRecordingCapability();
      
      let args: string[] = [];
      
      if (recordingTool === 'arecord') {
        // Use ALSA arecord (Linux)
        args = [
          '-f', 'cd',  // CD quality (16-bit, 44.1kHz, stereo)
          '-t', 'wav',
          '-c', this.config.channels.toString(),
          '-r', this.config.sampleRate.toString(),
          this.outputPath
        ];
      } else if (recordingTool === 'sox') {
        // Use SoX
        args = [
          '-d',  // default input device
          '-t', 'wav',
          '-c', this.config.channels.toString(),
          '-r', this.config.sampleRate.toString(),
          this.outputPath
        ];
      } else if (recordingTool === 'ffmpeg') {
        // Use FFmpeg
        args = [
          '-f', 'pulse',  // Use PulseAudio
          '-i', 'default',
          '-ac', this.config.channels.toString(),
          '-ar', this.config.sampleRate.toString(),
          '-acodec', 'pcm_s16le',
          this.outputPath
        ];
      }

      this.recordingProcess = spawn(recordingTool, args);
      
      this.recordingProcess.on('error', (error) => {
        console.error('Recording process error:', error);
        this.isRecording = false;
      });

      this.recordingProcess.stderr?.on('data', (data) => {
        console.log('Recording stderr:', data.toString());
      });

      this.isRecording = true;
      console.log(`Started recording with ${recordingTool} to: ${this.outputPath}`);
      return this.outputPath;
      
    } catch (error) {
      this.isRecording = false;
      console.error('Failed to start recording:', error);
      throw new Error(`Failed to start recording: ${error}`);
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    try {
      this.isRecording = false;
      
      if (this.recordingProcess) {
        // Send SIGINT to gracefully stop recording
        this.recordingProcess.kill('SIGINT');
        
        // Wait for process to finish
        await new Promise<void>((resolve) => {
          this.recordingProcess?.on('close', () => {
            resolve();
          });
        });
        
        this.recordingProcess = null;
      }

      // Verify file was created and has content
      try {
        const stats = await fs.stat(this.outputPath);
        if (stats.size === 0) {
          throw new Error('Recording file is empty');
        }
      } catch (error) {
        throw new Error(`Recording file was not created properly: ${error}`);
      }

      const filePath = this.outputPath;
      this.questionCounter++;
      
      console.log(`Recording saved to: ${filePath}`);
      return filePath;
    } catch (error) {
      this.isRecording = false;
      console.error('Failed to stop recording:', error);
      throw new Error(`Failed to stop recording: ${error}`);
    }
  }

  toggleRecording(): Promise<string> {
    if (this.isRecording) {
      return this.stopRecording();
    } else {
      return this.startRecording();
    }
  }

  getRecordingStatus(): boolean {
    return this.isRecording;
  }

  // Convert audio file to base64 for sending to AI services
  async audioFileToBase64(filePath: string): Promise<string> {
    try {
      const audioBuffer = await fs.readFile(filePath);
      return audioBuffer.toString('base64');
    } catch (error) {
      throw new Error(`Failed to read audio file: ${error}`);
    }
  }
}

export default new AudioRecorderService();
