export const APP_VERSION = '0.4.0-review';

export function WorkspaceNotice() {
  return <details className="suite-data"><summary>Review build {APP_VERSION} | Records stay on this device</summary>
    <p>Patients and settings are saved only in this browser on this device, unencrypted. Nothing is sent to a server or an AI service. There is no login, so protect the device itself.</p>
    <p>Export a backup regularly from Settings and keep it on a protected drive; clearing the browser or changing device loses records that were not backed up. Printed and exported reports are your responsibility under your institution's data-protection rules.</p>
    <p>Exercise animations are schematic and await clinician verification.</p>
  </details>;
}
