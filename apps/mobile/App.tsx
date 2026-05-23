import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  HNC_CLINICAL_SECTIONS,
  HNC_EXERCISE_LIBRARY,
  HNC_PATIENT_SNAPSHOT,
  type HncSectionId,
} from '../../packages/core/src/hncClinicalModel';

export default function App() {
  const [view, setView] = useState<'home' | 'sections' | 'exercises'>('home');
  const [activeSectionId, setActiveSectionId] = useState<HncSectionId>('command');
  const [done, setDone] = useState<Record<string, boolean>>({ masako: true });

  const activeSection = HNC_CLINICAL_SECTIONS.find((section) => section.id === activeSectionId) ?? HNC_CLINICAL_SECTIONS[0];

  const toggleExercise = (id: string) => {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.brand}>DegluTech</Text>
        <Text style={styles.subtitle}>HNC SLP Rehabilitation</Text>
      </View>

      <View style={styles.segmented}>
        {[
          ['home', 'Home'],
          ['sections', 'Clinical'],
          ['exercises', 'Exercises'],
        ].map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => setView(id as 'home' | 'sections' | 'exercises')}
            style={[styles.segment, view === id && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, view === id && styles.segmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'home' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.patientCard}>
            <Text style={styles.kicker}>Active case</Text>
            <Text style={styles.title}>{HNC_PATIENT_SNAPSHOT.diagnosis}</Text>
            <Text style={styles.bodyText}>{HNC_PATIENT_SNAPSHOT.stage}</Text>
            <View style={styles.riskPill}>
              <Text style={styles.riskText}>{HNC_PATIENT_SNAPSHOT.riskLevel.toUpperCase()} RISK</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Today priorities</Text>
          {HNC_PATIENT_SNAPSHOT.primaryGoals.map((goal) => (
            <View key={goal} style={styles.rowCard}>
              <View style={styles.dot} />
              <Text style={styles.rowText}>{goal}</Text>
            </View>
          ))}

          <Text style={styles.sectionTitle}>Alerts</Text>
          {HNC_PATIENT_SNAPSHOT.alerts.map((alert) => (
            <View key={alert} style={styles.alertCard}>
              <Text style={styles.alertText}>{alert}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {view === 'sections' && (
        <View style={styles.twoPane}>
          <ScrollView style={styles.sectionRail} contentContainerStyle={styles.sectionRailContent}>
            {HNC_CLINICAL_SECTIONS.map((section) => (
              <TouchableOpacity
                key={section.id}
                onPress={() => setActiveSectionId(section.id)}
                style={[styles.sectionButton, activeSectionId === section.id && styles.sectionButtonActive]}
              >
                <Text style={[styles.sectionButtonText, activeSectionId === section.id && styles.sectionButtonTextActive]}>
                  {section.shortLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView style={styles.sectionDetail} contentContainerStyle={styles.content}>
            <Text style={styles.kicker}>Module {activeSection.order}</Text>
            <Text style={styles.title}>{activeSection.label}</Text>
            <Text style={styles.bodyText}>{activeSection.purpose}</Text>
            {activeSection.blocks.map((block) => (
              <View key={block.title} style={styles.blockCard}>
                <Text style={styles.blockTitle}>{block.title}</Text>
                <Text style={styles.bodyText}>{block.description}</Text>
                {block.fields.slice(0, 4).map((field) => (
                  <View key={field.id} style={styles.fieldRow}>
                    <Text style={styles.fieldText}>{field.label}</Text>
                    <Text style={styles.fieldKind}>{field.kind}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {view === 'exercises' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Illustrated exercise program</Text>
          {HNC_EXERCISE_LIBRARY.map((exercise) => (
            <TouchableOpacity
              key={exercise.id}
              onPress={() => toggleExercise(exercise.id)}
              style={[styles.exerciseCard, done[exercise.id] && styles.exerciseCardDone]}
            >
              <View style={styles.exerciseTop}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.statusText}>{done[exercise.id] ? 'Done' : 'Pending'}</Text>
              </View>
              <Text style={styles.bodyText}>{exercise.patientLanguage}</Text>
              <Text style={styles.doseText}>{exercise.dosage}</Text>
              <View style={styles.regimenGrid}>
                <View style={styles.regimenBox}>
                  <Text style={styles.regimenLabel}>Frequency</Text>
                  <Text style={styles.regimenValue}>{exercise.regimen.frequency}</Text>
                </View>
                <View style={styles.regimenBox}>
                  <Text style={styles.regimenLabel}>Session</Text>
                  <Text style={styles.regimenValue}>{exercise.regimen.sessionDuration}</Text>
                </View>
                <View style={styles.regimenBox}>
                  <Text style={styles.regimenLabel}>How much</Text>
                  <Text style={styles.regimenValue}>{exercise.regimen.setsAndReps}</Text>
                </View>
                <View style={styles.regimenBox}>
                  <Text style={styles.regimenLabel}>Stop if</Text>
                  <Text style={styles.regimenValue}>{exercise.regimen.stopRules.slice(0, 2).join(', ')}</Text>
                </View>
              </View>
              <View style={styles.stepStrip}>
                {exercise.steps.map((step) => (
                  <View key={step.label} style={styles.stepBox}>
                    <Text style={styles.stepLabel}>{step.label}</Text>
                    <Text style={styles.stepCue}>{step.cue}</Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ef',
  },
  brand: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  segmented: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4ef',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#2563eb',
  },
  segmentText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  patientCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  kicker: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 25,
  },
  bodyText: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  riskPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  riskText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
    marginTop: 6,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 8,
    padding: 12,
    marginBottom: 9,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 999,
    backgroundColor: '#0d9488',
    marginRight: 10,
  },
  rowText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 9,
  },
  alertText: {
    color: '#9a3412',
    fontSize: 13,
    fontWeight: '800',
  },
  twoPane: {
    flex: 1,
    flexDirection: 'row',
  },
  sectionRail: {
    width: 112,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#dbe4ef',
  },
  sectionRailContent: {
    padding: 8,
  },
  sectionButton: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  sectionButtonActive: {
    backgroundColor: '#eff6ff',
  },
  sectionButtonText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionButtonTextActive: {
    color: '#1d4ed8',
  },
  sectionDetail: {
    flex: 1,
  },
  blockCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 8,
    padding: 14,
    marginTop: 12,
  },
  blockTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
  },
  fieldText: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  fieldKind: {
    color: '#0d9488',
    fontSize: 11,
    fontWeight: '900',
  },
  exerciseCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  exerciseCardDone: {
    borderColor: '#0d9488',
    backgroundColor: '#ecfdf5',
  },
  exerciseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  exerciseName: {
    flex: 1,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
  },
  statusText: {
    color: '#0d9488',
    fontSize: 12,
    fontWeight: '900',
  },
  doseText: {
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 8,
  },
  regimenGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  regimenBox: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#dbe4ef',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 9,
  },
  regimenLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  regimenValue: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 15,
  },
  stepStrip: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  stepBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 8,
  },
  stepLabel: {
    color: '#1d4ed8',
    fontSize: 11,
    fontWeight: '900',
  },
  stepCue: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
});
