import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { InterventionEngine } from '../../../../packages/core/src/cdss/InterventionEngine';
import type { ClinicalRecommendation, RehabilitationExercise } from '../../../../packages/core/src/cdss/InterventionEngine';
import type { AdvancedOncologicalHistory } from '../../../../packages/core/src/types/oncologyTypes';
import type { OPMEAssessment, SpeechSwallowingAssessment } from '../../../../packages/core/src/types/interfaces';

interface MobileDashboardProps {
  oncologyHistory: AdvancedOncologicalHistory;
  opme: OPMEAssessment;
  swallowSpeech: SpeechSwallowingAssessment;
}

export const RecommendationDashboard: React.FC<MobileDashboardProps> = ({
  oncologyHistory,
  opme,
  swallowSpeech,
}) => {
  const [recommendation, setRecommendation] = useState<ClinicalRecommendation | null>(null);
  const [customName, setCustomName] = useState('');
  const [customInstruction, setCustomInstruction] = useState('');

  useEffect(() => {
    const rec = InterventionEngine.evaluateProfile(oncologyHistory, opme, swallowSpeech);
    setRecommendation(rec);
  }, [oncologyHistory, opme, swallowSpeech]);

  const handleRemove = (id: string) => {
    if (!recommendation) return;
    setRecommendation({
      ...recommendation,
      exercises: recommendation.exercises.filter((ex) => ex.id !== id),
    });
  };

  const handleAdd = () => {
    if (!recommendation || !customName || !customInstruction) return;
    const newEx: RehabilitationExercise = {
      id: `custom_${Date.now()}`,
      name: customName,
      category: 'dysphagia_compensatory',
      instruction: customInstruction,
      rationale: 'SLP manual mobile prescription.',
      frequency: 'Daily',
      repsAndSets: 'Per patient baseline tolerance',
    };

    setRecommendation({
      ...recommendation,
      exercises: [...recommendation.exercises, newEx],
    });

    setCustomName('');
    setCustomInstruction('');
  };

  if (!recommendation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Running clinical CDSS recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>CDSS Intervention Portal</Text>
        <Text style={styles.pathwayName}>{recommendation.pathwayName}</Text>
      </View>

      {/* Risks Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identified Clinical Risks</Text>
        {recommendation.primaryRiskFactors.map((risk, idx) => (
          <Text key={idx} style={styles.riskText}>
            ⚠️ {risk}
          </Text>
        ))}
        {recommendation.primaryRiskFactors.length === 0 && (
          <Text style={styles.emptyText}>No severe airway/structural risks flagged.</Text>
        )}
      </View>

      {/* Directives Panel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Clinical Directives</Text>
        {recommendation.clinicalDirectives.map((dir, idx) => (
          <Text key={idx} style={styles.directiveText}>
            🔹 {dir}
          </Text>
        ))}
        {recommendation.clinicalDirectives.length === 0 && (
          <Text style={styles.emptyText}>Standard HNC guidelines apply.</Text>
        )}
      </View>

      {/* Recommended Exercises list */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tailored Exercise Plan</Text>
        {recommendation.exercises.map((ex) => (
          <View key={ex.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exerciseCategory}>{ex.category.toUpperCase().replace('_', ' ')}</Text>
                <Text style={styles.exerciseName}>{ex.name}</Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(ex.id)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>Remove</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.exerciseBody}>
              <Text style={styles.boldLabel}>Instruction: </Text>
              {ex.instruction}
            </Text>
            <Text style={styles.exerciseRationale}>
              <Text style={styles.boldLabel}>Rationale: </Text>
              {ex.rationale}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Freq: {ex.frequency}</Text>
              <Text style={styles.metaText}>Target: {ex.repsAndSets}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Override prescription section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manual Prescription Override</Text>
        <TextInput
          value={customName}
          onChangeText={setCustomName}
          placeholder="Exercise Title"
          placeholderTextColor="#64748b"
          style={styles.input}
        />
        <TextInput
          value={customInstruction}
          onChangeText={setCustomInstruction}
          placeholder="Execution Instructions"
          placeholderTextColor="#64748b"
          multiline
          style={[styles.input, styles.textArea]}
        />
        <TouchableOpacity onPress={handleAdd} style={styles.addBtn}>
          <Text style={styles.addBtnText}>Prescribe Exercise</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 24,
  },
  loadingText: {
    color: '#0d9488',
    marginTop: 12,
    fontSize: 14,
    fontWeight: 'bold',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0d9488',
  },
  pathwayName: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#38bdf8',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 4,
  },
  riskText: {
    color: '#f43f5e',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  directiveText: {
    color: '#fbbf24',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
  },
  exerciseCard: {
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4f46e5',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingBottom: 8,
    marginBottom: 8,
  },
  exerciseCategory: {
    fontSize: 9,
    color: '#818cf8',
    fontWeight: 'bold',
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginTop: 2,
  },
  removeBtn: {
    borderWidth: 1,
    borderColor: '#f43f5e',
    borderRadius: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  removeBtnText: {
    color: '#f43f5e',
    fontSize: 10,
    fontWeight: 'bold',
  },
  exerciseBody: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  exerciseRationale: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
    marginBottom: 8,
  },
  boldLabel: {
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    padding: 6,
    borderRadius: 4,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  input: {
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 6,
    padding: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  addBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
