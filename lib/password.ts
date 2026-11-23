// Password rules for the UI. The server enforces the same rules in lib/auth.ts (passwordProblem); keep both in sync.
export const PASSWORD_SYMBOLS = "!@#$%^&*()-_+=?.";
const SYMBOL_RE = /[!@#$%^&*()\-_+=?.]/;
const ALLOWED_RE = /^[A-Za-z0-9!@#$%^&*()\-_+=?.]*$/;

export const PASSWORD_RULES = [
  { id: "len", label: "8–64 characters", test: (p: string) => p.length >= 8 && p.length <= 64 },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "One number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { id: "sym", label: `One symbol: ${PASSWORD_SYMBOLS.split("").join(" ")}`, test: (p: string) => SYMBOL_RE.test(p) },
  { id: "only", label: "No spaces or other characters", test: (p: string) => p.length > 0 && ALLOWED_RE.test(p) },
] as const;

/** Characters in the password that aren't allowed (spaces, emoji, quotes, etc.), de-duplicated. */
export const badChars = (p: string) => [...new Set([...p].filter((c) => !/[A-Za-z0-9]/.test(c) && !PASSWORD_SYMBOLS.includes(c)))];

/** null when valid, otherwise the first problem as a sentence. */
export function passwordError(p: string): string | null {
  const bad = badChars(p);
  if (bad.length) return `Remove ${bad.map((c) => (c === " " ? "spaces" : `"${c}"`)).join(", ")}. Only letters, numbers and ${PASSWORD_SYMBOLS.split("").join(" ")} are allowed.`;
  const miss = PASSWORD_RULES.find((r) => !r.test(p));
  return miss ? `Password needs: ${miss.label}.` : null;
}

/** Quick client-side sanity check for email format (the server also checks the domain can receive mail). */
export const looksLikeEmail = (e: string) => /^[A-Za-z0-9._%+-]{1,64}@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/.test(e.trim());
