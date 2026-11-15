/** Server-only assessment keys for the Verify a software download path. */

export const ASSESSMENT_VERSION = 1;

const TASKS = {
  'vd-assess-1': {
    version: ASSESSMENT_VERSION,
    title: 'Initial check — digests and seals',
    skillId: 'vd-hash-basics',
    items: [
      {
        id: 'a1',
        prompt: 'A courier seal that only adds letter values (A=1…Z=26) and reduces modulo 26 can give the same seal to two different words.',
        choices: [
          { id: 'true', label: 'True' },
          { id: 'false', label: 'False' },
        ],
        answer: 'true',
      },
      {
        id: 'a2',
        prompt: 'Your download’s SHA-256 matches the digest published on the vendor’s site. What does that verify by itself?',
        choices: [
          { id: 'author', label: 'That the vendor’s author wrote the file' },
          { id: 'match', label: 'That the file matches the published digest' },
          { id: 'safe', label: 'That the software is free of malware' },
        ],
        answer: 'match',
      },
      {
        id: 'a3',
        prompt: 'For a cryptographic hash such as SHA-256, finding two different inputs with the same digest is:',
        choices: [
          { id: 'easy', label: 'Easy with a short script' },
          { id: 'hard', label: 'Out of practical reach with known methods' },
          { id: 'same', label: 'As easy as colliding the toy courier seal' },
        ],
        answer: 'hard',
      },
    ],
  },
  'vd-workplace': {
    version: ASSESSMENT_VERSION,
    title: 'Workplace scenario — check a download',
    skillId: 'vd-verify-download',
    items: [
      {
        id: 'w1',
        prompt: 'You download installer.pkg. The vendor site lists SHA-256 abc… and your local digest matches. What have you checked?',
        choices: [
          { id: 'integrity', label: 'The file matches the digest shown on that site (integrity against that listing)' },
          { id: 'identity', label: 'The person who published the site is definitely the software author' },
          { id: 'policy', label: 'Your workplace policy has already approved the vendor' },
        ],
        answer: 'integrity',
      },
      {
        id: 'w2',
        prompt: 'An attacker replaces both the binary and the digest on a lookalike download page. Matching the listed digest then:',
        choices: [
          { id: 'enough', label: 'Still proves the real vendor shipped the file' },
          { id: 'channel', label: 'Is not enough — you also need a trusted channel or a signature from a key you already trust' },
          { id: 'seal', label: 'Is fixed by using the toy courier seal instead of SHA-256' },
        ],
        answer: 'channel',
      },
      {
        id: 'w3',
        prompt: 'The Fountain of Hash toy-seal lab found another word with the same seal as LEAF. That experiment mainly shows:',
        choices: [
          { id: 'sha-broken', label: 'That SHA-256 collisions are easy' },
          { id: 'weak-seal', label: 'That a weak checksum does not authenticate a sender' },
          { id: 'no-digest', label: 'That digests should never be used when checking downloads' },
        ],
        answer: 'weak-seal',
      },
    ],
  },
};

export function publicAssessment(taskId) {
  const task = TASKS[taskId];
  if (!task) return null;
  return {
    taskId,
    version: task.version,
    title: task.title,
    items: task.items.map(({ id, prompt, choices }) => ({ id, prompt, choices })),
  };
}

export function listPublicAssessments() {
  return Object.keys(TASKS).map(publicAssessment);
}

/**
 * Grade answers against server keys. Returns per-item correctness without
 * embedding the canonical answer ids in the public payload when wrong —
 * only whether each item matched.
 */
export function gradeAssessment(taskId, version, answers) {
  const task = TASKS[taskId];
  if (!task) return { ok: false, status: 404, error: 'Unknown assessment.' };
  if (version !== task.version) {
    return { ok: false, status: 400, error: `Use assessment version ${task.version}.` };
  }
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, status: 400, error: 'Send answers as an object of item id to choice id.' };
  }
  const items = task.items.map(item => {
    const got = typeof answers[item.id] === 'string' ? answers[item.id].trim() : '';
    const correct = got === item.answer;
    return { id: item.id, correct, choice: got || null };
  });
  const correctCount = items.filter(row => row.correct).length;
  const total = items.length;
  const passed = correctCount === total;
  return {
    ok: true,
    taskId,
    version: task.version,
    skillId: task.skillId,
    title: task.title,
    correctCount,
    total,
    passed,
    items,
  };
}

export function isAssessmentTask(taskId) {
  return Object.prototype.hasOwnProperty.call(TASKS, taskId);
}
