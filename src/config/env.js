// Central environment validation and resolved config.
//
// The one job that matters most here: never let production boot with a weak or
// missing JWT secret. A hardcoded/guessable secret means anyone can forge a
// valid token for any account, so in production we fail fast (exit before the
// server accepts requests) rather than run insecure. In development we allow a
// throwaway fallback so the app is friction-free to run locally.

// Values that are placeholders, not real secrets. If JWT_SECRET is one of these
// (or empty) it counts as "not configured".
const PLACEHOLDER_SECRETS = new Set([
  "",
  "dev-secret-change-me",
  "replace-with-a-long-random-secret",
  "change-me",
]);

const DEV_FALLBACK_SECRET = "dev-secret-change-me";

const isProduction = () => process.env.NODE_ENV === "production";

const isPlaceholderSecret = (secret) =>
  PLACEHOLDER_SECRETS.has((secret || "").trim());

/**
 * Resolve the JWT secret, applying the dev-only fallback. Does not throw — call
 * validateEnv() at startup for the fail-fast behaviour.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (isPlaceholderSecret(secret)) {
    return isProduction() ? undefined : DEV_FALLBACK_SECRET;
  }
  return secret;
};

/**
 * Validate required environment before the server starts.
 *
 * In production a real JWT_SECRET is mandatory; anything missing/placeholder
 * throws so the process exits with a clear message. In development we only warn
 * and fall back to a throwaway secret.
 *
 * @returns {{ jwtSecret: string }} resolved config for callers that want it.
 */
export const validateEnv = () => {
  const rawSecret = process.env.JWT_SECRET;

  if (isPlaceholderSecret(rawSecret)) {
    if (isProduction()) {
      throw new Error(
        "JWT_SECRET is required in production and must not be a placeholder. " +
          "Generate one with:\n" +
          "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"\n" +
          "and set it in the environment before starting the server.",
      );
    }
    console.warn(
      "[env] JWT_SECRET is not set — using an insecure development fallback. " +
        "Set a strong JWT_SECRET before deploying to production.",
    );
  }

  return { jwtSecret: getJwtSecret() };
};
