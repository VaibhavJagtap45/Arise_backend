// Admins are configured by email via the ADMIN_EMAILS env var (comma-separated).
// On login/register a matching account is promoted to role "admin" (see
// AuthService.ensureAdminRole), and adminMiddleware also treats these emails as
// admins as a safety net — so granting admin access is just an env change plus a
// fresh login, with no manual database edits.
//
//   ADMIN_EMAILS=owner@example.com,ops@example.com

export const adminEmails = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export const isAdminEmail = (email) =>
  !!email && adminEmails.has(String(email).trim().toLowerCase());
