import React, { useState, useRef } from 'react';

interface IngestionZoneProps {
  patientHash: string;
  onFileProcessed?: (metadata: ProcessedFile) => void;
}

export interface ProcessedFile {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  sha256Hash: string;
  status: 'hashing' | 'encrypting' | 'stored';
  timestamp: string;
}

export const ReportIngestionZone: React.FC<IngestionZoneProps> = ({ patientHash, onFileProcessed }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [filesList, setFilesList] = useState<ProcessedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const simulateProcessing = async (file: File) => {
    const fileId = Math.random().toString(36).substring(7);
    const newFile: ProcessedFile = {
      id: fileId,
      fileName: file.name,
      fileSize: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
      mimeType: file.type,
      sha256Hash: 'Calculating...',
      status: 'hashing',
      timestamp: new Date().toLocaleTimeString(),
    };

    setFilesList((prev) => [newFile, ...prev]);

    // 1. Simulate Hashing (SHA-256 local calculation delay)
    await new Promise((resolve) => setTimeout(resolve, 800));
    const simulatedHash = Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    setFilesList((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, sha256Hash: simulatedHash, status: 'encrypting' } : f))
    );

    // 2. Simulate Local Encryption using Patient-derived key
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setFilesList((prev) => {
      const updated = prev.map((f) => (f.id === fileId ? { ...f, status: 'stored' as const } : f));
      const target = updated.find((f) => f.id === fileId);
      if (target && onFileProcessed) {
        onFileProcessed(target);
      }
      return updated;
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach((file) => simulateProcessing(file));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      selectedFiles.forEach((file) => simulateProcessing(file));
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Multimedia Report Ingestion Pipeline</h3>
      <p style={styles.subtitle}>
        Upload histopathology reports, discharge summaries, or FEES/VFSS diagnostic records. All files
        are hashed, encrypted using AES-256, and isolated locally.
      </p>

      {/* Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          ...styles.dropZone,
          borderColor: isDragActive ? '#2f7a5c' : '#3e5852',
          backgroundColor: isDragActive ? '#022c22' : '#020617',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInput}
          style={{ display: 'none' }}
          accept=".pdf,.png,.jpg,.jpeg,.dcm"
        />
        <div style={styles.iconContainer}>📁</div>
        <div style={styles.dropText}>
          Drag and drop files here, or <strong style={{ color: '#2f7a5c' }}>browse</strong>
        </div>
        <div style={styles.supportText}>Supports PDF, PNG, JPG, and DICOM up to 50MB</div>
      </div>

      {/* Processing Log list */}
      {filesList.length > 0 && (
        <div style={styles.logContainer}>
          <h4 style={styles.logTitle}>Pipeline processing queue</h4>
          <div style={styles.logList}>
            {filesList.map((file) => (
              <div key={file.id} style={styles.logCard}>
                <div style={styles.cardHeader}>
                  <span style={styles.fileName}>{file.fileName}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor:
                        file.status === 'stored'
                          ? '#064e3b'
                          : file.status === 'encrypting'
                          ? '#78350f'
                          : '#1e3a8a',
                      color:
                        file.status === 'stored'
                          ? '#34d399'
                          : file.status === 'encrypting'
                          ? '#c9822b'
                          : '#60a5fa',
                    }}
                  >
                    {file.status.toUpperCase()}
                  </span>
                </div>
                <div style={styles.cardDetails}>
                  <div>Size: {file.fileSize}</div>
                  <div>SHA-256: <code style={styles.code}>{file.sha256Hash.substring(0, 24)}...</code></div>
                  <div style={styles.isolationText}>🔒 isolated to hash: {patientHash.substring(0, 16)}...</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#15302a',
    color: '#dce5df',
    padding: '20px',
    borderRadius: '10px',
    border: '1px solid #15302a',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  title: {
    fontSize: '20px',
    margin: '0 0 4px 0',
    color: '#2f7a5c',
  },
  subtitle: {
    fontSize: '15px',
    color: '#8fa79d',
    margin: '0 0 16px 0',
    lineHeight: '1.4',
  },
  dropZone: {
    borderWidth: '2px',
    borderStyle: 'dashed',
    borderRadius: '8px',
    padding: '30px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
  },
  iconContainer: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  dropText: {
    fontSize: '17px',
    color: '#dce5df',
    marginBottom: '6px',
  },
  supportText: {
    fontSize: '14px',
    color: '#4d6660',
  },
  logContainer: {
    marginTop: '20px',
    borderTop: '1px solid #15302a',
    paddingTop: '16px',
  },
  logTitle: {
    fontSize: '16px',
    color: '#8fd3b0',
    margin: '0 0 12px 0',
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  logCard: {
    backgroundColor: '#15302a',
    borderRadius: '6px',
    padding: '12px',
    border: '1px solid #3e5852',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  fileName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f5f8f5',
  },
  statusBadge: {
    fontSize: '13px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
  },
  cardDetails: {
    fontSize: '14px',
    color: '#8fa79d',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  code: {
    fontFamily: 'monospace',
    color: '#fb7185',
  },
  isolationText: {
    fontSize: '13px',
    color: '#2f7a5c',
    marginTop: '4px',
  },
};
