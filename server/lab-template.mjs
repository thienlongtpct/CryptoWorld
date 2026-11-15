/** Default Python template for the Fountain of Hash seal workbench. */
export const SEAL_LAB_TEMPLATE = `# Toy courier seal: letter values A=1..Z=26, sum mod 26.
# The parcel LEAF has seal 24. Find another word with the same seal.
# This experiment shows weakness in the toy seal: a checksum is not authentication.
# A hash alone does not prove who sent a message — compare SHA-256 digests below.

import hashlib

def seal(word: str, modulus: int = 26) -> int:
    total = 0
    for ch in word.upper():
        if "A" <= ch <= "Z":
            total += ord(ch) - 64
    return total % modulus

TARGET = "LEAF"
print("target", TARGET, "seal", seal(TARGET))

# TODO: set CANDIDATE to a different word with the same seal as LEAF, then print it.
CANDIDATE = "LEAF"
print("candidate", CANDIDATE, "seal", seal(CANDIDATE))

for label, word in (("target", TARGET), ("candidate", CANDIDATE)):
    digest = hashlib.sha256(word.encode("utf-8")).hexdigest()
    print("sha256", label, word, digest)

if CANDIDATE.upper() != TARGET and seal(CANDIDATE) == seal(TARGET):
    print("same_seal", CANDIDATE)
`;

/** Fixed remote command — never includes learner source text. */
export const LAB_REMOTE_CMD = 'python3 /tmp/learner.py';

export const LAB_CHALLENGE_ID = 'seal';
export const LAB_CODE_MAX = 12_000;
export const LAB_OUTPUT_MAX = 8_000;
export const LAB_CMD_TIMEOUT_MS = 8_000;
export const LAB_TTL_MS = 60 * 60 * 1000;
export const LAB_DAILY_LIMIT = 20;
export const LAB_CONCURRENCY = 2;
