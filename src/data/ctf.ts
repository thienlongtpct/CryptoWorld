// Final challenge for each course. The learner types a flag; nothing is multiple choice.
export interface CtfChallenge {
  pathId: string;
  title: string;
  briefing: string;
  hint: string;
  /** Canonical flag, including the sunhacks{} wrapper. */
  flag: string;
  why: string;
}

export const CTF: CtfChallenge[] = [
  {
    pathId: 'foundations',
    title: 'Clock, Euclid, and a pad',
    briefing: 'Let a = 23 mod 7 and b = gcd(48, 18). The secret is a XOR b. Submit it as sunhacks{secret}.',
    hint: '23 = 3 × 7 + a remainder. Euclid’s last non-zero remainder on 48 and 18 is b. XOR those two numbers.',
    flag: 'sunhacks{4}',
    why: '23 mod 7 is 2, and gcd(48, 18) is 6. 2 XOR 6 is 4.',
  },
  {
    pathId: 'ciphers',
    title: 'A shift with a familiar size',
    briefing: 'Ciphertext IGKYGX is a Caesar cipher. The shift is gcd(48, 18). Decrypt it and submit sunhacks{plaintext} in lowercase.',
    hint: 'Subtract the shift from each letter, wrapping from A back to Z. The plaintext is a word from this course.',
    flag: 'sunhacks{caesar}',
    why: 'The shift is 6. I G K Y G X moved back by 6 letters is C A E S A R.',
  },
  {
    pathId: 'public-key',
    title: 'A tiny Diffie–Hellman',
    briefing: 'The group is multiplication mod 23 and the generator is 5. Alice’s secret exponent is 3. Bob publishes 5⁴ mod 23 = 4. Submit the shared secret as sunhacks{secret}.',
    hint: 'Both parties can compute 4 raised to Alice’s exponent, then reduce mod 23. You do not need Bob’s exponent.',
    flag: 'sunhacks{18}',
    why: 'Alice computes 4³ = 64, and 64 mod 23 is 18. That is g^{ab}.',
  },
  {
    pathId: 'oblivious',
    title: 'One message, then a pad',
    briefing: 'Alice’s OT messages are m₀ = 9 and m₁ = 14. Bob’s choice bit is 0, so he receives only m₀. He XORs it with the pad 6. Submit that result as sunhacks{secret}.',
    hint: 'Choice 0 selects the first message. XOR is addition of bits with no carry: 9 is 1001 and 6 is 0110.',
    flag: 'sunhacks{15}',
    why: 'Bob receives 9 and never learns 14. 9 XOR 6 is 15.',
  },
  {
    pathId: 'sets',
    title: 'Only what both of them hold',
    briefing: 'Alice’s set is {2, 5, 9, 12}. Bob’s set is {5, 7, 12, 18}. Submit the intersection in increasing order as sunhacks{5,12}.',
    hint: 'An element is in the intersection only when it appears in both sets. Write those elements from smallest to largest, separated by a comma.',
    flag: 'sunhacks{5,12}',
    why: '5 and 12 are the only shared elements. A private set intersection would reveal those and hide the rest.',
  },
];

export const CTF_BY_PATH: Record<string, CtfChallenge> = Object.fromEntries(CTF.map(c => [c.pathId, c]));

export function ctfId(pathId: string) {
  return `ctf-${pathId}`;
}

/** Accept the canonical flag, or the same secret without the wrapper and without spaces. */
export function flagMatches(input: string, flag: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '');
  const got = norm(input);
  const full = norm(flag);
  const inner = full.replace(/^sunhacks\{/, '').replace(/\}$/, '');
  return got === full || got === inner || got === `sunhacks{${inner}}`;
}
