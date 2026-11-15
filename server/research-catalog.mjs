// Approved research subjects. Starting URLs are resolved server-side only.
// Begin with hashing plus a few published sources tied to the local bibliography.

const NIST_FIPS_180_4 = {
  title: 'FIPS 180-4: Secure Hash Standard (SHS)',
  publisher: 'NIST',
  url: 'https://csrc.nist.gov/publications/detail/fips/180-4/final',
};

const RFC_6234 = {
  title: 'US Secure Hash Algorithms (SHA and SHA-based HMAC and HKDF)',
  publisher: 'IETF',
  url: 'https://www.rfc-editor.org/rfc/rfc6234',
};

const PAGH_CUCKOO = {
  title: 'Cuckoo Hashing',
  publisher: 'ESA / Pagh & Rodler',
  url: 'https://www.it-c.dk/people/pagh/papers/cuckoo-jour.pdf',
};

const PSZ14 = {
  title: 'Faster Private Set Intersection Based on OT Extension',
  publisher: 'USENIX Security',
  url: 'https://www.usenix.org/conference/usenixsecurity14/technical-sessions/presentation/pinkas',
};

/** @type {Record<string, object>} */
const TOPICS = {
  hash: {
    id: 'hash',
    kind: 'topic',
    title: 'Hash Functions',
    learningHint: 'cryptographic hash functions, SHA-256, collision resistance, and avalanche',
    startingUrls: [NIST_FIPS_180_4, RFC_6234],
    relatedVisualizations: ['hash', 'commit', 'blockcipher'],
    bibliography: [
      { id: 'pagh01', title: 'Cuckoo Hashing', authors: 'R. Pagh, F. F. Rodler', venue: 'ESA', year: 2001, note: 'Two-choice hashing with evictions.' },
      { id: 'psz14', title: 'Faster Private Set Intersection Based on OT Extension', authors: 'B. Pinkas, T. Schneider, M. Zohner', venue: 'USENIX Security', year: 2014, note: 'OT-extension PSI with cuckoo hashing.' },
    ],
  },
  commit: {
    id: 'commit',
    kind: 'topic',
    title: 'Commitment',
    learningHint: 'hash-based commitments, hiding, and binding',
    startingUrls: [NIST_FIPS_180_4, RFC_6234],
    relatedVisualizations: ['commit', 'hash'],
    bibliography: [
      { id: 'pagh01', title: 'Cuckoo Hashing', authors: 'R. Pagh, F. F. Rodler', venue: 'ESA', year: 2001, note: 'Two-choice hashing with evictions.' },
    ],
  },
  cuckoo: {
    id: 'cuckoo',
    kind: 'topic',
    title: 'Cuckoo Hashing',
    learningHint: 'cuckoo hashing, candidate bins, and eviction chains used in PSI',
    startingUrls: [PAGH_CUCKOO, PSZ14],
    relatedVisualizations: ['cuckoo', 'hash', 'psi', 'okvs'],
    bibliography: [
      { id: 'pagh01', title: 'Cuckoo Hashing', authors: 'R. Pagh, F. F. Rodler', venue: 'ESA', year: 2001, note: 'Two-choice hashing with evictions.' },
      { id: 'psz14', title: 'Faster Private Set Intersection Based on OT Extension', authors: 'B. Pinkas, T. Schneider, M. Zohner', venue: 'USENIX Security', year: 2014, note: 'OT-extension PSI with cuckoo hashing.' },
    ],
  },
};

/** @type {Record<string, object>} */
const PAPERS = {
  pagh01: {
    id: 'pagh01',
    kind: 'paper',
    title: 'Cuckoo Hashing',
    learningHint: 'the Pagh–Rodler cuckoo hashing paper and how two-choice hashing works',
    startingUrls: [PAGH_CUCKOO, NIST_FIPS_180_4],
    relatedVisualizations: ['cuckoo', 'hash', 'psi'],
    bibliography: [
      { id: 'pagh01', title: 'Cuckoo Hashing', authors: 'R. Pagh, F. F. Rodler', venue: 'ESA', year: 2001, note: 'Two-choice hashing with evictions.' },
    ],
  },
  psz14: {
    id: 'psz14',
    kind: 'paper',
    title: 'Faster Private Set Intersection Based on OT Extension',
    learningHint: 'OT-extension PSI that uses cuckoo hashing for binning',
    startingUrls: [PSZ14, PAGH_CUCKOO],
    relatedVisualizations: ['psi', 'cuckoo', 'hash', 'otext'],
    bibliography: [
      { id: 'psz14', title: 'Faster Private Set Intersection Based on OT Extension', authors: 'B. Pinkas, T. Schneider, M. Zohner', venue: 'USENIX Security', year: 2014, note: 'OT-extension PSI with cuckoo hashing.' },
      { id: 'pagh01', title: 'Cuckoo Hashing', authors: 'R. Pagh, F. F. Rodler', venue: 'ESA', year: 2001, note: 'Two-choice hashing with evictions.' },
    ],
  },
};

export function resolveSubject({ topicId, paperId } = {}) {
  const topic = typeof topicId === 'string' ? topicId.trim() : '';
  const paper = typeof paperId === 'string' ? paperId.trim() : '';
  if (topic && paper) return { ok: false, error: 'Send either a topicId or a paperId, not both.' };
  if (!topic && !paper) return { ok: false, error: 'Send an approved topicId or paperId.' };
  const subject = topic ? TOPICS[topic] : PAPERS[paper];
  if (!subject) {
    return {
      ok: false,
      error: topic
        ? 'That topic is not approved for research yet. Start with hash, commit, or cuckoo.'
        : 'That paper is not approved for research yet. Start with pagh01 or psz14.',
    };
  }
  return { ok: true, subject };
}

export function approvedSubjectIds() {
  return { topics: Object.keys(TOPICS), papers: Object.keys(PAPERS) };
}

/** The approved research topic that best matches some lesson topics, or null. */
export function researchTopicFor(topics) {
  const wanted = Array.isArray(topics) ? topics : [];
  const subjects = Object.values(TOPICS);
  const direct = subjects.find(subject => wanted.includes(subject.id));
  if (direct) return direct.id;
  const related = subjects.find(subject => subject.relatedVisualizations.some(id => wanted.includes(id)));
  return related ? related.id : null;
}
