import { useState } from 'react';

export function WorkspaceNotice({ backup, onClear }: { backup: object; onClear: () => void }) {
  const [status, setStatus] = useState('');
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, appVersion: '0.2.0-review', exportedAt: new Date().toISOString(), ...backup }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'deglutech-workspace-backup.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus('Unencrypted backup downloaded. Keep it on a protected device.');
  };
  return <details className="suite-data"><summary>Clinical review build 0.2.0-review | Fictitious data only</summary>
    <p>This public demonstration is not a secure clinical record system. Drafts and session logs are stored unencrypted in this browser. There is no authenticated patient access, server sync, or verified medical-animation library.</p>
    <p>Static application files are hosted on Cloudflare Pages. This build does not send draft fields to an AI service or clinical backend. Browser backups and printed reports remain your responsibility. Do not enter real patient identifiers.</p>
    <div className="suite-data-actions"><button type="button" onClick={download}>Download workspace backup</button><button type="button" onClick={() => {
      if (window.confirm('Delete this browser workspace, including its prescription and session logs? Download a backup first if needed. This does not remove exported files.')) { onClear(); setStatus('Local workspace cleared. Exported files are not deleted.'); }
    }}>Clear local workspace</button></div><p role="status">{status}</p>
  </details>;
}
