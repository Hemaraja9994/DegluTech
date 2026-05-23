import React, { useState } from 'react';
import type { AdvancedOncologicalHistory, TumorSite, MCategory, ChemoAgent } from '@laryngoos/core';
import { OpmeMatrix } from './OpmeMatrix';
import { ReportIngestionZone } from './ReportIngestionZone';

interface OncologyIntakeProps {
  patientHash: string;
  onComplete: (data: AdvancedOncologicalHistory) => void;
}

export const OncologyIntake: React.FC<OncologyIntakeProps> = ({ patientHash, onComplete }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Staging & History state
  const [site, setSite] = useState<TumorSite>('lip_oral_cavity');
  const [tStaging, setTStaging] = useState<string>('T1');
  const [nStaging, setNStaging] = useState<string>('N0');
  const [mStaging, setMStaging] = useState<MCategory>('M0');
  const [hasHadSurgery, setHasHadSurgery] = useState(false);
  const [margins, setMargins] = useState<'clear' | 'close' | 'positive'>('clear');
  const [closestMarginMm, setClosestMarginMm] = useState<number>(10);
  const [hasHadRT, setHasHadRT] = useState(false);
  const [rtDose, setRtDose] = useState<number>(60);
  const [rtFractions, setRtFractions] = useState<number>(30);
  const [hasHadCT, setHasHadCT] = useState(false);
  const [chemoAgents, setChemoAgents] = useState<ChemoAgent[]>([]);

  const handleChemoToggle = (agent: ChemoAgent) => {
    setChemoAgents((prev) =>
      prev.includes(agent) ? prev.filter((a) => a !== agent) : [...prev, agent]
    );
  };

  const getDerivedStage = (): string => {
    if (mStaging === 'M1') return 'Stage IVC';
    if (tStaging.includes('4') || nStaging.includes('3')) return 'Stage IVA/IVB';
    if (tStaging.includes('3') || nStaging.includes('2')) return 'Stage III';
    if (tStaging.includes('2') || nStaging.includes('1')) return 'Stage II';
    return 'Stage I';
  };

  const saveIntakeData = () => {
    const intakePayload: AdvancedOncologicalHistory = {
      patientHash,
      diagnosisDate: new Date().toISOString().split('T')[0],
      staging: {
        site,
        t: tStaging,
        n: nStaging,
        m: mStaging,
        derivedStage: getDerivedStage(),
      },
      surgery: {
        hasHadSurgery,
        margins,
        closestMarginMm,
        neckDissection: {
          type: 'none',
          side: 'none',
          levelsRemoved: [],
        },
        reconstruction: {
          isReconstructed: false,
          flapType: 'none',
          microvascularStatus: 'not_applicable',
        },
      },
      radiotherapy: {
        hasHadRT,
        totalDoseGy: rtDose,
        fractionsCount: rtFractions,
        deliveryMethod: 'VMAT',
        targetFields: [],
        toxicities: {
          trismusOnset: false,
          radiationInducedFibrosisGrade: 0,
          xerostomiaSeverity: 'none',
        },
      },
      chemotherapy: {
        hasHadCT,
        agents: chemoAgents,
        cycleCount: 3,
        timing: 'concurrent',
        activeToxicities: {
          ototoxicity: false,
          peripheralNeuropathy: false,
          nephrotoxicity: false,
          hematologicSuppression: false,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    onComplete(intakePayload);
  };

  return (
    <div style={styles.container}>
      {/* Stepper Header */}
      <div style={styles.stepper}>
        <div style={currentStep === 1 ? styles.stepActive : styles.stepInactive}>
          Step 1: Staging & History
        </div>
        <div style={currentStep === 2 ? styles.stepActive : styles.stepInactive}>
          Step 2: OPME Matrix Checks
        </div>
        <div style={currentStep === 3 ? styles.stepActive : styles.stepInactive}>
          Step 3: Diagnostics Uploads
        </div>
      </div>

      <main style={styles.main}>
        {/* Step 1 View */}
        {currentStep === 1 && (
          <div style={styles.formContainer}>
            <h3 style={styles.sectionTitle}>Oncological History & Tumor Staging</h3>

            <div style={styles.grid}>
              <div style={styles.group}>
                <label style={styles.label}>Primary Tumor Site:</label>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value as TumorSite)}
                  style={styles.select}
                >
                  <option value="lip_oral_cavity">Lip and Oral Cavity</option>
                  <option value="oropharynx_p16_neg">Oropharynx (p16 Negative)</option>
                  <option value="oropharynx_p16_pos">Oropharynx (p16 Positive - HPV)</option>
                  <option value="hypopharynx">Hypopharynx</option>
                  <option value="larynx">Larynx</option>
                  <option value="nasopharynx">Nasopharynx</option>
                </select>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>T-Category Staging:</label>
                <select
                  value={tStaging}
                  onChange={(e) => setTStaging(e.target.value)}
                  style={styles.select}
                >
                  <option value="Tis">Tis (Carcinoma in Situ)</option>
                  <option value="T1">T1 (Tumor ≤ 2cm)</option>
                  <option value="T2">T2 (Tumor 2-4cm)</option>
                  <option value="T3">T3 (Tumor &gt; 4cm)</option>
                  <option value="T4a">T4a (Moderately advanced local invasion)</option>
                  <option value="T4b">T4b (Very advanced local invasion)</option>
                </select>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>N-Category (Lymph Nodes):</label>
                <select
                  value={nStaging}
                  onChange={(e) => setNStaging(e.target.value)}
                  style={styles.select}
                >
                  <option value="N0">N0 (No regional metastasis)</option>
                  <option value="N1">N1 (Single node ≤ 3cm)</option>
                  <option value="N2a">N2a (Single node 3-6cm)</option>
                  <option value="N2b">N2b (Multiple ipsilateral nodes ≤ 6cm)</option>
                  <option value="N2c">N2c (Bilateral or contralateral nodes ≤ 6cm)</option>
                  <option value="N3a">N3a (Metastasis &gt; 6cm without ENE)</option>
                  <option value="N3b">N3b (Metastasis with Clinically Overt ENE)</option>
                </select>
              </div>

              <div style={styles.group}>
                <label style={styles.label}>M-Category (Distant Met):</label>
                <select
                  value={mStaging}
                  onChange={(e) => setMStaging(e.target.value as MCategory)}
                  style={styles.select}
                >
                  <option value="M0">M0 (No distant metastasis)</option>
                  <option value="M1">M1 (Distant metastasis present)</option>
                </select>
              </div>
            </div>

            <div style={styles.derivedStageBox}>
              Derived Clinical Staging: <strong>{getDerivedStage()}</strong>
            </div>

            {/* Treatment Checklist */}
            <div style={styles.grid}>
              <div style={styles.card}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hasHadSurgery}
                    onChange={(e) => setHasHadSurgery(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Has Undergone Surgical Resection
                </label>

                {hasHadSurgery && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={styles.subLabel}>Surgical Margins:</label>
                    <select
                      value={margins}
                      onChange={(e) => setMargins(e.target.value as any)}
                      style={styles.select}
                    >
                      <option value="clear">Clear (&gt; 5mm clearance)</option>
                      <option value="close">Close (1 - 5mm clearance)</option>
                      <option value="positive">Positive (Microscopic tumor at margin)</option>
                    </select>

                    <label style={styles.subLabel}>Closest Margin Distance (mm):</label>
                    <input
                      type="number"
                      value={closestMarginMm}
                      onChange={(e) => setClosestMarginMm(Number(e.target.value))}
                      style={styles.inputNumber}
                    />
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hasHadRT}
                    onChange={(e) => setHasHadRT(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Adjuvant Radiotherapy (RT)
                </label>

                {hasHadRT && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={styles.subLabel}>Total Cumulative Dose (Gy):</label>
                    <input
                      type="number"
                      value={rtDose}
                      onChange={(e) => setRtDose(Number(e.target.value))}
                      style={styles.inputNumber}
                    />
                    <label style={styles.subLabel}>Total Fractions:</label>
                    <input
                      type="number"
                      value={rtFractions}
                      onChange={(e) => setRtFractions(Number(e.target.value))}
                      style={styles.inputNumber}
                    />
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={hasHadCT}
                    onChange={(e) => setHasHadCT(e.target.checked)}
                    style={styles.checkbox}
                  />
                  Adjuvant Chemotherapy (CT)
                </label>

                {hasHadCT && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={styles.subLabel}>Active Chemotherapy Agents:</label>
                    {['Cisplatin', 'Carboplatin', 'Cetuximab', '5-FU'].map((agent) => (
                      <label key={agent} style={styles.agentCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={chemoAgents.includes(agent as ChemoAgent)}
                          onChange={() => handleChemoToggle(agent as ChemoAgent)}
                          style={styles.checkbox}
                        />
                        {agent}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setCurrentStep(2)} style={styles.navBtn}>
              Proceed to OPME Matrix ➡️
            </button>
          </div>
        )}

        {/* Step 2 View */}
        {currentStep === 2 && (
          <div>
            <OpmeMatrix patientHash={patientHash} />
            <div style={styles.btnRow}>
              <button onClick={() => setCurrentStep(1)} style={styles.backBtn}>
                ⬅️ Back
              </button>
              <button onClick={() => setCurrentStep(3)} style={styles.navBtn}>
                Proceed to Upload Diagnostics ➡️
              </button>
            </div>
          </div>
        )}

        {/* Step 3 View */}
        {currentStep === 3 && (
          <div>
            <ReportIngestionZone patientHash={patientHash} />
            <div style={styles.btnRow}>
              <button onClick={() => setCurrentStep(2)} style={styles.backBtn}>
                ⬅️ Back
              </button>
              <button onClick={saveIntakeData} style={styles.saveBtn}>
                Save Staging Profile & Finish 💾
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#0f172a',
    color: '#e2e8f0',
    borderRadius: '10px',
    border: '1px solid #1e293b',
    padding: '24px',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    maxWidth: '900px',
    margin: '0 auto',
  },
  stepper: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '24px',
    borderBottom: '1px solid #334155',
    paddingBottom: '12px',
  },
  stepActive: {
    fontWeight: 'bold',
    color: '#0d9488',
    fontSize: '14px',
    borderBottom: '2px solid #0d9488',
    paddingBottom: '6px',
  },
  stepInactive: {
    color: '#64748b',
    fontSize: '14px',
  },
  main: {
    marginTop: '10px',
  },
  sectionTitle: {
    fontSize: '18px',
    color: '#38bdf8',
    margin: '0 0 16px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  subLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'block',
    marginTop: '8px',
    marginBottom: '4px',
  },
  select: {
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  derivedStageBox: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '15px',
    marginBottom: '20px',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px',
    color: '#f8fafc',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  agentCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    color: '#cbd5e1',
    cursor: 'pointer',
    marginTop: '6px',
  },
  checkbox: {
    marginRight: '8px',
    width: '16px',
    height: '16px',
    accentColor: '#0d9488',
  },
  inputNumber: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },
  navBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
  },
  backBtn: {
    backgroundColor: '#475569',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  saveBtn: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '20px',
  },
  formContainer: {},
};
