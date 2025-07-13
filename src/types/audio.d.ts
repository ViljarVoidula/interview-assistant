declare module 'mic' {
  interface MicOptions {
    rate?: number;
    channels?: number;
    debug?: boolean;
    exitOnSilence?: number;
    device?: string;
  }

  interface MicInstance {
    start(): void;
    stop(): void;
    getAudioStream(): NodeJS.ReadableStream;
  }

  function mic(options?: MicOptions): MicInstance;
  export = mic;
}

declare module 'node-wav' {
  interface EncodeOptions {
    sampleRate: number;
    float: boolean;
    bitDepth: number;
  }

  export function encode(buffers: Buffer[], options: EncodeOptions): Buffer;
  export function decode(buffer: Buffer): { sampleRate: number; channelData: Float32Array[] };
}
