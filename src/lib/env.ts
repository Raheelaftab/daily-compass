/**
 * Strip surrounding quotes from an env value.
 * Next/dotenv usually removes them, but ADMIN_PASSWORD_HASH may be
 * single-quoted in .env.local to protect `$` characters — keep this
 * defensive so bcrypt always sees the raw 60-char hash.
 */
export function unwrapEnvValue(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getAdminPasswordHash(): string {
  // Normalize quotes and any leftover `\$` escapes from .env.local.
  return unwrapEnvValue(process.env.ADMIN_PASSWORD_HASH).replace(/\\\$/g, "$");
}

/** Dev-only: log hash length (never the hash) so quote/expansion issues are obvious. */
export function logAdminPasswordHashStatus(): void {
  if (process.env.NODE_ENV !== "development") return;

  const hash = getAdminPasswordHash();
  const ok = hash.length === 60;
  console.info(
    `[auth] ADMIN_PASSWORD_HASH loaded: length=${hash.length}, expected=60, ok=${ok}`,
  );
}
