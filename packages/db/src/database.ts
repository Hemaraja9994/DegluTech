import type { Patient, MasaAssessment, Eat10Assessment, SpeechAssessment, TherapyLog } from '@laryngoos/core';

// ===================================================
// 1. Database Table DDL Definitions
// ===================================================

export const DATABASE_SCHEMA_QUERIES = [
  // Patients Table (isolated metrics using SHA-256 medical record hash)
  `CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    medical_record_hash TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT CHECK(status IN ('active', 'discharged')) DEFAULT 'active'
  );`,

  // Encrypted Patient PII (stored in separate table, encrypted at rest)
  `CREATE TABLE IF NOT EXISTS patient_pii (
    patient_id TEXT PRIMARY KEY,
    first_name_encrypted TEXT NOT NULL,
    last_name_encrypted TEXT NOT NULL,
    dob_encrypted TEXT NOT NULL,
    contact_number_encrypted TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );`,

  // MASA Swallow Assessments Table
  `CREATE TABLE IF NOT EXISTS MASA_assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    assessor_id TEXT NOT NULL,
    alertness INTEGER NOT NULL,
    cooperation INTEGER NOT NULL,
    respiration_rate INTEGER NOT NULL,
    lip_seal INTEGER NOT NULL,
    tongue_strength INTEGER NOT NULL,
    gag_reflex INTEGER NOT NULL,
    swallow_trigger INTEGER NOT NULL,
    cough_reflex INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    aspiration_risk_level TEXT NOT NULL,
    dysphagia_severity TEXT NOT NULL,
    structural_deficits TEXT NOT NULL, -- JSON Stringified array
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );`,

  // EAT-10 Questionnaire Responses
  `CREATE TABLE IF NOT EXISTS EAT10_assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    q1_weight_loss INTEGER NOT NULL,
    q2_eat_out INTEGER NOT NULL,
    q3_swallow_effort INTEGER NOT NULL,
    q4_sticking_throat INTEGER NOT NULL,
    q5_pain_swallowing INTEGER NOT NULL,
    q6_pleasure_eating INTEGER NOT NULL,
    q7_cough_after_eating INTEGER NOT NULL,
    q8_stressful INTEGER NOT NULL,
    q9_social_limit INTEGER NOT NULL,
    q10_choking_fear INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );`,

  // Therapy Progress Logs
  `CREATE TABLE IF NOT EXISTS therapy_logs (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    exercise_type TEXT NOT NULL,
    planned_sets INTEGER NOT NULL,
    planned_reps INTEGER NOT NULL,
    completed_reps INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    vas_pain_score INTEGER NOT NULL,
    vas_effort_score INTEGER NOT NULL,
    compliance_status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES patients(id) ON DELETE CASCADE
  );`
];

// ===================================================
// 2. Database Adapter Runner Interface
// ===================================================

export interface DatabaseDriver {
  execute(sql: string, params?: any[]): Promise<any>;
  select<T>(sql: string, params?: any[]): Promise<T[]>;
}

/**
 * secure local database controller for patient records.
 * Integrates directly with platform-specific execution engines.
 */
export class SecureDatabase {
  private driver: DatabaseDriver | null = null;

  constructor(driver: DatabaseDriver) {
    this.driver = driver;
  }

  /**
   * Initializes the SQLite schema layout on the device.
   */
  public async initialize(): Promise<void> {
    if (!this.driver) throw new Error('Database driver not initialized.');
    for (const sql of DATABASE_SCHEMA_QUERIES) {
      await this.driver.execute(sql);
    }
    console.log('DSRS Local Database initialized successfully.');
  }

  // ==========================================
  // Patient Operations
  // ==========================================

  public async createPatient(patient: Patient, pii: {
    first_name_enc: string;
    last_name_enc: string;
    dob_enc: string;
    contact_enc: string;
  }): Promise<void> {
    if (!this.driver) throw new Error('Database driver unavailable.');
    
    // Insert base profile
    await this.driver.execute(
      `INSERT INTO patients (id, medical_record_hash, created_at, status)
       VALUES (?, ?, ?, ?);`,
      [patient.id, patient.medical_record_hash, patient.created_at, patient.status]
    );

    // Insert encrypted demographics
    await this.driver.execute(
      `INSERT INTO patient_pii (patient_id, first_name_encrypted, last_name_encrypted, dob_encrypted, contact_number_encrypted)
       VALUES (?, ?, ?, ?, ?);`,
      [patient.id, pii.first_name_enc, pii.last_name_enc, pii.dob_enc, pii.contact_enc]
    );
  }

  public async getPatients(): Promise<Patient[]> {
    if (!this.driver) throw new Error('Database driver unavailable.');
    return this.driver.select<Patient>('SELECT * FROM patients ORDER BY created_at DESC;');
  }

  // ==========================================
  // Assessment Operations
  // ==========================================

  public async saveMasaAssessment(assessment: MasaAssessment): Promise<void> {
    if (!this.driver) throw new Error('Database driver unavailable.');
    await this.driver.execute(
      `INSERT INTO MASA_assessments (
        id, patient_id, assessor_id, alertness, cooperation, respiration_rate,
        lip_seal, tongue_strength, gag_reflex, swallow_trigger, cough_reflex,
        total_score, aspiration_risk_level, dysphagia_severity, structural_deficits, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        assessment.id,
        assessment.patient_id,
        assessment.assessor_id,
        assessment.alertness,
        assessment.cooperation,
        assessment.respiration_rate,
        assessment.lip_seal,
        assessment.tongue_strength,
        assessment.gag_reflex,
        assessment.swallow_trigger,
        assessment.cough_reflex,
        assessment.total_score,
        assessment.aspiration_risk_level,
        assessment.dysphagia_severity,
        JSON.stringify(assessment.structural_deficits),
        assessment.notes || '',
        assessment.created_at
      ]
    );
  }

  public async getPatientTherapyLogs(patientId: string): Promise<TherapyLog[]> {
    if (!this.driver) throw new Error('Database driver unavailable.');
    return this.driver.select<TherapyLog>(
      'SELECT * FROM therapy_logs WHERE patient_id = ? ORDER BY created_at DESC;',
      [patientId]
    );
  }

  public async saveTherapyLog(log: TherapyLog): Promise<void> {
    if (!this.driver) throw new Error('Database driver unavailable.');
    await this.driver.execute(
      `INSERT INTO therapy_logs (
        id, patient_id, exercise_type, planned_sets, planned_reps, completed_reps,
        duration_seconds, vas_pain_score, vas_effort_score, compliance_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        log.id,
        log.patient_id,
        log.exercise_type,
        log.planned_sets,
        log.planned_reps,
        log.completed_reps,
        log.duration_seconds,
        log.vas_pain_score,
        log.vas_effort_score,
        log.compliance_status,
        log.created_at
      ]
    );
  }
}
