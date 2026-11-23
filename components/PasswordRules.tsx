"use client";
import { Check, X } from "lucide-react";
import { PASSWORD_RULES, badChars } from "@/lib/password";

/** Live checklist under a new-password field. */
export function PasswordRules({ value }: { value: string }) {
  const bad = badChars(value);
  return (
    <ul className="pw-rules" aria-live="polite">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(value);
        return (
          <li key={r.id} className={ok ? "ok" : value ? "bad" : ""}>
            {ok ? <Check size={13} /> : <X size={13} />} {r.label}
            {r.id === "only" && bad.length > 0 && <span> (remove {bad.map((c) => (c === " " ? "space" : c)).join(" ")})</span>}
          </li>
        );
      })}
    </ul>
  );
}
