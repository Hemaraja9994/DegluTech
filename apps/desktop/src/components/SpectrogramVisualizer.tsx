import React, { useRef, useEffect, useState } from 'react';
import { useAudioPipeline } from '../../../../packages/core/src/hooks/useAudioPipeline';
import { SpectrogramConfig } from '../../../../packages/core/src/types/interfaces';

interface SpectrogramVisualizerProps {
  patientHash: string;
}

export const SpectrogramVisualizer: React.FC<SpectrogramVisualizerProps> = ({ patientHash }) => {
  const [selectedVowel, setSelectedVowel] = useState<'a' | 'i' | 'u' | 'rainbow_passage'>('a');
  const [config] = useState<SpectrogramConfig>({
    stft: { windowSize: 1024, overlapSize: 512, windowFunction: 'hann' },
    display: { frequencyMaxHz: 8000, dynamicRangeDb: 80 },
  });

  const {
    isRecording,
    recordingDuration,
    analyserNode,
    acousticFeatures,
    startRecording,
    stopRecording,
    resetPipeline,
  } = useAudioPipeline(patientHash, config);

  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Time-domain waveform canvas rendering
  const drawWaveform = () => {
    if (!analyserNode || !waveformCanvasRef.current) return;
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteTimeDomainData(dataArray);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#38bdf8'; // bright teal/blue
    ctx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // normalize
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationFrameId.current = requestAnimationFrame(drawWaveform);
  };

  // Static/dynamic time-aligned spectrogram overlay showing formant track projections
  const drawSpectrogramFrame = () => {
    if (!analyserNode || !spectrogramCanvasRef.current) return;
    const canvas = spectrogramCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserNode.getByteFrequencyData(dataArray);

    // Roll background left
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      ctx.drawImage(tempCanvas, -2, 0);
    }

    // Draw new slice on the far right
    const sliceWidth = 2;
    const x = canvas.width - sliceWidth;

    for (let i = 0; i < bufferLength; i++) {
      const value = dataArray[i];
      const percent = value / 255;
      const y = canvas.height - (i / bufferLength) * canvas.height;

      // Color mapping: Purple (low intensity) -> Red -> Yellow (high intensity)
      const r = Math.floor(percent * 255);
      const g = Math.floor(Math.sin(percent * Math.PI) * 200);
      const b = Math.floor((1 - percent) * 150);

      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(x, y, sliceWidth, Math.max(1, canvas.height / bufferLength));
    }

    // Dynamic overlay for formant line trackers (mocked curves tracing frequency space)
    if (isRecording) {
      const time = Date.now() * 0.005;
      ctx.fillStyle = '#10b981'; // Formant 1 (Green)
      ctx.fillRect(x, canvas.height * 0.7 + Math.sin(time) * 10, 3, 3);

      ctx.fillStyle = '#fbbf24'; // Formant 2 (Yellow)
      ctx.fillRect(x, canvas.height * 0.4 + Math.cos(time * 1.5) * 15, 3, 3);

      ctx.fillStyle = '#f43f5e'; // Formant 3 (Red)
      ctx.fillRect(x, canvas.height * 0.2 + Math.sin(time * 2.2) * 8, 3, 3);
    }
  };

  const renderSpectrogramPipeline = () => {
    drawWaveform();
    drawSpectrogramFrame();
    if (isRecording) {
      animationFrameId.current = requestAnimationFrame(renderSpectrogramPipeline);
    }
  };

  useEffect(() => {
    if (isRecording && analyserNode) {
      renderSpectrogramPipeline();
    } else if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
    }
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isRecording, analyserNode]);

  // Handle post-recording static drawing
  useEffect(() => {
    if (!isRecording && acousticFeatures && spectrogramCanvasRef.current) {
      const canvas = spectrogramCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw static mock spectrogram representation with clear overlaid formant lines
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint grid lines
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (canvas.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw formant tracks
      const { f1Hz, f2Hz, f3Hz } = acousticFeatures.formants;
      const step = canvas.width / f1Hz.length;

      // Helper to draw track
      const drawTrack = (freqs: number[], color: string, label: string) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        freqs.forEach((freq, idx) => {
          // Map frequency range 0 - 5000Hz to canvas height
          const y = canvas.height - (freq / 5000) * canvas.height;
          const x = idx * step;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        // Label at start of track
        if (freqs.length > 0) {
          ctx.fillStyle = color;
          ctx.font = '11px JetBrains Mono';
          ctx.fillText(label, 10, canvas.height - (freqs[0] / 5000) * canvas.height - 8);
        }
      };

      drawTrack(f1Hz, '#10b981', 'F1 (Lingual Height)');
      drawTrack(f2Hz, '#fbbf24', 'F2 (Lingual Protrusion)');
      drawTrack(f3Hz, '#f43f5e', 'F3 (Vocal Quality)');
    }
  }, [isRecording, acousticFeatures]);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Acoustic spectrogram & Voice Analysis</h2>
      <div style={styles.patientBar}>
        <span>Isolated Session Token: <strong>{patientHash}</strong></span>
        <span>Standard: TMH / NHS-Sheffield</span>
      </div>

      <div style={styles.layout}>
        {/* Visualizer Screens */}
        <div style={styles.screensPanel}>
          {/* Top Canvas: Waveform */}
          <div style={styles.canvasContainer}>
            <div style={styles.canvasHeader}>Raw Time-Domain Speech Waveform</div>
            <canvas ref={waveformCanvasRef} width={500} height={120} style={styles.canvas} />
          </div>

          {/* Bottom Canvas: Spectrogram */}
          <div style={styles.canvasContainer}>
            <div style={styles.canvasHeader}>
              Narrowband Spectrogram & Formant Overlay (Hann Window STFT)
            </div>
            <canvas ref={spectrogramCanvasRef} width={500} height={200} style={styles.canvas} />
          </div>

          {/* Configuration & Controls */}
          <div style={styles.controlsRow}>
            <div style={styles.selectWrapper}>
              <label style={styles.label}>Vocal Protocol:</label>
              <select
                value={selectedVowel}
                onChange={(e) => setSelectedVowel(e.target.value as any)}
                style={styles.select}
              >
                <option value="a">Sustained Vowel /a/</option>
                <option value="i">Sustained Vowel /i/</option>
                <option value="u">Sustained Vowel /u/</option>
                <option value="rainbow_passage">Reading: Rainbow Passage</option>
              </select>
            </div>

            <div style={styles.btnGroup}>
              {!isRecording ? (
                <button onClick={startRecording} style={styles.recordBtn}>
                  🔴 Start Recording (44.1 kHz)
                </button>
              ) : (
                <button onClick={stopRecording} style={styles.stopBtn}>
                  ⏹️ Stop & Process Audio
                </button>
              )}
              <button onClick={resetPipeline} style={styles.resetBtn}>
                Reset
              </button>
            </div>

            <div style={styles.timerBadge}>
              Time: {recordingDuration}s
            </div>
          </div>
        </div>

        {/* Feature Diagnostics Panel */}
        <div style={styles.metricsPanel}>
          <h3 style={styles.panelTitle}>Acoustic Diagnostics</h3>

          {acousticFeatures ? (
            <div style={styles.featuresList}>
              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Fundamental Frequency (F0)</span>
                <span style={styles.metricValue}>
                  {acousticFeatures.f0ContoursHz.length > 0
                    ? `${Math.round(
                        acousticFeatures.f0ContoursHz.reduce((a, b) => a + b, 0) /
                          acousticFeatures.f0ContoursHz.length
                      )} Hz`
                    : 'Calculating...'}
                </span>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Local Jitter (%)</span>
                <span
                  style={
                    acousticFeatures.perturbation.jitterPercent > 1.0
                      ? styles.metricValueWarn
                      : styles.metricValueSuccess
                  }
                >
                  {acousticFeatures.perturbation.jitterPercent} %
                </span>
                <span style={styles.metricNote}>Normative Limit: &lt; 1.04%</span>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Local Shimmer (dB)</span>
                <span
                  style={
                    acousticFeatures.perturbation.shimmerDb > 0.35
                      ? styles.metricValueWarn
                      : styles.metricValueSuccess
                  }
                >
                  {acousticFeatures.perturbation.shimmerDb} dB
                </span>
                <span style={styles.metricNote}>Normative Limit: &lt; 0.35 dB</span>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Harmonic-to-Noise (HNR)</span>
                <span
                  style={
                    acousticFeatures.perturbation.hnrDb < 15.0
                      ? styles.metricValueWarn
                      : styles.metricValueSuccess
                  }
                >
                  {acousticFeatures.perturbation.hnrDb} dB
                </span>
                <span style={styles.metricNote}>Normative Limit: &gt; 15 dB</span>
              </div>

              <div style={styles.metricCard}>
                <span style={styles.metricLabel}>Vowel Space Constriction (VSA)</span>
                <span style={styles.metricValue}>
                  {acousticFeatures.vowelSpaceAreaSqHz?.toLocaleString()} Hz²
                </span>
                <span style={styles.metricNote}>Tracks post-glossectomy range</span>
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              {isRecording ? (
                <div style={styles.loadingText}>🎤 Stream active... Speak sustained sound.</div>
              ) : (
                'Run recording protocol to display DSP speech markers.'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    padding: '24px',
    borderRadius: '12px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    maxWidth: '1000px',
    margin: '20px auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  title: {
    fontSize: '22px',
    color: '#0d9488',
    margin: '0 0 8px 0',
  },
  patientBar: {
    backgroundColor: '#1e293b',
    padding: '10px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#94a3b8',
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  layout: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  screensPanel: {
    flex: '2 1 500px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  canvasContainer: {
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  canvasHeader: {
    backgroundColor: '#1e293b',
    color: '#94a3b8',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
  },
  controlsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    backgroundColor: '#1e293b',
    padding: '12px',
    borderRadius: '8px',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  selectWrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  select: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    outline: 'none',
  },
  btnGroup: {
    display: 'flex',
    gap: '10px',
  },
  recordBtn: {
    backgroundColor: '#b91c1c',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 16px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  stopBtn: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #f43f5e',
    borderRadius: '6px',
    padding: '10px 16px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  resetBtn: {
    backgroundColor: '#475569',
    color: '#f8fafc',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  timerBadge: {
    backgroundColor: '#0f172a',
    color: '#fbbf24',
    padding: '8px 12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  metricsPanel: {
    flex: '1 1 250px',
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #334155',
    minWidth: '220px',
  },
  panelTitle: {
    fontSize: '16px',
    color: '#38bdf8',
    margin: '0 0 16px 0',
    borderBottom: '1px solid #334155',
    paddingBottom: '8px',
  },
  featuresList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  metricCard: {
    backgroundColor: '#0f172a',
    padding: '12px',
    borderRadius: '6px',
    borderLeft: '4px solid #0d9488',
  },
  metricLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#94a3b8',
  },
  metricValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#f8fafc',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  metricValueSuccess: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#10b981',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  metricValueWarn: {
    display: 'block',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ef4444',
    fontFamily: 'monospace',
    marginTop: '2px',
  },
  metricNote: {
    display: 'block',
    fontSize: '10px',
    color: '#64748b',
    marginTop: '2px',
  },
  emptyState: {
    color: '#64748b',
    fontSize: '13px',
    textAlign: 'center',
    padding: '40px 0',
  },
  loadingText: {
    color: '#fbbf24',
    animation: 'pulse 1.5s infinite',
  },
};
