import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Gauge } from 'lucide-react';
import { motionSpecFor, samplePose, phaseKeyTime, type Pose, type MotionSpec, type Muscle } from '../exerciseMotion';

// Schematic, parametric SVG exercise illustrations. No text is drawn inside the
// artwork; captions and steps come from the localised exercise content.

type Pt = [number, number];
const n1 = (v: number) => v.toFixed(1);
const rot = (p: Pt, c: Pt, deg: number): Pt => {
  const r = (deg * Math.PI) / 180, dx = p[0] - c[0], dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(r) - dy * Math.sin(r), c[1] + dx * Math.sin(r) + dy * Math.cos(r)];
};
const mix = (a: Pt, b: Pt, u: number): Pt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
function spline(pts: Pt[], closed: boolean): string {
  const n = pts.length, at = (i: number) => pts[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M${n1(pts[0][0])} ${n1(pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i += 1) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C${n1(p1[0] + (p2[0] - p0[0]) / 6)} ${n1(p1[1] + (p2[1] - p0[1]) / 6)} ${n1(p2[0] - (p3[0] - p1[0]) / 6)} ${n1(p2[1] - (p3[1] - p1[1]) / 6)} ${n1(p2[0])} ${n1(p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}

const C = {
  bg: '#eef5f6', skin: '#b07a55', skinShade: '#8f5f42', hair: '#2a2523', shirt: '#2f6f78',
  tissue: '#efc6b6', tissueLine: '#d39a88', tongue: '#cf6a6a', tongueLine: '#a3474c', air: '#fbf8f5', nasal: '#f6ece6',
  bone: '#f4efe4', boneLine: '#b8ab95', cart: '#e9eff2', cartLine: '#7d95a3', epi: '#f2e2b2', teeth: '#ffffff',
  teethLine: '#c9c1b3', muscle: '#df9e8d', accent: '#0f8ea8', mouth: '#4a1c22', lip: '#8f4f44', bolus: '#e2ae2f',
  flow: '#2f8fb3', device: '#e8d6ae', deviceLine: '#a98e5d', steel: '#6f8a99', mat: '#cfdde2',
};

type ViewProps = { pose: Pose; spec: MotionSpec; time: number; glow: (m: Muscle) => number };

function Flow({ pts, opacity, time, arrow = true }: { pts: Pt[]; opacity: number; time: number; arrow?: boolean }) {
  if (opacity < 0.03) return null;
  const end = pts[pts.length - 1], prev = pts[pts.length - 2];
  const ang = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const head: Pt[] = [end, [end[0] - 9 * Math.cos(ang - 0.45), end[1] - 9 * Math.sin(ang - 0.45)], [end[0] - 9 * Math.cos(ang + 0.45), end[1] - 9 * Math.sin(ang + 0.45)]];
  return <g opacity={opacity}><path d={spline(pts, false)} fill="none" stroke={C.flow} strokeWidth={3} strokeLinecap="round" strokeDasharray="7 6" strokeDashoffset={-time * 40} />
    {arrow && <path d={`M${head.map(p => `${n1(p[0])} ${n1(p[1])}`).join(' L')}Z`} fill={C.flow} />}</g>;
}
function Sound({ at, opacity }: { at: Pt; opacity: number }) {
  if (opacity < 0.03) return null;
  return <g opacity={opacity} fill="none" stroke={C.flow} strokeWidth={3} strokeLinecap="round">
    {[0, 1, 2].map(i => <path key={i} d={`M${at[0] - 8 - i * 9} ${at[1] - 9 - i * 5} Q${at[0] - 15 - i * 11} ${at[1]} ${at[0] - 8 - i * 9} ${at[1] + 9 + i * 5}`} />)}</g>;
}

/* ---------------- Mid-sagittal cutaway (anterior to the left) ---------------- */
function SagittalView({ pose, spec, time, glow }: ViewProps) {
  const TMJ: Pt = [240, 150];
  const jawDeg = -pose.jawOpen * 20, jawShift = pose.jawProtrude * 8;
  const mand = (p: Pt): Pt => { const r = rot(p, TMJ, jawDeg); return [r[0] - jawShift, r[1]]; };
  const lift = pose.hyoidLift, s = pose.swallow;
  const H: Pt = [192 - 12 * lift, 282 - 26 * lift];
  const uesY = H[1] + 74;
  const squeeze = s * 0.8 + (spec.muscles.includes('constrictors') ? s * 0.4 : 0);

  const silhouette = spline([[150, 30], [126, 52], [118, 90], [118, 118], [96, 150], [93, 160], [101, 166], [102, 172], [97, 186], [99, 198],
    mand([103, 203]), mand([99, 212]), mand([104, 224]), mand([110, 234]), mand([106, 246]), mand([110, 262]), mand([135, 274]), mand([175, 276]), mand([205, 268]),
    [200, 300], [205, 400]], false) + ' L312 400 L312 300 C318 236 344 150 322 92 C302 44 226 24 150 30Z';
  const lumen = spline([[101, 199], [112, 196], [118, 182], [140, 172], [170, 167], [205, 167], [222, 150], [250, 140], [254, 170], [256 - 16 * squeeze, 232],
    [257, 300], [252, uesY], [240, uesY], [232, H[1] + 40], [228, H[1] + 10], [212, H[1] - 10], mand([190, 240]), mand([150, 236]), mand([124, 226]), mand([108, 212]), mand([104, 204])], true);

  // Tongue control points in mandible coordinates, then deformed by the pose.
  const p = pose.tongueProtrude, u = pose.tongueTipUp, pr = pose.tonguePress, v = pose.tongueBackUp, r = clamp01(pose.tongueRetract + s * 0.35);
  const tip: Pt = [124 - 46 * p + 6 * u + 14 * r, 203 + 2 * p - 24 * u];
  const blade: Pt = [138 - 30 * p + 10 * r, 192 - 10 * u - 12 * pr];
  const dorsum: Pt = [172 - 14 * p, 182 - 14 * pr - 6 * v];
  const back: Pt = [210 - 10 * p + 4 * v + 10 * r, 190 - 12 * pr - 28 * v];
  const base: Pt = [226 - 12 * p + 20 * r, 222];
  const root: Pt = [218 - 6 * p + 12 * r, 256];
  const tonguePts = [tip, blade, dorsum, back, base, root, [190, 258] as Pt, [150, 250] as Pt, [128, 230] as Pt].map(mand);
  const tonguePath = spline(tonguePts, true);

  const velumTip = mix([232, 200], [247, 170], pose.velumLift), velumCtrl = mix([226, 172], [234, 160], pose.velumLift);
  const E0: Pt = [H[0] + 20, H[1] + 6];
  const epiTip = rot([H[0] + 30, H[1] - 40], E0, 105 * s), epiCtrl = rot([H[0] + 18, H[1] - 22], E0, 105 * s);
  const genial = mand([122, 246]);
  const uesOpen = clamp01(Math.max(0, lift) * 0.75 + s * 0.35);
  const thyroid: Pt[] = [[H[0] - 4, H[1] + 12], [H[0] + 26, H[1] + 10], [H[0] + 30, H[1] + 56], [H[0] + 2, H[1] + 62]];
  const foldY = H[1] + 44, gl = pose.glottisClose;
  const B: Pt[] = [[165, 182], [215, 186], [245, 215], [250, 265], [248, uesY - 6], [250, uesY + 20], [250, 392]];
  let bolusAt: Pt | null = null;
  if (spec.bolus && pose.bolus > 0.001 && pose.bolus < 0.999) {
    const t = pose.bolus < 0.12 ? 0 : (pose.bolus - 0.12) / 0.88, seg = Math.min(B.length - 2, Math.floor(t * (B.length - 1)));
    bolusAt = mix(B[seg], B[seg + 1], t * (B.length - 1) - seg);
  }
  return <svg viewBox="0 0 400 400" role="img" aria-hidden="true" className="exanim-svg">
    <rect width="400" height="400" rx="14" fill={C.bg} />
    <path d={silhouette} fill={C.tissue} stroke={C.tissueLine} strokeWidth="1.5" />
    {[158, 192, 226, 260, 294, 328, 362].map(y => <rect key={y} x="268" y={y} width="32" height="26" rx="5" fill={C.bone} stroke={C.boneLine} strokeWidth="1" />)}
    <path d="M112 162 Q160 148 215 148 L250 128 L252 140 Q228 150 205 164 Q160 162 118 177Z" fill={C.nasal} />
    <path d={lumen} fill={C.air} />
    <path d="M116 180 Q160 165 205 165" fill="none" stroke={C.boneLine} strokeWidth="5" strokeLinecap="round" />
    <path d={`M252 140 Q256 200 ${n1(256 - 16 * squeeze)} 232 Q258 280 254 330`} fill="none" stroke={C.muscle} strokeWidth="8" strokeLinecap="round" />
    {glow('constrictors') > 0 && <path d={`M252 140 Q256 200 ${n1(256 - 16 * squeeze)} 232 Q258 280 254 330`} fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round" opacity={glow('constrictors')} />}
    {/* oesophagus with upper oesophageal sphincter */}
    <path d={`M${n1(H[0] + 34)} ${n1(uesY)} L${n1(H[0] + 34)} 400 L262 400 L258 ${n1(uesY)}Z`} fill={C.tissue} />
    <path d={`M${n1(H[0] + 46 - 4 * uesOpen)} ${n1(uesY)} Q${n1(H[0] + 46)} ${n1(uesY + 30)} ${n1(H[0] + 46)} 400 M${n1(H[0] + 50 + 4 * uesOpen)} ${n1(uesY)} Q${n1(H[0] + 50)} ${n1(uesY + 30)} ${n1(H[0] + 50)} 400`} fill="none" stroke={C.tissueLine} strokeWidth="1.5" />
    <path d={`M${n1(H[0] + 36)} ${n1(uesY + 6)} L${n1(H[0] + 44 - 6 * uesOpen)} ${n1(uesY + 6)} M${n1(H[0] + 52 + 6 * uesOpen)} ${n1(uesY + 6)} L258 ${n1(uesY + 6)}`} stroke={glow('ues') > 0 ? C.accent : C.muscle} strokeOpacity={glow('ues') > 0 ? glow('ues') : 1} strokeWidth="6" strokeLinecap="round" />
    {/* trachea */}
    <path d={`M${n1(H[0] + 2)} ${n1(H[1] + 66)} L${n1(H[0] + 2)} 400 L${n1(H[0] + 30)} 400 L${n1(H[0] + 30)} ${n1(H[1] + 66)}Z`} fill={C.air} stroke={C.cartLine} strokeWidth="1.5" />
    {[0, 1, 2, 3].map(i => <line key={i} x1={H[0] + 2} x2={H[0] + 30} y1={H[1] + 82 + i * 14} y2={H[1] + 82 + i * 14} stroke={C.cartLine} strokeWidth="3" opacity="0.5" />)}
    {/* velum */}
    <path d={`M205 166 Q${n1(velumCtrl[0])} ${n1(velumCtrl[1])} ${n1(velumTip[0])} ${n1(velumTip[1])}`} fill="none" stroke={C.muscle} strokeWidth="11" strokeLinecap="round" />
    {glow('velum') > 0 && <path d={`M205 166 Q${n1(velumCtrl[0])} ${n1(velumCtrl[1])} ${n1(velumTip[0])} ${n1(velumTip[1])}`} fill="none" stroke={C.accent} strokeWidth="11" strokeLinecap="round" opacity={glow('velum')} />}
    {/* suprahyoid band */}
    <path d={`M${n1(genial[0])} ${n1(genial[1])} Q${n1((genial[0] + H[0]) / 2)} ${n1(Math.max(genial[1], H[1]) + 8)} ${n1(H[0])} ${n1(H[1])}`} fill="none" stroke={glow('suprahyoid') > 0 ? C.accent : C.muscle} strokeOpacity={glow('suprahyoid') > 0 ? glow('suprahyoid') : 0.9} strokeWidth="7" strokeLinecap="round" />
    {/* tongue */}
    <path d={tonguePath} fill={C.tongue} stroke={C.tongueLine} strokeWidth="1.5" />
    {glow('tongue') > 0 && <path d={tonguePath} fill={C.accent} opacity={glow('tongue') * 0.42} />}
    {glow('tongueBase') > 0 && <path d={spline([tonguePts[3], tonguePts[4], tonguePts[5]], false)} fill="none" stroke={C.accent} strokeWidth="7" strokeLinecap="round" opacity={glow('tongueBase')} />}
    {/* epiglottis, hyoid, larynx */}
    <path d={`M${n1(E0[0])} ${n1(E0[1])} Q${n1(epiCtrl[0])} ${n1(epiCtrl[1])} ${n1(epiTip[0])} ${n1(epiTip[1])}`} fill="none" stroke={C.epi} strokeWidth="6" strokeLinecap="round" />
    <path d={`M${n1(E0[0])} ${n1(E0[1])} Q${n1(epiCtrl[0])} ${n1(epiCtrl[1])} ${n1(epiTip[0])} ${n1(epiTip[1])}`} fill="none" stroke={C.boneLine} strokeWidth="1" />
    <ellipse cx={H[0]} cy={H[1]} rx="9" ry="5" fill={C.bone} stroke={C.boneLine} strokeWidth="1.5" />
    <path d={spline(thyroid, true)} fill={C.cart} stroke={C.cartLine} strokeWidth="1.5" opacity="0.95" />
    {glow('larynx') > 0 && <path d={spline(thyroid, true)} fill={C.accent} opacity={glow('larynx') * 0.45} />}
    <path d={`M${n1(H[0] + 10)} ${n1(H[1] + 16)} L${n1(H[0] + 24)} ${n1(H[1] + 14)} L${n1(H[0] + 25)} ${n1(foldY)} L${n1(H[0] + 11)} ${n1(foldY)}Z`} fill={C.air} />
    <path d={`M${n1(H[0] + 6)} ${n1(foldY)} L${n1(H[0] + 27)} ${n1(foldY - 3 * (1 - gl))} M${n1(H[0] + 6)} ${n1(foldY + 1)} L${n1(H[0] + 27)} ${n1(foldY + 1 + 3 * (1 - gl))}`} stroke={glow('glottis') > 0 ? C.accent : C.tongueLine} strokeOpacity={glow('glottis') > 0 ? Math.max(0.5, glow('glottis')) : 1} strokeWidth={2 + 2 * gl} strokeLinecap="round" />
    <ellipse cx={H[0] + 16} cy={H[1] + 68} rx="16" ry="4" fill="none" stroke={C.cartLine} strokeWidth="2" />
    {/* teeth, mandible, lips */}
    <path d="M108 178 L116 178 L114 198 L107 197Z" fill={C.teeth} stroke={C.teethLine} strokeWidth="1" />
    <path d={`M${[mand([109, 201]), mand([116, 201]), mand([120, 222]), mand([112, 224])].map(q => `${n1(q[0])} ${n1(q[1])}`).join(' L')}Z`} fill={C.teeth} stroke={C.teethLine} strokeWidth="1" />
    <path d={spline([mand([112, 230]), mand([112, 252]), mand([130, 264]), mand([175, 266]), mand([220, 248]), mand([236, 200]), [240, 155]], false)} fill="none" stroke={C.boneLine} strokeWidth="4" strokeLinecap="round" opacity="0.8" />
    {glow('lips') > 0 && <g fill="none" stroke={C.accent} strokeWidth="5" strokeLinecap="round" opacity={glow('lips')}><path d="M101 172 Q96 186 99 198" /><path d={spline([mand([103, 203]), mand([99, 212]), mand([104, 224])], false)} /></g>}
    {bolusAt && <ellipse cx={bolusAt[0]} cy={bolusAt[1]} rx="8" ry="6" fill={C.bolus} stroke="#b88a1c" strokeWidth="1" />}
    {spec.sound
      ? <Sound at={[92, 205]} opacity={pose.airOut} />
      : <Flow pts={[[H[0] + 16, foldY], [242, 250], [236, 205], [190, 192], [120, 200], [70, 204]]} opacity={pose.airOut} time={time} />}
  </svg>;
}

/* ---------------- External side view (face to the left) ---------------- */
function ProfileView({ pose, spec, time, glow }: ViewProps) {
  const supine = spec.posture === 'supine';
  const TMJ: Pt = [248, 200];
  const jawDeg = -pose.jawOpen * 16, jx = -pose.jawProtrude * 8;
  const lowerTip = ((q: Pt): Pt => [q[0] + jx, q[1]])(rot([146, 218], TMJ, jawDeg));
  const flex = pose.headFlex, lift = pose.hyoidLift;
  const ballSquash = clamp01((flex - 0.15) / 0.4);
  const p = pose.tongueProtrude;
  const tipX = 150 - Math.max(0, p - 0.42) * 72;
  const device = spec.device;
  return <svg viewBox="0 0 400 400" role="img" aria-hidden="true" className="exanim-svg">
    <rect width="400" height="400" rx="14" fill={C.bg} />
    {supine && <rect x="0" y="328" width="400" height="16" fill={C.mat} />}
    <g transform={supine ? 'rotate(90 200 200)' : undefined}>
      <g transform={`translate(220 400) scale(${n1(1 + 0.05 * pose.chest)}) translate(-220 -400)`}>
        <path d="M118 400 L126 348 Q138 324 182 318 L286 316 Q318 320 324 346 L326 400Z" fill={C.shirt} />
        {glow('respiratory') > 0 && <ellipse cx="210" cy="370" rx="64" ry="28" fill={C.accent} opacity={glow('respiratory') * 0.5} />}
      </g>
      <path d="M172 266 L182 322 L292 320 L284 228Z" fill={C.skin} />
      <path d={`M182 ${n1(300 - 14 * lift)} Q176 ${n1(292 - 14 * lift)} 180 ${n1(284 - 14 * lift)}`} fill="none" stroke={C.skinShade} strokeWidth="2.5" strokeLinecap="round" />
      {glow('neck') > 0 && <path d="M262 206 Q226 262 188 320" fill="none" stroke={C.accent} strokeWidth="9" strokeLinecap="round" opacity={glow('neck')} />}
      {glow('suprahyoid') > 0 && <path d={`M170 ${n1(274 + 4 * flex)} Q184 ${n1(286 - 6 * lift)} 196 ${n1(292 - 14 * lift)}`} fill="none" stroke={C.accent} strokeWidth="8" strokeLinecap="round" opacity={glow('suprahyoid')} />}
      {device === 'ball' && <ellipse cx="172" cy={n1(302 + 4 * ballSquash)} rx={n1(17 + 4 * ballSquash)} ry={n1(17 - 6 * ballSquash)} fill="#e9b44c" stroke="#b9852a" strokeWidth="1.5" />}
      <g transform={`rotate(${n1(-flex * 30)} 252 262)`}>
        <ellipse cx="152" cy={n1(216 + 10 * pose.jawOpen)} rx="13" ry={n1(4 + 16 * pose.jawOpen)} fill={C.mouth} />
        <path d="M286 232 C326 196 326 92 252 64 C196 44 150 74 146 118 L144 134 Q146 142 150 148 L124 182 Q120 190 130 193 Q138 196 140 202 Q136 208 140 214 L158 216 L250 214Z" fill={C.skin} />
        <path d="M150 100 C150 60 200 46 252 58 C310 70 330 120 316 190 L300 196 C304 150 296 110 268 98 C230 84 190 92 150 100Z" fill={C.hair} />
        <ellipse cx="268" cy="170" rx="11" ry="19" fill={C.skin} stroke={C.skinShade} strokeWidth="2" />
        <ellipse cx="176" cy="140" rx="6" ry="3" fill="#2b2220" />
        <path d="M164 127 Q176 121 190 126" fill="none" stroke={C.hair} strokeWidth="3" strokeLinecap="round" />
        {glow('jawMuscles') > 0 && <ellipse cx="226" cy={n1(226 + 4 * pose.jawOpen)} rx="13" ry={n1(24 + 8 * pose.jawOpen)} transform="rotate(-15 226 226)" fill={C.accent} opacity={glow('jawMuscles') * 0.6} />}
        <g transform={`translate(${n1(jx)} 0) rotate(${n1(jawDeg)} ${TMJ[0]} ${TMJ[1]})`}>
          {p > 0.42 && <path d={`M160 216 C${n1(tipX + 10)} 211 ${n1(tipX - 2)} 214 ${n1(tipX)} 220 C${n1(tipX - 1)} 226 ${n1(tipX + 12)} 229 160 227Z`} fill={C.tongue} stroke={C.tongueLine} strokeWidth="1" />}
          {glow('tongue') > 0 && p > 0.42 && <path d={`M160 216 C${n1(tipX + 10)} 211 ${n1(tipX - 2)} 214 ${n1(tipX)} 220 C${n1(tipX - 1)} 226 ${n1(tipX + 12)} 229 160 227Z`} fill={C.accent} opacity={glow('tongue') * 0.5} />}
          <path d="M158 215 L141 216 Q137 222 141 228 Q146 232 150 234 Q144 244 146 254 Q150 270 170 274 L232 258 L250 212Z" fill={C.skin} />
          {pose.jawOpen > 0.15 && <rect x="143" y="217" width="7" height="5" fill={C.teeth} />}
          {glow('lips') > 0 && <path d="M141 216 Q137 222 141 228" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" opacity={glow('lips')} />}
        </g>
        {pose.jawOpen > 0.15 && <rect x="142" y="212" width="8" height="5" fill={C.teeth} />}
        {glow('lips') > 0 && <path d="M140 202 Q136 208 140 214" fill="none" stroke={C.accent} strokeWidth="4" strokeLinecap="round" opacity={glow('lips')} />}
        {device === 'stack' && <g>{Array.from({ length: Math.max(1, Math.round((lowerTip[1] - 214) / 3.2)) }, (_, i) => <rect key={i} x="108" y={n1(214 + i * 3.2)} width="48" height="3" fill={C.device} stroke={C.deviceLine} strokeWidth="0.6" />)}</g>}
        {device === 'jawDevice' && <g stroke={C.steel} strokeWidth="5" strokeLinecap="round" fill="none"><path d="M98 205 L154 213" /><path d={`M98 214 L${n1(lowerTip[0] + 6)} ${n1(lowerTip[1])}`} /><circle cx="96" cy="210" r="6" fill={C.steel} /></g>}
        {device === 'emst' && <g><rect x="130" y="176" width="10" height="9" rx="2" fill={C.steel} /><rect x="86" y="211" width="58" height="11" rx="4" fill="#9fb7c2" stroke={C.steel} /><rect x="60" y="202" width="30" height="29" rx="5" fill="#c8d6dc" stroke={C.steel} /></g>}
      </g>
      {device === 'depressor' && <rect x="118" y="194" width="5" height="58" rx="2" fill={C.device} stroke={C.deviceLine} strokeWidth="1" />}
    </g>
    {!supine && (spec.sound
      ? <Sound at={[128, 220]} opacity={pose.airOut} />
      : <Flow pts={device === 'emst' ? [[58, 216], [34, 216], [12, 218]] : [[132, 220], [104, 222], [78, 224]]} opacity={pose.airOut} time={time} />)}
  </svg>;
}

/* ---------------- External front view ---------------- */
function FrontView({ pose, time, glow }: ViewProps) {
  const tx = pose.headTurn * 20, sh = -14 * pose.shrug, lift = pose.hyoidLift;
  const mx = 200 + tx * 1.1 + pose.jawLateral * 10, my = 212 + 9 * pose.jawOpen;
  const w = 44 * (1 + 0.35 * pose.spread - 0.45 * pose.pucker);
  const h = 2 + 30 * pose.jawOpen * (1 - 0.3 * pose.pucker);
  const lipT = 4 + 3 * pose.pucker - 2 * pose.lipPress;
  const upper = `M${n1(mx - w / 2)} ${n1(my)} Q${n1(mx - w / 4)} ${n1(my - h / 2 - lipT - 3)} ${n1(mx)} ${n1(my - h / 2 - lipT + 1)} Q${n1(mx + w / 4)} ${n1(my - h / 2 - lipT - 3)} ${n1(mx + w / 2)} ${n1(my)} Q${n1(mx)} ${n1(my - h)} ${n1(mx - w / 2)} ${n1(my)}Z`;
  const lower = `M${n1(mx - w / 2)} ${n1(my)} Q${n1(mx)} ${n1(my + h)} ${n1(mx + w / 2)} ${n1(my)} Q${n1(mx)} ${n1(my + h + 2 * lipT + 2)} ${n1(mx - w / 2)} ${n1(my)}Z`;
  const showTongue = pose.jawOpen > 0.2;
  const tongueX = mx + pose.tongueLateral * w * (0.3 + 0.25 * pose.tongueProtrude);
  void time;
  return <svg viewBox="0 0 400 400" role="img" aria-hidden="true" className="exanim-svg">
    <rect width="400" height="400" rx="14" fill={C.bg} />
    <path d={`M56 400 L64 338 Q76 ${n1(300 + sh)} 136 ${n1(296 + sh)} L174 290 L226 290 L264 ${n1(296 + sh)} Q324 ${n1(300 + sh)} 336 338 L344 400Z`} fill={C.shirt} />
    {glow('shoulder') > 0 && <g fill="none" stroke={C.accent} strokeWidth="9" strokeLinecap="round" opacity={glow('shoulder')}><path d={`M180 262 Q150 ${n1(282 + sh)} 118 ${n1(300 + sh)}`} /><path d={`M220 262 Q250 ${n1(282 + sh)} 282 ${n1(300 + sh)}`} /></g>}
    <rect x="172" y="236" width="56" height="64" fill={C.skin} />
    <path d={`M194 ${n1(270 - 12 * lift)} Q200 ${n1(263 - 12 * lift)} 206 ${n1(270 - 12 * lift)}`} fill="none" stroke={C.skinShade} strokeWidth="2.5" strokeLinecap="round" />
    {glow('neck') > 0 && <g fill="none" stroke={C.accent} strokeWidth="7" strokeLinecap="round" opacity={glow('neck')}><path d="M168 226 L196 298" /><path d="M232 226 L204 298" /></g>}
    <g transform={`rotate(${n1(pose.headTilt * 16)} 200 258)`}>
      <ellipse cx={n1(128 + tx * 0.5)} cy="160" rx={n1(Math.max(2, 9 * (1 + 0.5 * pose.headTurn)))} ry="19" fill={C.skin} stroke={C.skinShade} strokeWidth="2" />
      <ellipse cx={n1(272 + tx * 0.5)} cy="160" rx={n1(Math.max(2, 9 * (1 - 0.5 * pose.headTurn)))} ry="19" fill={C.skin} stroke={C.skinShade} strokeWidth="2" />
      <ellipse cx={n1(200 + tx * 0.25)} cy={n1(150 + 5 * pose.jawOpen)} rx={n1(72 + 6 * pose.cheekPuff - 6 * Math.abs(pose.headTurn))} ry={n1(90 + 6 * pose.jawOpen)} fill={C.skin} />
      <path d={`M${n1(128 + tx * 0.3)} 140 C${n1(124 + tx * 0.3)} 80 ${n1(160 + tx * 0.3)} 52 ${n1(200 + tx * 0.3)} 52 C${n1(240 + tx * 0.3)} 52 ${n1(276 + tx * 0.3)} 80 ${n1(272 + tx * 0.3)} 140 C${n1(262 + tx * 0.3)} 108 ${n1(236 + tx * 0.3)} 90 ${n1(200 + tx * 0.3)} 90 C${n1(164 + tx * 0.3)} 90 ${n1(138 + tx * 0.3)} 108 ${n1(128 + tx * 0.3)} 140Z`} fill={C.hair} />
      {[176, 224].map(x => <g key={x}><ellipse cx={n1(x + tx)} cy="140" rx="8" ry="4" fill="#fff" /><circle cx={n1(x + tx)} cy="140" r="3" fill="#2b2220" /><path d={`M${n1(x - 11 + tx)} 128 Q${n1(x + tx)} 122 ${n1(x + 11 + tx)} 128`} fill="none" stroke={C.hair} strokeWidth="3" strokeLinecap="round" /></g>)}
      <path d={`M${n1(200 + tx * 1.1)} 146 L${n1(195 + tx * 1.25)} 180 Q${n1(200 + tx * 1.25)} 186 ${n1(207 + tx * 1.25)} 181`} fill="none" stroke={C.skinShade} strokeWidth="2.5" strokeLinecap="round" />
      {pose.cheekPuff > 0.02 && [158, 242].map(x => <ellipse key={x} cx={n1(x + tx)} cy="198" rx={n1(17 * pose.cheekPuff)} ry={n1(14 * pose.cheekPuff)} fill="#bd8962" stroke={C.skinShade} strokeWidth="1" opacity="0.9" />)}
      {glow('jawMuscles') > 0 && [150, 250].map(x => <ellipse key={x} cx={n1(x + tx)} cy="202" rx="10" ry={n1(20 + 6 * pose.jawOpen)} fill={C.accent} opacity={glow('jawMuscles') * 0.6} />)}
      {h > 3 && <ellipse cx={n1(mx)} cy={n1(my)} rx={n1(w / 2)} ry={n1(h / 2)} fill={C.mouth} />}
      {pose.jawOpen > 0.12 && <rect x={n1(mx - w * 0.34)} y={n1(my - h / 2)} width={n1(w * 0.68)} height={n1(Math.min(6, h * 0.3))} fill={C.teeth} />}
      {showTongue && <ellipse cx={n1(tongueX)} cy={n1(my + h * 0.2 + pose.tongueProtrude * 6)} rx={n1(w * 0.26)} ry={n1(h * 0.26 + pose.tongueProtrude * 7)} fill={C.tongue} stroke={C.tongueLine} strokeWidth="1" />}
      {glow('tongue') > 0 && showTongue && <ellipse cx={n1(tongueX)} cy={n1(my + h * 0.2 + pose.tongueProtrude * 6)} rx={n1(w * 0.26)} ry={n1(h * 0.26 + pose.tongueProtrude * 7)} fill={C.accent} opacity={glow('tongue') * 0.5} />}
      <path d={upper} fill={C.lip} />
      <path d={lower} fill={C.lip} />
      {glow('lips') > 0 && <g fill="none" stroke={C.accent} strokeWidth="3" opacity={glow('lips')}><path d={upper} /><path d={lower} /></g>}
      <path d={`M${n1(mx - 14)} ${n1(my + 28 + 8 * pose.jawOpen)} Q${n1(mx)} ${n1(my + 34 + 8 * pose.jawOpen)} ${n1(mx + 14)} ${n1(my + 28 + 8 * pose.jawOpen)}`} fill="none" stroke={C.skinShade} strokeWidth="2" strokeLinecap="round" />
    </g>
  </svg>;
}

const VIEW_LABELS: Record<string, { side: string; front: string; inside: string }> = {
  en: { side: 'Side view', front: 'Front view', inside: 'Inside view' },
  kn: { side: 'ಪಕ್ಕದ ನೋಟ', front: 'ಮುಂಭಾಗದ ನೋಟ', inside: 'ಒಳಗಿನ ನೋಟ' },
  hi: { side: 'बगल से दृश्य', front: 'सामने से दृश्य', inside: 'अंदर का दृश्य' },
  ta: { side: 'பக்கவாட்டுப் பார்வை', front: 'முன்பக்கப் பார்வை', inside: 'உட்புறப் பார்வை' },
  te: { side: 'పక్క దృశ్యం', front: 'ముందు దృశ్యం', inside: 'లోపలి దృశ్యం' },
  ml: { side: 'വശക്കാഴ്ച', front: 'മുൻകാഴ്ച', inside: 'ഉൾക്കാഴ്ച' },
};

export function hasExerciseAnimation(id: string) { return !!motionSpecFor(id); }

export function ExerciseAnimation({ exerciseId, language = 'en', label }: { exerciseId: string; language?: string; label?: string }) {
  const spec = motionSpecFor(exerciseId);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [slow, setSlow] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const visible = useRef(true);
  const clock = useRef(0);

  useEffect(() => { clock.current = 0; setTime(0); setPlaying(!reduced); }, [exerciseId, reduced]);
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => { visible.current = entries.some(e => e.isIntersecting); });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0, last = performance.now(), lastPaint = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (visible.current && !document.hidden) {
        clock.current += dt * (slow ? 0.5 : 1);
        if (now - lastPaint > 33) { lastPaint = now; setTime(clock.current); }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, slow]);

  if (!spec) return null;
  const sample = samplePose(spec, time);
  const intensity = 0.35 + 0.65 * sample.pose.effort;
  const glow = (m: Muscle) => (spec.muscles.includes(m) ? intensity : 0);
  const labels = VIEW_LABELS[language] ?? VIEW_LABELS.en;
  const jump = (phase: 0 | 1 | 2) => { setPlaying(false); clock.current = phaseKeyTime(spec, phase); setTime(clock.current); };
  const props: ViewProps = { pose: sample.pose, spec, time, glow };
  const holdPct = sample.hold ? sample.hold.elapsed / sample.hold.total : 0;
  return <section className="exanim" ref={host} aria-label={`Animated illustration${label ? `: ${label}` : ''}`}>
    <div className="exanim-views">
      <figure><div className="exanim-frame">{spec.external === 'front' ? <FrontView {...props} /> : <ProfileView {...props} />}</div><figcaption>{spec.external === 'front' ? labels.front : labels.side}</figcaption></figure>
      <figure><div className="exanim-frame"><SagittalView {...props} />
        {sample.hold && <svg className="exanim-hold" viewBox="0 0 44 44" aria-label={`Hold ${Math.ceil(sample.hold.total - sample.hold.elapsed)} seconds`}>
          <circle cx="22" cy="22" r="18" fill="#ffffffd9" stroke="#d5e3e6" strokeWidth="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={C.accent} strokeWidth="4" strokeDasharray={`${n1(113.1 * holdPct)} 113.1`} transform="rotate(-90 22 22)" strokeLinecap="round" />
          <text x="22" y="27" textAnchor="middle" fontSize="14" fontWeight="700" fill="#17343c">{Math.ceil(sample.hold.total - sample.hold.elapsed)}</text>
        </svg>}
      </div><figcaption>{labels.inside}</figcaption></figure>
    </div>
    <div className="exanim-controls">
      <button type="button" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause animation' : 'Play animation'}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <button type="button" onClick={() => { clock.current = 0; setTime(0); }} aria-label="Restart animation"><RotateCcw size={16} /></button>
      <button type="button" onClick={() => setSlow(!slow)} aria-pressed={slow} aria-label="Slow motion"><Gauge size={16} />{slow ? '0.5×' : '1×'}</button>
      <div className="exanim-phases" role="group" aria-label="Show step">
        {([0, 1, 2] as const).map(ph => <button key={ph} type="button" aria-pressed={sample.phase === ph} onClick={() => jump(ph)} aria-label={`Show step ${ph + 1}`}>{ph + 1}</button>)}
      </div>
    </div>
    <p className="exanim-note">Schematic illustration · highlighted areas show the muscles being worked · awaiting clinician verification</p>
  </section>;
}
