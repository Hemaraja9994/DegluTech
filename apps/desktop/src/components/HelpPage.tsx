import { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Download, ExternalLink, Laptop, MonitorSmartphone, RefreshCw, ShieldCheck, Smartphone, WifiOff } from 'lucide-react';
import { checkForUpdate, detectBrowser, detectPlatform, promptInstall, useInstallState, type Platform } from '../install';

const SITE = 'https://deglutech.pages.dev';
type Guide = { id: Platform | 'desktop'; label: string; icon: JSX.Element; steps: string[]; note?: string };

const GUIDES: Guide[] = [
  { id: 'android', label: 'Android phone or tablet', icon: <Smartphone size={18} />, steps: [
    'Open deglutech.pages.dev in Chrome (or Edge or Samsung Internet).',
    'Tap Install DegluTech on this page, or open the ⋮ menu and choose Install app (Add to Home screen on some phones).',
    'Confirm Install. DegluTech appears on the home screen and in the app drawer.',
  ] },
  { id: 'ios', label: 'iPhone or iPad', icon: <Smartphone size={18} />, steps: [
    'Open deglutech.pages.dev in Safari.',
    'Tap the Share button (square with an arrow), scroll down and tap Add to Home Screen.',
    'Keep the name DegluTech and tap Add. Open it from the home screen icon.',
  ], note: 'On iPhone and iPad the home-screen app keeps its own records, separate from Safari. If you already entered patients in Safari, export a backup there (Settings → Backup and data) and import it in the installed app.' },
  { id: 'windows', label: 'Windows computer', icon: <Laptop size={18} />, steps: [
    'Open deglutech.pages.dev in Microsoft Edge or Google Chrome.',
    'Click Install DegluTech on this page, or the install icon at the right of the address bar (Edge: … menu → Apps → Install this site as an app).',
    'DegluTech opens in its own window and is added to the Start menu. Right-click its taskbar icon and choose Pin to taskbar.',
  ] },
  { id: 'mac', label: 'Mac computer', icon: <Laptop size={18} />, steps: [
    'In Chrome or Edge: click Install DegluTech on this page, or the install icon in the address bar. It appears in Launchpad and the Applications folder.',
    'In Safari (macOS Sonoma or later): choose File → Add to Dock, then Add.',
    'Open DegluTech from the Dock or Launchpad.',
  ] },
];

