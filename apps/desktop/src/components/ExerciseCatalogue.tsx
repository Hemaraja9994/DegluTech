import { useState } from 'react';
import manifest from '../../../../assets/exercises/exercises.json';
import { Search, BookOpen } from 'lucide-react';
import { ExerciseAnimation } from './ExerciseAnimation';

type Step = { cue: string; instruction: string };
export function ExerciseCatalogue() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(manifest.exercises[0]);
  const results = manifest.exercises.filter(e => (category === 'all' || e.category === category) && (e.name.en + ' ' + e.target).toLowerCase().includes(query.toLowerCase()));
  const steps = (selected.steps?.en ?? []) as Step[];
  return <details className="suite-catalogue"><summary><BookOpen size={18} /> Expanded exercise catalogue ({manifest.exercises.length}) with animations</summary>
    <div className="suite-toolbar"><label><Search size={16} /><input aria-label="Search exercise catalogue" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find an exercise" /></label>
      <select aria-label="Exercise category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All categories</option>{[...new Set(manifest.exercises.map(e => e.category))].map(c => <option key={c}>{c}</option>)}</select></div>
    <div className="suite-catalogue-layout"><div className="suite-catalogue-list">{results.map(e => <button key={e.id} type="button" aria-pressed={selected.id === e.id} onClick={() => setSelected(e)}>{e.name.en}</button>)}{!results.length && <p>No matching exercises.</p>}</div>
    <section><h3>{selected.name.en}</h3><p>{selected.target}</p>
      <ExerciseAnimation key={selected.id} exerciseId={selected.id} label={selected.name.en} />
      {steps.length > 0 && <ol className="suite-steps">{steps.map((s, i) => <li key={i}><strong>{s.cue}.</strong> {s.instruction}</li>)}</ol>}
      <p className="suite-review">Awaiting clinician and native-speaker SLP verification. Patient release unavailable from the catalogue.</p><p>{selected.evidenceNote}</p>{selected.coPrescribeWithPhysiotherapy && <strong>Co-prescribe with physiotherapy</strong>}</section></div>
  </details>;
}
