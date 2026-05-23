import React, { useState, useEffect } from 'react';
import { InterventionEngine } from '../../../../packages/core/src/cdss/InterventionEngine';
import type { ClinicalRecommendation, RehabilitationExercise } from '../../../../packages/core/src/cdss/InterventionEngine';
import type { AdvancedOncologicalHistory } from '../../../../packages/core/src/types/oncologyTypes';
import type { OPMEAssessment, SpeechSwallowingAssessment } from '../../../../packages/core/src/types/interfaces';

interface DashboardProps {
  oncologyHistory: AdvancedOncologicalHistory;
  opme: OPMEAssessment;
  swallowSpeech: SpeechSwallowingAssessment;
}

export const RecommendationDashboard: React.FC<DashboardProps> = ({
  oncologyHistory,
  opme,
  swallowSpeech,
}) => {
  const [recommendation, setRecommendation] = useState<ClinicalRecommendation | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseInstructions, setCustomExerciseInstructions] = useState('');

  // Execute recommendation engine when props update
  useEffect(() => {
    const rec = InterventionEngine.evaluateProfile(oncologyHistory, opme, swallowSpeech);
    setRecommendation(rec);
  }, [oncologyHistory, opme, swallowSpeech]);

  const handleRemoveExercise = (id: string) => {
    if (!recommendation) return;
    setRecommendation({
      ...recommendation,
      exercises: recommendation.exercises.filter((ex) => ex.id !== id),
    });
  };

  const handleAddCustomExercise = () => {
    if (!recommendation || !customExerciseName || !customExerciseInstructions) return;
    const newEx: RehabilitationExercise = {
      id: `custom_${Math.random().toString(36).substring(7)}`,
      name: customExerciseName,
      category: 'dysphagia_compensatory',
      instruction: customExerciseInstructions,
      rationale: 'Clinician manually prescribed override instruction.',
      frequency: 'As specified by SLP',
      repsAndSets: 'Adjusted to patient tolerance',
    };

    setRecommendation({
      ...recommendation,
      exercises: [...recommendation.exercises, newEx],
    });

    setCustomExerciseName('');
    setCustomExerciseInstructions('');
  };

  if (!recommendation) {
    return <div style={styles.loading}>Running CDSS Clinical Engine...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>CDSS Clinical Intervention Portal</h2>
          <div style={styles.pathwayText}>Active Protocol: <strong>{recommendation.pathwayName}</strong></div>
        </div>
        <div style={styles.timestampBadge}>Generated: {new Date(recommendation.generatedAt).toLocaleTimeString()}</div>
      </div>

      <div style={styles.layout}>
        {/* Left Column: Risks & Directives */}
        <div style={styles.sidebar}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Identified Clinical Risks</h3>
            <ul style={styles.riskList}>
              {recommendation.primaryRiskFactors.map((risk, index) => (
                <li key={index} style={styles.riskItem}>
                  ⚠️ {risk}
                </li>
              ))}
              {recommendation.primaryRiskFactors.length === 0 && (
                <li style={styles.emptyItem}>No severe structural or nerve risks flagged.</li>
              )}
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Directives & Precautions</h3>
            <ul style={styles.directiveList}>
              {recommendation.clinicalDirectives.map((directive, index) => (
                <li key={index} style={styles.directiveItem}>
                  🔹 {directive}
                </li>
              ))}
              {recommendation.clinicalDirectives.length === 0 && (
                <li style={styles.emptyItem}>Standard swallow/speech precautions apply.</li>
              )}
            </ul>
          </div>

          {/* Clinician Prescriptive Overrides */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Prescribe Override Exercise</h3>
            <div style={styles.form}>
              <input
                type="text"
                value={customExerciseName}
                onChange={(e) => setCustomExerciseName(e.target.value)}
                placeholder="Exercise Name"
                style={styles.input}
              />
              <textarea
                value={customExerciseInstructions}
                onChange={(e) => setCustomExerciseInstructions(e.target.value)}
                placeholder="Instruction Details"
                style={styles.textarea}
              />
              <button onClick={handleAddCustomExercise} style={styles.addBtn}>
                Add to Patient Protocol
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Tailored Exercise Plan */}
        <div style={styles.mainContent}>
          <h3 style={styles.sectionTitle}>Tailored Rehabilitation Regimen</h3>
          <div style={styles.exerciseList}>
            {recommendation.exercises.map((ex) => (
              <div key={ex.id} style={styles.exerciseCard}>
                <div style={styles.exerciseHeader}>
                  <div>
                    <span style={styles.exerciseCategory}>{ex.category.replace('_', ' ').toUpperCase()}</span>
                    <h4 style={styles.exerciseName}>{ex.name}</h4>
                  </div>
                  <button onClick={() => handleRemoveExercise(ex.id)} style={styles.removeBtn}>
                    Remove
                  </button>
                </div>
                <div style={styles.exerciseBody}>
                  <p style={styles.exerciseText}>
                    <strong>Instructions:</strong> {ex.instruction}
                  </p>
                  <p style={styles.exerciseText}>
                    <strong>Clinical Rationale:</strong> <em>{ex.rationale}</em>
                  </p>
                  <div style={styles.exerciseMetaRow}>
                    <span>Frequency: <strong>{ex.frequency}</strong></span>
                    <span>Target: <strong>{ex.repsAndSets}</strong></span>
                  </div>
                </div>
              </div>
            ))}
            {recommendation.exercises.length === 0 && (
              <div style={styles.emptyState}>No exercises proposed. Prescribe overrides if necessary.</div>
            )}
          </div>
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
    border: '1px solid #1e293b',
    fontFamily: "'Outfit', 'Inter', sans-serif",
    maxWidth: '1100px',
    margin: '20px auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #334155',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    color: '#0d9488',
    margin: '0 0 6px 0',
  },
  pathwayText: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  timestampBadge: {
    backgroundColor: '#1e293b',
    color: '#38bdf8',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  layout: {
    display: 'flex',
    gap: '24px',
    flexWrap: 'wrap',
  },
  sidebar: {
    flex: '1 1 300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  mainContent: {
    flex: '2 1 600px',
  },
  section: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #334155',
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#38bdf8',
    margin: '0 0 14px 0',
    borderBottom: '1px solid #334155',
    paddingBottom: '6px',
  },
  riskList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  riskItem: {
    fontSize: '13px',
    color: '#f43f5e',
    lineHeight: '1.4',
  },
  directiveList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  directiveItem: {
    fontSize: '13px',
    color: '#fbbf24',
    lineHeight: '1.4',
  },
  emptyItem: {
    fontSize: '13px',
    color: '#64748b',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
  },
  textarea: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    height: '60px',
    outline: 'none',
    resize: 'none',
  },
  addBtn: {
    backgroundColor: '#0d9488',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px',
    fontWeight: 'bold',
    fontSize: '13px',
    cursor: 'pointer',
  },
  exerciseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  exerciseCard: {
    backgroundColor: '#1e293b',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #334155',
    borderLeft: '4px solid #4f46e5',
  },
  exerciseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid #334155',
    paddingBottom: '10px',
    marginBottom: '12px',
  },
  exerciseCategory: {
    fontSize: '10px',
    color: '#818cf8',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  exerciseName: {
    fontSize: '16px',
    color: '#f8fafc',
    margin: '2px 0 0 0',
  },
  removeBtn: {
    backgroundColor: 'transparent',
    color: '#f43f5e',
    border: '1px solid #f43f5e',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  exerciseBody: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#cbd5e1',
  },
  exerciseText: {
    margin: '0 0 8px 0',
  },
  exerciseMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    marginTop: '12px',
    color: '#94a3b8',
  },
  emptyState: {
    color: '#64748b',
    textAlign: 'center',
    padding: '40px 0',
  },
  loading: {
    textAlign: 'center',
    color: '#0d9488',
    padding: '40px',
  },
};
