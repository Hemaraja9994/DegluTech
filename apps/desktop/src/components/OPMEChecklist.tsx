import React, { useState } from 'react';
import type { OPMEAssessment, FunctionalGrade, OPMEGrid, CranialNerveChecks } from '@laryngoos/core';

// Safe inline types in case relative imports are pending compilation
interface OPMEChecklistProps {
  patientHash: string;
  onSave?: (assessment: OPMEAssessment) => void;
}

const INITIAL_MATRIX: OPMEGrid = {
  labial: { retraction: 'normal', protrusion: 'normal', pucker: 'normal', resistance: 'normal' },
  lingual: { protrusion: 'normal', lateralization: 'normal', elevation: 'normal', retraction: 'normal', resistance: 'normal' },
  mandibular: { depression: 'normal', elevation: 'normal', lateralization: 'normal' },
  velopharyngeal: { elevation: 'normal', symmetry: 'normal' },
};

const INITIAL_CN: CranialNerveChecks = {
  cnV_trigeminal: { sensoryFace: 'intact', motorJawDeviation: 'none', jawStrength: 'normal' },
  cnVII_facial: { asymmetryAtRest: false, smileSymmetry: 'symmetric', lipClosureStrength: 'normal' },
  cnIX_X_glossopharyngeal_vagus: { palatalElevation: 'symmetric', gagReflex: 'present', vocalQuality: 'normal' },
  cnXI_accessory: { shoulderShrugStrength: 'normal', headTurnStrength: 'normal' },
  cnXII_hypoglossal: { tongueAtrophy: false, fasciculations: false, deviationOnProtrusion: 'none' },
};