export function HelpPage({ onSettings }: { onSettings: () => void }) {
  const install = useInstallState();
  const platform = useMemo(() => detectPlatform(), []);
  const browser = useMemo(() => detectBrowser(), []);
  const [guide, setGuide] = useState<Guide['id']>(platform === 'linux' || platform === 'other' ? 'windows' : platform);
  const [message, setMessage] = useState('');
  const current = GUIDES.find(g => g.id === guide) ?? GUIDES[2];
  const firefoxDesktop = browser === 'firefox' && platform !== 'android' && platform !== 'ios';
  const iosNotSafari = platform === 'ios' && browser !== 'safari';

  const install1 = async () => {
    const r = await promptInstall();
    setMessage(r === 'accepted' ? 'DegluTech is being installed. Open it from your home screen, Start menu or Dock.' : r === 'dismissed' ? 'Installation cancelled. You can install at any time from this page.' : 'Use the steps below for this device.');
  };
  const update = async () => {
    setMessage('Checking for a newer version…');
    const r = await checkForUpdate();
    setMessage(r === 'updated' ? 'A newer version was found. Reloading…' : r === 'offline' ? 'No connection. Updates are checked when you are online.' : 'You have the latest version.');
  };

  return <div className="hp">
    <div className="dt-page-heading"><span className="dt-eyebrow">DOWNLOADS &amp; HELP</span><h2>Install DegluTech and read the manuals</h2>
      <p>Install the workspace on a phone, tablet or computer, and keep the clinician manuals at hand.</p></div>

    <div className="hp-grid">
      <section className="hp-card hp-install" aria-labelledby="hp-install">
        <h3 id="hp-install"><MonitorSmartphone size={22} /> Install on this device</h3>
        {install.installed
          ? <p className="hp-ok"><CheckCircle2 size={20} /> DegluTech is installed and open as an app on this device.</p>
          : install.canPrompt
            ? <><p>This browser can install DegluTech as an app with its own window and icon.</p>
                <button type="button" className="hp-primary" onClick={install1}><Download size={18} /> Install DegluTech</button></>
            : <p>{firefoxDesktop ? 'Firefox on computers cannot install web apps. Open this page in Chrome or Edge to install DegluTech.'
                : iosNotSafari ? 'On iPhone and iPad, open this page in Safari to add DegluTech to the home screen.'
                : 'Follow the steps for your device below. If you already installed DegluTech, open it from the home screen, Start menu or Dock.'}</p>}
        {message && <p className="pm-status" role="status">{message}</p>}
        <div className="hp-tabs" role="tablist" aria-label="Device">
          {GUIDES.map(g => <button key={g.id} type="button" role="tab" aria-selected={guide === g.id} onClick={() => setGuide(g.id)}>{g.icon}{g.label}{g.id === platform && <span className="hp-this">this device</span>}</button>)}
        </div>
        <ol className="hp-steps" role="tabpanel" aria-label={current.label}>{current.steps.map(s => <li key={s}>{s}</li>)}</ol>
        {current.note && <p className="hp-note">{current.note}</p>}
      </section>

      <section className="hp-card hp-qr" aria-labelledby="hp-qr">
        <h3 id="hp-qr"><Smartphone size={22} /> Open on a phone</h3>
        <img src="icons/qr-deglutech.svg" alt={`QR code for ${SITE}`} width={200} height={200} />
        <p>Scan with the phone camera, then follow the steps for Android or iPhone.</p>
        <p className="hp-url">{SITE.replace('https://', '')}</p>
      </section>
    </div>

    <section className="hp-card" aria-labelledby="hp-docs">
      <h3 id="hp-docs"><BookOpen size={22} /> Manuals</h3>
      <div className="hp-docs">
        {[
          { file: 'deglutech-user-manual', title: 'User manual', meta: 'A4 · about 40 pages · every page of the workspace with screenshots, clinical notes and troubleshooting' },
          { file: 'deglutech-quick-start', title: 'Quick start', meta: 'A4 · 2 pages · from the first patient to a signed report; print it for the clinic desk' },
        ].map(d => <article key={d.file} className="hp-doc">
          <img src={`downloads/${d.file}-cover.jpg`} alt="" loading="lazy" />
          <div><h4>{d.title}</h4><p>{d.meta}</p>
            <div className="hp-doc-actions">
              <a className="hp-primary" href={`downloads/${d.file}.pdf`} target="_blank" rel="noopener"><ExternalLink size={17} /> Open</a>
              <a className="hp-secondary" href={`downloads/${d.file}.pdf`} download><Download size={17} /> Download PDF</a>
            </div></div>
        </article>)}
      </div>
    </section>

    <div className="hp-grid hp-grid-3">
      <section className="hp-card" aria-labelledby="hp-offline">
        <h3 id="hp-offline"><WifiOff size={22} /> Working offline</h3>
        <p>{install.offlineReady ? 'This device has a saved copy of DegluTech. It opens and works without a connection.' : 'After the first visit online, DegluTech keeps a copy on this device and opens without a connection.'}</p>
        <p>Reading photos needs the text-recognition files for the chosen language; they are saved the first time you read a photo online.</p>
        <button type="button" className="hp-secondary" onClick={update}><RefreshCw size={17} /> Check for updates</button>
      </section>
      <section className="hp-card" aria-labelledby="hp-req">
        <h3 id="hp-req"><Laptop size={22} /> Requirements</h3>
        <ul>
          <li>Chrome or Edge (Windows, Mac, Android) or Safari (iPhone, iPad, Mac), current version.</li>
          <li>3D exercise demonstrations need WebGL; the drawing is shown otherwise.</li>
          <li>Allow pop-ups for this site to export reports.</li>
        </ul>
      </section>
      <section className="hp-card" aria-labelledby="hp-priv">
        <h3 id="hp-priv"><ShieldCheck size={22} /> Records and privacy</h3>
        <p>Installing does not upload anything. Records stay in this browser on this device, separate on each device.</p>
        <button type="button" className="hp-secondary" onClick={onSettings}>Back up records in Settings</button>
      </section>
    </div>
  </div>;
}
