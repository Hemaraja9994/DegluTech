import { createContext, useContext } from 'react';
import { DEFAULT_SETTINGS, type ClinicSettings, type PatientRecord } from '../clinicStore';

/** Clinic settings and the open patient, for reports, printouts and handouts. */
export const ClinicContext = createContext<{ settings: ClinicSettings; active: PatientRecord | null }>({ settings: DEFAULT_SETTINGS, active: null });
export const useClinic = () => useContext(ClinicContext);
