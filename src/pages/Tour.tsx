import { HashVis } from '../vis/topics/modern';
import { DiffieHellmanVis } from '../vis/topics/foundations';
import { PsiVis } from '../vis/topics/sets';
import { SunhacksMark } from '../components/SunhacksMark';
import { TourProvider, type TourStop } from '../vis/tour';

const TOTAL = 3;

export const TOUR_STOPS: TourStop[] = [
  {
    index: 1,
    total: TOTAL,
    title: 'One small change. A very different hash.',
    instruction: 'These two messages differ by one character. Press play, or open Inputs and flip one bit of A.',
    takeaway: 'A hash acts like a fingerprint of data; it does not encrypt the message.',
  },
  {
    index: 2,
    total: TOTAL,
    title: 'Agree on a secret in public.',
    instruction: 'Step through the exchange with the playback controls. Alice and Bob publish A and B, then each computes K.',
    takeaway: 'Alice and Bob derive the same shared secret without sending it.',
    aside: 'Authentication is needed to prevent an active attacker from impersonating either participant.',
  },
  {
    index: 3,
    total: TOTAL,
    title: 'Find what you have in common.',
    instruction: 'Alice’s interests are music, hiking, and chess. Bob’s are hiking, cooking, and chess. Press play. They share hiking and chess.',
    takeaway: 'PSI aims to reveal shared items while protecting nonmatching items, subject to the protocol’s stated leakage.',
    aside: 'This is a simplified toy trace. Sending ordinary hashes would not hide the interests that do not match.',
    sets: { a: 'music, hiking, chess', b: 'hiking, cooking, chess' },
  },
];

const TAKEAWAYS = TOUR_STOPS.map(s => s.takeaway);

export function tourLabel(route: string): string {
  if (route === 'tour-done') return 'Tour complete';
  const stop = TOUR_STOPS.find(s => route === `tour-${s.index}`);
  return stop ? `Tour ${stop.index} of ${TOTAL}` : '3-minute tour';
}

export function Tour({ route }: { route: string }) {
  if (route === 'tour-done') return <TourDone />;
  const stop = TOUR_STOPS.find(s => route === `tour-${s.index}`);
  if (!stop) return <TourDone />;
  const vis = stop.index === 1 ? <HashVis /> : stop.index === 2 ? <DiffieHellmanVis /> : <PsiVis />;
  return <TourProvider stop={stop}>{vis}</TourProvider>;
}

function TourDone() {
  return (
    <main className="tour-done wrap">
      <SunhacksMark variant="banner" />
      <p className="tour-kicker">3-minute tour</p>
      <h1>Three ideas, one tour</h1>
      <ol>
        {TAKEAWAYS.map(t => <li key={t}>{t}</li>)}
      </ol>
      <p className="tour-aside">The private sets path ends with a flag. Submitting it saves on your account.</p>
      <div className="tour-done-actions">
        <a className="btn-l primary" href="#library">Explore all topics</a>
        <a className="btn-l outline" href="#world">Return to world</a>
      </div>
    </main>
  );
}
