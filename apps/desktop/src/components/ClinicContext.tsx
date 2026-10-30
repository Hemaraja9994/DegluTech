import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type ClinicSettings, type PatientRecord } from '../clinicStore';

/** Clinic settings and the open patient, for reports, printouts and handouts. */
export type ClinicContextValue = { settings: ClinicSettings; active: PatientRecord | null; setHospitalId?: (id: string) => void };
export const ClinicContext = createContext<ClinicContextValue>({ settings: DEFAULT_SETTINGS, active: null });
export const useClinic = () => useContext(ClinicContext);
