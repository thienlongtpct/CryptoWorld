import { useState, type ReactNode } from 'react';
import type { Frame } from './Player';

/** Stage building blocks shared by the animated topics. */
export function Party({ who, title, children }: { who: 'alice' | 'bob'; title: ReactNode; children?: ReactNode }) {
  return <div className={`st-party ${who}`}><h4><span className={`dot ${who === 'alice' ? 'da' : 'db'}`} />{title}</h4>{children}</div>;
}
export function Wire({ title = 'Public wire', children }: { title?: ReactNode; children?: ReactNode }) {
  return <div className="st-wire"><h4>{title}</h4>{children}</div>;
}
export function SMsg({ dir, children, fresh }: { dir: ReactNode; children: ReactNode; fresh?: boolean }) {
  return <div className={`st-msg ${fresh ? 'new' : ''}`}><span className="dir">{dir}</span><span>{children}</span></div>;
}
/** Highlight a value that changed in this step. */
export const Hl = ({ on, children }: { on: boolean; children: ReactNode }) => <span className={on ? 'st-hl' : ''}>{children}</span>;
export const Go = ({ onClick, children = 'Go' }: { onClick: () => void; children?: ReactNode }) => <button type="button" className="go" onClick={onClick}>{children}</button>;

/** A form value that only takes effect on "Go", so the animation doesn't restart on every keystroke. */
export function useDraft<T>(init: T): [value: T, draft: T, setDraft: (v: T) => void, commit: () => void, set: (v: T) => void] {
  const [value, setValue] = useState(init);
  const [draft, setDraft] = useState(init);
  return [value, draft, setDraft, () => setValue(draft), (v: T) => { setValue(v); setDraft(v); }];
}

/** Build frames from a list of steps; `view(k)` renders the stage as it looks after step k. */
export function framesFrom(steps: { status: ReactNode; line?: number | number[] }[], view: (k: number) => ReactNode): Frame[] {
  return steps.map((s, k) => ({ ...s, stage: view(k) }));
}
