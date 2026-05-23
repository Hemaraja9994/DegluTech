import React, { useState } from 'react';
import type { OPMEGrid, FunctionalGrade } from '@laryngoos/core';

interface OpmeMatrixProps {
  patientHash: string;
  onMatrixChange?: (matrix: OPMEGrid) => void;
}

const INITIAL_MATRIX: OPMEGrid = {
  labial: { retraction: 'normal', protrusion: 'normal', pucker: 'normal', resistance: 'normal' },
  lingual: { protrusion: 'normal', lateralization: 'normal', elevation: 'normal', retraction: 'normal', resistance: 'normal' },
  mandibular: { depression: 'normal', elevation: 'normal', lateralization: 'normal' },
  velopharyngeal: { elevation: 'normal', symmetry: 'normal' },
};

export const OpmeMatrix: React.FC<OpmeMatrixProps> = ({ onMatrixChange }) => {
  const [matrix, setMatrix] = useState<OPMEGrid>(INITIAL_MATRIX);

  const handleSelectChange = (
    system: keyof OPMEGrid,
    action: string,
    grade: FunctionalGrade
  ) => {
    const updated = {
      ...matrix,
      [system]: {
        ...matrix[system],
        [action]: grade,
      },
    };
    setMatrix(updated);
    if (onMatrixChange) {
      onMatrixChange(updated);
    }
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Oral Peripheral Mechanism Examination (OPME) Matrix</h3>
      <p style={styles.subtitle}>
        Grade structural range of motion, symmetry, and muscle strength checks. Identifies cranial nerve
        deficits secondary to tissue resection or radiation fibrosis.
      </p>

      <div style={styles.gridContainer}>
        {/* Labial Mechanism */}
        <div style={styles.card}>
          <h4 style={styles.cardHeader}>Labial Mechanism (Lips)</h4>
          <div style={styles.row}>
            <span style={styles.label}>Retraction (Smile):</span>
            <select
              value={matrix.labial.retraction}
              onChange={(e) => handleSelectChange('labial', 'retraction', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Normal symmetry & ROM</option>
              <option value="paresis">Unilateral/Bilateral Paresis</option>
              <option value="paralysis">Flaccid Paralysis</option>
              <option value="scarred_tethered">Tethered (Post-Surgical Scar)</option>
            </select>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Protrusion (Blow):</span>
            <select
              value={matrix.labial.protrusion}
              onChange={(e) => handleSelectChange('labial', 'protrusion', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Normal</option>
              <option value="paresis">Weak/Reduced closure</option>
              <option value="paralysis">Paralysis</option>
              <option value="scarred_tethered">Scarred / Tethered</option>
            </select>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Lip Seal Resistance:</span>
            <select
              value={matrix.labial.resistance}
              onChange={(e) => handleSelectChange('labial', 'resistance', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Intact against resistance</option>
              <option value="paresis">Reduced pressure seal</option>
              <option value="paralysis">No seal closure force</option>
            </select>
          </div>
        </div>

        {/* Lingual Mechanism */}
        <div style={styles.card}>
          <h4 style={styles.cardHeader}>Lingual Mechanism (Tongue)</h4>
          <div style={styles.row}>
            <span style={styles.label}>Midline Protrusion:</span>
            <select
              value={matrix.lingual.protrusion}
              onChange={(e) => handleSelectChange('lingual', 'protrusion', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Midline extension intact</option>
              <option value="paresis">Deviates on extension</option>
              <option value="paralysis">Severe atrophy / Immobile</option>
              <option value="scarred_tethered">Tethered flap reconstruction</option>
            </select>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Lateralization:</span>
            <select
              value={matrix.lingual.lateralization}
              onChange={(e) => handleSelectChange('lingual', 'lateralization', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Normal lateral range</option>
              <option value="paresis">Weak unilateral sweep</option>
              <option value="paralysis">Unable to sweep sulcus</option>
            </select>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Palatal Elevation:</span>
            <select
              value={matrix.lingual.elevation}
              onChange={(e) => handleSelectChange('lingual', 'elevation', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Intact alveolar contact</option>
              <option value="paresis">Reduced palate contact force</option>
              <option value="paralysis">Absent elevation</option>
            </select>
          </div>
        </div>

        {/* Velopharyngeal Mechanism */}
        <div style={styles.card}>
          <h4 style={styles.cardHeader}>Velopharyngeal (Soft Palate)</h4>
          <div style={styles.row}>
            <span style={styles.label}>Uvular Elevation (/ah/):</span>
            <select
              value={matrix.velopharyngeal.elevation}
              onChange={(e) => handleSelectChange('velopharyngeal', 'elevation', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Symmetric elevation</option>
              <option value="paresis">Unilateral deviation (weak side)</option>
              <option value="paralysis">Immobile palatal drape</option>
            </select>
          </div>
          <div style={styles.row}>
            <span style={styles.label}>Symmetry:</span>
            <select
              value={matrix.velopharyngeal.symmetry}
              onChange={(e) => handleSelectChange('velopharyngeal', 'symmetry', e.target.value as FunctionalGrade)}
              style={styles.select}
            >
              <option value="normal">Symmetric arches</option>
              <option value="paresis">Asymmetric arches at rest</option>
              <option value="paralysis">Flaccid palatal drop</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '20px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
  },
  title: {
    fontSize: '16px',
    color: '#38bdf8',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '0 0 16px 0',
    lineHeight: '1.4',
  },
  gridContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    padding: '16px',
    border: '1px solid #1e293b',
  },
  cardHeader: {
    fontSize: '14px',
    color: '#0d9488',
    margin: '0 0 12px 0',
    fontWeight: 'bold',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  label: {
    fontSize: '13px',
    color: '#cbd5e1',
  },
  select: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    width: '220px',
    outline: 'none',
  },
};
