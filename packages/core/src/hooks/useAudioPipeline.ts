import { useState, useRef, useEffect } from 'react';
import { SpectrogramConfig, AcousticFeatures } from '../types/interfaces';

export interface UseAudioPipelineResult {
  isRecording: boolean;
  recordingDuration: number;
  audioUrl: string | null;
  analyserNode: AnalyserNode | null;
  audioContext: AudioContext | null;
  acousticFeatures: AcousticFeatures | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  resetPipeline: () => void;
}

/**
 * Custom hook managing the Web Audio API recording pipeline, WAV encoding,
 * and DSP analysis (STFT + feature extraction stubbing) for DSRS.
 */
export function useAudioPipeline(
  patientHash: string,
  config: SpectrogramConfig = {
    stft: { windowSize: 2048, overlapSize: 1024, windowFunction: 'hann' },
    display: { frequencyMaxHz: 8000, dynamicRangeDb: 80 },
  }
): UseAudioPipelineResult {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [acousticFeatures, setAcousticFeatures] = useState<AcousticFeatures | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const sampleRateRef = useRef<number>(44100);

  // Apply Hann windowing to a buffer of audio samples
  const applyHannWindow = (buffer: Float32Array): Float32Array => {
    const size = buffer.length;
    const windowed = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
      windowed[i] = buffer[i] * windowValue;
    }
    return windowed;
  };

  // Basic Autocorrelation Pitch Detector (F0 estimation)
  const estimateF0 = (buffer: Float32Array, sampleRate: number): number => {
    const minFreq = 70;
    const maxFreq = 400;
    const maxShift = Math.floor(sampleRate / minFreq);
    const minShift = Math.floor(sampleRate / maxFreq);

    let bestShift = -1;
    let maxR = -Infinity;

    for (let shift = minShift; shift <= maxShift; shift++) {
      let r = 0;
      for (let i = 0; i < buffer.length - shift; i++) {
        r += buffer[i] * buffer[i + shift];
      }
      if (r > maxR) {
        maxR = r;
        bestShift = shift;
      }
    }

    return bestShift > 0 ? sampleRate / bestShift : 0;
  };

  // Helper to extract perturbation indices & formants
  const extractAcousticFeatures = (
    recordedSamples: Float32Array[],
    sampleRate: number
  ): AcousticFeatures => {
    // Flatten audio chunks
    const totalSamples = recordedSamples.reduce((acc, chunk) => acc + chunk.length, 0);
    const flatBuffer = new Float32Array(totalSamples);
    let offset = 0;
    for (const chunk of recordedSamples) {
      flatBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const windowSize = config.stft.windowSize;
    const stepSize = config.stft.windowSize - config.stft.overlapSize;
    const f0Contours: number[] = [];
    const f1Contours: number[] = [];
    const f2Contours: number[] = [];
    const f3Contours: number[] = [];

    // STFT iteration
    for (let i = 0; i < flatBuffer.length - windowSize; i += stepSize) {
      const frame = flatBuffer.slice(i, i + windowSize);
      const windowedFrame = applyHannWindow(frame);

      // Estimate F0 for the frame
      const f0 = estimateF0(windowedFrame, sampleRate);
      f0Contours.push(f0 > 0 ? f0 : 120); // Fallback defaults for visualization

      // Mocked LPC formant estimations representing typical vocal space configuration
      f1Contours.push(f0 > 0 ? f0 * 4.5 + Math.random() * 20 : 500);
      f2Contours.push(f0 > 0 ? f0 * 12.5 + Math.random() * 50 : 1500);
      f3Contours.push(f0 > 0 ? f0 * 20.0 + Math.random() * 100 : 2500);
    }

    // Perturbation math stubs (Jitter, Shimmer, HNR)
    const jitter = 0.5 + Math.random() * 1.5; // in %
    const shimmer = 0.2 + Math.random() * 0.8; // in dB
    const hnr = 18.5 - Math.random() * 5.0; // Harmonics-to-Noise in dB

    return {
      patientHash,
      f0ContoursHz: f0Contours,
      formants: {
        f1Hz: f1Contours,
        f2Hz: f2Contours,
        f3Hz: f3Contours,
      },
      perturbation: {
        jitterPercent: Number(jitter.toFixed(3)),
        shimmerDb: Number(shimmer.toFixed(3)),
        hnrDb: Number(hnr.toFixed(3)),
      },
      vowelSpaceAreaSqHz: 120000 + Math.floor(Math.random() * 40000),
    };
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      setRecordingDuration(0);
      setAudioUrl(null);
      setAcousticFeatures(null);

      // 1. Initialize Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx({ sampleRate: 44100 });
      audioContextRef.current = audioCtx;
      sampleRateRef.current = audioCtx.sampleRate;

      // 2. Request user media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // 3. Connect nodes
      const source = audioCtx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = config.stft.windowSize * 2;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserNodeRef.current = analyser;

      // Create ScriptProcessorNode for collecting raw 16-bit PCM floats
      const processor = audioCtx.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Store cloned buffer
        audioChunksRef.current.push(new Float32Array(inputData));
      };
      source.connect(processor);
      processor.connect(audioCtx.destination);

      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to initialize microphone stream:', error);
      throw error;
    }
  };

  const stopRecording = async (): Promise<Blob | null> => {
    if (!isRecording) return null;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    // Stop streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }

    // Process collected data into a WAV file
    const totalSamples = audioChunksRef.current.reduce((acc, c) => acc + c.length, 0);
    const wavBlob = encodeWAV(audioChunksRef.current, totalSamples, sampleRateRef.current);
    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);

    // Extract acoustic features
    const features = extractAcousticFeatures(audioChunksRef.current, sampleRateRef.current);
    setAcousticFeatures(features);

    return wavBlob;
  };

  const resetPipeline = () => {
    setIsRecording(false);
    setRecordingDuration(0);
    setAudioUrl(null);
    setAcousticFeatures(null);
    audioChunksRef.current = [];
  };

  // Helper function to encode uncompressed WAV (44.1 kHz, 16-bit, mono)
  const encodeWAV = (chunks: Float32Array[], totalSamples: number, sampleRate: number): Blob => {
    const buffer = new ArrayBuffer(44 + totalSamples * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
    view.setUint32(4, 36 + totalSamples * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw PCM) */
    view.setUint16(20, 1, true);
    /* channel count (mono) */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 2, true);
    /* bits per sample (16-bit) */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, totalSamples * 2, true);

    // Write audio samples
    let offset = 44;
    for (const chunk of chunks) {
      for (let i = 0; i < chunk.length; i++) {
        // Clamp float to 16-bit signed integer range
        let s = Math.max(-1, Math.min(1, chunk[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isRecording,
    recordingDuration,
    audioUrl,
    analyserNode: analyserNodeRef.current,
    audioContext: audioContextRef.current,
    acousticFeatures,
    startRecording,
    stopRecording,
    resetPipeline,
  };
}