export const OPMEChecklist: React.FC<OPMEChecklistProps> = ({ patientHash, onSave }) => {
  const [matrix, setMatrix] = useState<OPMEGrid>(INITIAL_MATRIX);
  const [cnChecks, setCnChecks] = useState<CranialNerveChecks>(INITIAL_CN);
  const [rtogScore, setRtogScore] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [mucositisDesc, setMucositisDesc] = useState('');
  const [trismusDistance, setTrismusDistance] = useState<number>(45); // default healthy opening mm
  const [tongueStrength, setTongueStrength] = useState<0 | 1 | 2 | 3>(3);
  const [lipStrength, setLipStrength] = useState<0 | 1 | 2 | 3>(3);

  const handleGradeChange = (
    system: keyof OPMEGrid,
    action: string,
    grade: FunctionalGrade
  ) => {
    setMatrix((prev) => ({
      ...prev,
      [system]: {
        ...prev[system],
        [action]: grade,
      },
    }));
  };

  const submitAssessment = () => {
    const assessment: OPMEAssessment = {
      patientHash,
      matrix,
      cranialNerves: cnChecks,
      tissueQualities: {
        mucosalStatusPostRT: {
          rtogEortcScore: rtogScore,
          clinicalDescription: mucositisDesc,
        },
        rangeOfMotion: {
          restrictedLabial: matrix.labial.retraction === 'paralysis' || matrix.labial.protrusion === 'paralysis',
          restrictedLingual: matrix.lingual.protrusion === 'paralysis' || matrix.lingual.lateralization === 'paralysis',
          restrictedMandibular: matrix.mandibular.depression === 'paralysis',
        },
        symmetry: {
          facialAtRest: cnChecks.cnVII_facial.asymmetryAtRest ? 'asymmetric' : 'symmetric',
          tongueProtruded: cnChecks.cnXII_hypoglossal.deviationOnProtrusion !== 'none' ? 'asymmetric' : 'symmetric',
        },
        manualStrengthTesting: {
          tongueResistanceScore: tongueStrength,
          lipResistanceScore: lipStrength,
        },
      },
      specializedMetrics: {
        maxJawOpeningInterincisalDistanceMm: trismusDistance,
      },
      recordedAt: new Date().toISOString(),
    };

    console.log('Saved OPME Assessment:', assessment);
    if (onSave) onSave(assessment);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Oral Peripheral Mechanism Examination (OPME)</h2>
        <span style={styles.patientBadge}>Isolated ID: {patientHash.substring(0, 12)}...</span>
      </div>

      {/* Grid 1: Structural & Functional Matrix */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>1. Functional & Range of Motion Matrix</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Mechanism</th>
              <th style={styles.th}>Function / Action</th>
              <th style={styles.th}>Grading</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(matrix).map((mech) => {
              const mechanism = mech as keyof OPMEGrid;
              return Object.keys(matrix[mechanism]).map((action, idx) => {
                const currentGrade = (matrix[mechanism] as any)[action] as FunctionalGrade;
                return (
                  <tr key={`${mechanism}-${action}`} style={idx === 0 ? styles.borderTop : {}}>
                    <td style={styles.tdLabel}>{idx === 0 ? mechanism.toUpperCase() : ''}</td>
                    <td style={styles.td}>{action}</td>
                    <td style={styles.td}>
                      <select
                        value={currentGrade}
                        onChange={(e) =>
                          handleGradeChange(mechanism, action, e.target.value as FunctionalGrade)
                        }
                        style={styles.select}
                      >
                        <option value="normal">Normal</option>
                        <option value="paresis">Paresis (Weakness)</option>
                        <option value="paralysis">Paralysis</option>
                        <option value="scarred_tethered">Scarred / Tethered</option>
                      </select>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      {/* Grid 2: Cranial Nerves */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>2. Cranial Nerve Integrity Checks</h3>
        <div style={styles.grid}>
          {/* CN V */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>CN V (Trigeminal)</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Sensory Face:</label>
              <select
                value={cnChecks.cnV_trigeminal.sensoryFace}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnV_trigeminal: { ...prev.cnV_trigeminal, sensoryFace: e.target.value as any },
                  }))
                }
                style={styles.select}
              >
                <option value="intact">Intact</option>
                <option value="impaired">Impaired</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Jaw Deviation:</label>
              <select
                value={cnChecks.cnV_trigeminal.motorJawDeviation}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnV_trigeminal: { ...prev.cnV_trigeminal, motorJawDeviation: e.target.value as any },
                  }))
                }
                style={styles.select}
              >
                <option value="none">None</option>
                <option value="deviated_left">Deviated Left</option>
                <option value="deviated_right">Deviated Right</option>
              </select>
            </div>
          </div>

          {/* CN VII */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>CN VII (Facial)</h4>
            <div style={styles.formGroup}>
              <label style={styles.labelCheckbox}>
                <input
                  type="checkbox"
                  checked={cnChecks.cnVII_facial.asymmetryAtRest}
                  onChange={(e) =>
                    setCnChecks((prev) => ({
                      ...prev,
                      cnVII_facial: { ...prev.cnVII_facial, asymmetryAtRest: e.target.checked },
                    }))
                  }
                  style={styles.checkbox}
                />
                Asymmetry at Rest
              </label>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Smile Symmetry:</label>
              <select
                value={cnChecks.cnVII_facial.smileSymmetry}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnVII_facial: { ...prev.cnVII_facial, smileSymmetry: e.target.value as any },
                  }))
                }
                style={styles.select}
              >
                <option value="symmetric">Symmetric</option>
                <option value="asymmetric_left">Asymmetric Left</option>
                <option value="asymmetric_right">Asymmetric Right</option>
              </select>
            </div>
          </div>

          {/* CN IX & X */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>CN IX & X (Glossopharyngeal/Vagus)</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>Palatal Elevation:</label>
              <select
                value={cnChecks.cnIX_X_glossopharyngeal_vagus.palatalElevation}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnIX_X_glossopharyngeal_vagus: {
                      ...prev.cnIX_X_glossopharyngeal_vagus,
                      palatalElevation: e.target.value as any,
                    },
                  }))
                }
                style={styles.select}
              >
                <option value="symmetric">Symmetric</option>
                <option value="asymmetric_left">Asymmetric Left</option>
                <option value="asymmetric_right">Asymmetric Right</option>
                <option value="absent">Absent</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Gag Reflex:</label>
              <select
                value={cnChecks.cnIX_X_glossopharyngeal_vagus.gagReflex}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnIX_X_glossopharyngeal_vagus: {
                      ...prev.cnIX_X_glossopharyngeal_vagus,
                      gagReflex: e.target.value as any,
                    },
                  }))
                }
                style={styles.select}
              >
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="hyperactive">Hyperactive</option>
              </select>
            </div>
          </div>

          {/* CN XII */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>CN XII (Hypoglossal)</h4>
            <div style={styles.formGroup}>
              <label style={styles.labelCheckbox}>
                <input
                  type="checkbox"
                  checked={cnChecks.cnXII_hypoglossal.tongueAtrophy}
                  onChange={(e) =>
                    setCnChecks((prev) => ({
                      ...prev,
                      cnXII_hypoglossal: { ...prev.cnXII_hypoglossal, tongueAtrophy: e.target.checked },
                    }))
                  }
                  style={styles.checkbox}
                />
                Tongue Atrophy
              </label>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Deviation on Protrusion:</label>
              <select
                value={cnChecks.cnXII_hypoglossal.deviationOnProtrusion}
                onChange={(e) =>
                  setCnChecks((prev) => ({
                    ...prev,
                    cnXII_hypoglossal: { ...prev.cnXII_hypoglossal, deviationOnProtrusion: e.target.value as any },
                  }))
                }
                style={styles.select}
              >
                <option value="none">None</option>
                <option value="left">Deviated Left</option>
                <option value="right">Deviated Right</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Specialized Metrics & Tissues */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>3. Radiotherapy Effects & Tissue Quality Metrics</h3>
        <div style={styles.flexContainer}>
          <div style={{ ...styles.card, flex: 1 }}>
            <h4 style={styles.cardTitle}>Mucositis Score (RTOG/EORTC)</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>RTOG Score:</label>
              <select
                value={rtogScore}
                onChange={(e) => setRtogScore(Number(e.target.value) as any)}
                style={styles.select}
              >
                <option value={0}>0 - No mucosal changes</option>
                <option value={1}>1 - Injection/mild erythema (mild pain)</option>
                <option value={2}>2 - Patchy mucositis (moderate pain)</option>
                <option value={3}>3 - Confluent fibrinous mucositis (severe pain)</option>
                <option value={4}>4 - Ulceration, hemorrhage, or necrosis</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Clinical Mucosa Description:</label>
              <textarea
                value={mucositisDesc}
                onChange={(e) => setMucositisDesc(e.target.value)}
                placeholder="Describe mucosal integrity, dryness, or ulceration location..."
                style={styles.textarea}
              />
            </div>
          </div>

          <div style={{ ...styles.card, flex: 1 }}>
            <h4 style={styles.cardTitle}>Trismus Monitoring</h4>
            <div style={styles.formGroup}>
              <label style={styles.label}>
                Max Jaw Opening (Interincisal Distance):
                <strong style={styles.valueText}> {trismusDistance} mm</strong>
              </label>
              <input
                type="range"
                min={5}
                max={70}
                value={trismusDistance}
                onChange={(e) => setTrismusDistance(Number(e.target.value))}
                style={styles.slider}
              />
              <span style={styles.helpText}>
                {trismusDistance < 35
                  ? '⚠️ Clinical Trismus Detected (< 35mm)'
                  : 'Normal Opening range (35-50mm)'}
              </span>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tongue Resistance (0-3):</label>
              <input
                type="number"
                min={0}
                max={3}
                value={tongueStrength}
                onChange={(e) => setTongueStrength(Number(e.target.value) as any)}
                style={styles.inputNumber}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Lip Resistance (0-3):</label>
              <input
                type="number"
                min={0}
                max={3}
                value={lipStrength}
                onChange={(e) => setLipStrength(Number(e.target.value) as any)}
                style={styles.inputNumber}
              />
            </div>
          </div>
        </div>
      </div>

      <button onClick={submitAssessment} style={styles.submitBtn}>
        Submit and Encrypt Assessment
      </button>
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
    maxWidth: '900px',
    margin: '0 auto',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '24px',
    color: '#0d9488',
    margin: 0,
  },
  patientBadge: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#38bdf8',
    marginBottom: '12px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '4px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '16px',
  },
  th: {
    textAlign: 'left',
    color: '#94a3b8',
    padding: '10px',
    borderBottom: '1px solid #334155',
    fontSize: '14px',
  },
  tdLabel: {
    fontWeight: 'bold',
    color: '#0d9488',
    padding: '10px',
    fontSize: '13px',
  },
  td: {
    padding: '10px',
    borderBottom: '1px solid #1e293b',
    fontSize: '14px',
  },
  borderTop: {
    borderTop: '1px solid #334155',
  },
  select: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '14px',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  },
  textarea: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '14px',
    width: '100%',
    height: '80px',
    outline: 'none',
    resize: 'vertical',
  },
  slider: {
    width: '100%',
    margin: '12px 0',
    accentColor: '#0d9488',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  cardTitle: {
    fontSize: '15px',
    color: '#38bdf8',
    margin: '0 0 12px 0',
  },
  formGroup: {
    marginBottom: '12px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '4px',
  },
  labelCheckbox: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#f8fafc',
    cursor: 'pointer',
  },
  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
    accentColor: '#0d9488',
  },
  flexContainer: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  valueText: {
    color: '#f43f5e',
    fontSize: '15px',
  },
  helpText: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'block',
    marginTop: '4px',
  },
  inputNumber: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '14px',
    width: '60px',
  },
  submitBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '14px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginTop: '20px',
    transition: 'background-color 0.2s',
  },
};
