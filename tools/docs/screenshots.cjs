// Captures every DegluTech screen with demonstration data for the manual + layout checks.
const { chromium } = require('playwright'); const path = require('path');
const OUT = process.argv[2] || '/tmp/deglutech-shots'; const APP = require('path').join(__dirname, 'fixtures'); const URL = process.env.URL || 'http://localhost:4174/'; require('fs').mkdirSync(OUT, { recursive: true });
const SECTIONS = ['Clinician Dashboard','Demographics and Referral','Oncology and Staging','Treatment and Toxicity','OPME and Cranial Nerves','Swallowing Assessment','Voice and Speech','Nutrition and Airway','Instrumental Studies','WHO-ICF HNC Profile','Exercise Prescription','Patient Portal','Summary and Report'];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.25 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const issues = [];
  const check = async (name) => { const sl = await p.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.scrollLeft > 0).map(e => e.className).slice(0, 3)); if (sl.length) issues.push(`${name}: scrolled sideways ${sl}`); const r = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth })); if (r.sw > r.w + 1) issues.push(`${name}: page ${r.sw}px wider than ${r.w}px`); };
  const shot = async (name, opts = {}) => { await p.waitForTimeout(opts.wait ?? 450); await check(name); await p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!opts.full, clip: opts.clip }); console.log('shot', name); };
  const el = async (name, sel, opts = {}) => { try { const loc = p.locator(sel).first(); await loc.scrollIntoViewIfNeeded(); await p.waitForTimeout(300); await loc.screenshot({ path: path.join(OUT, name + '.png') }); console.log('shot', name); } catch (e) { issues.push(`EL ${name}: ${e.message.split('\n')[0]}`); } };
  const step = async (name, fn) => { try { await fn(); } catch (e) { issues.push(`STEP ${name}: ${e.message.split('\n')[0]}`); } };
  const go = async (label) => { await p.locator('.hero-command').click(); await p.locator('.section-command-dialog button', { hasText: label }).first().click(); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0, 0)); };
  await p.goto(URL); await p.waitForTimeout(900);
  await shot('desktop-patients-empty');
  await step('settings', async () => {
    await p.getByRole('button', { name: 'Settings' }).first().click();
    await p.fill('#cs-name', 'Yenepoya Medical College Hospital'); await p.fill('#cs-dept', 'Department of Audiology and Speech-Language Pathology');
    await p.fill('#cs-addr', 'Deralakatte, Mangaluru 575018'); await p.fill('#cs-phone', '+91 824 220 4668');
    await p.locator('.cs-card').first().locator('input[type=file]').setInputFiles(path.join(APP, 'logo.png'));
    await p.getByRole('button', { name: 'Add clinician' }).click();
    await p.fill('#cs-c-name', 'Mr. Hemaraja Nayaka S'); await p.fill('#cs-c-qual', 'M.Sc. (SLP)'); await p.fill('#cs-c-des', 'Associate Professor'); await p.fill('#cs-c-rci', 'A30294');
    await p.locator('.cs-form input[type=file]').setInputFiles(path.join(APP, 'sig.png')); await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Save clinician' }).click();
    await p.getByRole('button', { name: 'Load demo patients' }).click(); await p.waitForTimeout(400);
    await p.evaluate(() => scrollTo(0, 0));
  });
  await shot('desktop-settings', { full: true }); await el('el-settings-clinic', '#cs-inst >> xpath=..'); await el('el-settings-print', '#cs-print >> xpath=..'); await el('el-settings-data', '#cs-data >> xpath=..'); await p.evaluate(() => scrollTo(0, 0));
  await step('patients', async () => { await p.getByRole('button', { name: /^Patients/ }).first().click(); });
  await shot('desktop-patients');
  await step('add form', async () => { await p.getByRole('button', { name: 'Add patient', exact: true }).first().click(); await p.fill('#pm-name', 'Ravi Kumar'); await p.fill('#pm-hos', 'UHID-77'); await p.fill('#pm-study', 'DT-HNC-001'); await p.fill('#pm-age', '58'); });
  await shot('desktop-patient-add'); await el('el-patient-form', '.pm-form');
  await step('cancel add', async () => { await p.getByRole('button', { name: 'Cancel' }).click(); });
  // open first demo patient
  await step('open demo', async () => { await p.locator('.pm-row').first().getByRole('button', { name: /Open/ }).first().click(); await p.waitForTimeout(600); });
  for (const s of SECTIONS) { await step(s, async () => { await go(s); }); await shot('desktop-' + slug(s)); }
  await step('dashboard drawer', async () => { await go('Clinician Dashboard'); await p.locator('.deglutech-caseload-row').first().click(); await p.locator('.deglutech-patient-drawer').waitFor({ timeout: 4000 }); });
  await shot('desktop-dashboard-drawer');
  await step('close drawer', async () => { await p.keyboard.press('Escape'); await p.goto(URL); await p.waitForTimeout(800); });
  await step('section full', async () => { await go('Swallowing Assessment'); });
  await shot('desktop-section-full', { full: true }); await el('el-section-status', '.dt-section-status'); await el('el-block-index', '.dt-block-index'); await el('el-form-panel', '.dt-form-panel'); await el('el-sidebar', 'aside'); await el('el-pager', '.deglutech-section-pager'); await p.evaluate(() => scrollTo(0, 0));
  await step('command', async () => { await p.locator('.hero-command').click(); await p.locator('.section-command-dialog input').fill('swal'); });
  await shot('desktop-command');
  await step('close command', async () => { await p.keyboard.press('Escape'); });
  await step('tools', async () => { await p.locator('.hero-command').click(); await p.locator('.section-command-dialog input').fill('tool'); await p.locator('.section-command-dialog button', { hasText: 'Clinical tool suite' }).click(); await p.waitForTimeout(500); await p.evaluate(() => scrollTo(0, 0)); });
  await shot('desktop-tools');
  await step('eat10', async () => { await p.locator('.ts-card', { hasText: 'EAT-10' }).first().click(); await p.waitForTimeout(400); const radios = p.locator('[role=radio]'); const n = await radios.count(); for (let i = 0; i < 10; i++) { await p.locator(`#ts-eat-${i}`).locator('..').locator('[role=radio]').nth([2,3,1,2,1,0,3,2,2,3][i]).click().catch(() => {}); } });
  await shot('desktop-eat10');
  await step('eat10 report', async () => { await p.getByRole('button', { name: 'Report / PDF' }).click(); await p.waitForTimeout(600); });
  await shot('desktop-eat10-report');
  await step('eat10 handout', async () => { await p.getByRole('tab', { name: 'Patient handout' }).click().catch(async () => p.getByText('Patient handout').first().click()); await p.waitForTimeout(500); });
  await shot('desktop-eat10-handout');
  await step('close sheet', async () => { await p.keyboard.press('Escape'); await p.goto(URL); await p.waitForTimeout(800); });
  await step('exercise 3d', async () => { await go('Exercise Prescription'); await p.waitForTimeout(500); });
  await step('3d shot', async () => { const v = p.locator('.exvisual:visible').first(); await v.scrollIntoViewIfNeeded(); await p.waitForTimeout(5000); await v.screenshot({ path: path.join(OUT, 'desktop-exercise-3d.png') }); console.log('shot 3d'); });
  await step('report', async () => { await go('Summary and Report'); });
  await shot('desktop-report-full', { full: true }); await el('el-validation', '.dt-validation-panel'); await el('el-signoff', '.deglutech-signoff-panel'); await el('el-report-actions', '.report-workspace > *'); await p.evaluate(() => scrollTo(0, 0));
  await step('report export', async () => { const [pop] = await Promise.all([p.waitForEvent('popup', { timeout: 8000 }), p.locator('#export-diagnostic-report').click()]); await pop.waitForLoadState(); await pop.setViewportSize({ width: 1100, height: 1400 }); await pop.waitForTimeout(800); await pop.screenshot({ path: path.join(OUT, 'desktop-report-export.png') }); await pop.close(); console.log('shot desktop-report-export'); });
  // files
  await step('files', async () => { await p.getByRole('button', { name: /Files and reports/ }).first().click(); await p.locator('.pf input[type=file]').first().setInputFiles(path.join(APP, 'sample-discharge.pdf')); await p.getByRole('heading', { name: /Values found/ }).waitFor({ timeout: 60000 }); await p.evaluate(() => scrollTo(0, 0)); });
  await shot('desktop-files-review', { full: true }); await el('el-review', '.pf-review'); await el('el-drop', '.pf-drop');
  await step('files apply', async () => { const tick = async () => { const btn = p.getByRole('button', { name: /ticked value/ }); if (await btn.isDisabled()) { await p.locator('.pf-row input[type=checkbox]:not(:disabled)').first().check(); } await btn.click(); }; await tick(); await p.locator('.pf input[type=file]').first().setInputFiles(path.join(APP, 'sample-vfss-photo.jpg')); await p.getByRole('heading', { name: /Values found/ }).waitFor({ timeout: 180000 }); await p.screenshot({ path: path.join(OUT, 'desktop-files-ocr.png'), fullPage: true }); await el('el-review-ocr', '.pf-review'); await tick(); await p.waitForTimeout(400); await p.evaluate(() => scrollTo(0, 0)); });
  await shot('desktop-files-list'); await el('el-file-list', '.pf-list');
  await step('viewer', async () => { await p.getByRole('button', { name: 'View' }).nth(1).click(); await p.locator('.pf-viewer').waitFor(); });
  await shot('desktop-files-viewer', { wait: 900 });
  await step('close viewer', async () => { await p.locator('.pf-viewer').getByRole('button', { name: 'Close' }).click(); });
  await step('inline', async () => { await go('Oncology and Staging'); await p.locator('.pf-inline summary').first().click(); await p.locator('.pf-inline').first().scrollIntoViewIfNeeded(); });
  await shot('desktop-section-inline-files'); await el('el-inline', '.pf-inline');
  await step('release', async () => { await go('Exercise Prescription'); }); await el('el-release', '.dt-release-panel'); await el('el-regimen', '.dt-regimen-panel');
  await step('drawer2', async () => { await go('Clinician Dashboard'); }); await el('el-kpi', '.deglutech-kpi-strip'); await el('el-caseload', '.deglutech-caseload-table');
  // ---- phone
  const ph = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const state = await ctx.storageState(); await ph.addInitScript(s => { if (!sessionStorage.__seeded) { for (const [k, v] of s) localStorage.setItem(k, v); sessionStorage.__seeded = 1; } }, state.origins.find(o => o.origin.includes('4174'))?.localStorage.map(x => [x.name, x.value]) ?? []);
  const q = await ph.newPage(); q.on('pageerror', e => errs.push('phone ' + e.message));
  const pcheck = async (name) => { const r = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth })); if (r.sw > r.w + 1) issues.push(`phone ${name}: ${r.sw}px > ${r.w}px`); };
  const pshot = async (name, full) => { await q.waitForTimeout(500); await pcheck(name); await q.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full }); console.log('shot', name); };
  const pgo = async (label) => { await q.locator('.mobile-section-select select').selectOption({ label }); await q.waitForTimeout(500); await q.evaluate(() => scrollTo(0, 0)); };
  await q.goto(URL); await q.waitForTimeout(900);
  await pshot('phone-home');
  await step('phone patients', async () => { await q.locator('.mobile-section-select select').selectOption('__patients'); await q.waitForTimeout(500); }); await pshot('phone-patients');
  for (const s of [ '2. Demographics and Referral', '6. Swallowing Assessment', 'Clinical tool suite', '11. Exercise Prescription', '12. Patient Portal', '13. Summary and Report', 'Files and reports', 'Settings']) { await step('phone ' + s, async () => { await pgo(s); }); await pshot('phone-' + slug(s.replace(/^\d+\.\s*/, '').replace(/\s*\(\d+\)/, ''))); }
  await step('phone swallow scroll', async () => { await pgo('6. Swallowing Assessment'); await q.locator('.dt-form-panel').first().scrollIntoViewIfNeeded(); });
  await pshot('phone-section-form');
  // full-page overflow check for every section on phone
  for (const s of SECTIONS) { await step('pchk ' + s, async () => { const opt = (await q.locator('.mobile-section-select option').allInnerTexts()).find(t => t.endsWith(s)); await pgo(opt); await pcheck(s); }); }
  console.log('ISSUES', JSON.stringify(issues, null, 1)); console.log('ERRORS', errs.slice(0, 6));
  await b.close();
})();
