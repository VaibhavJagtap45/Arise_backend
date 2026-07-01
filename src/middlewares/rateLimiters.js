import rateLimit from "express-rate-limit";

// Reusable rate limiters. Each returns a 429 with a clear JSON message (matching
// the app's { success, error } shape) once a client exceeds its window.
//
// All windows/maxes are overridable via env vars so ops can tune without a code
// change. Limiting is skipped entirely under NODE_ENV=test so the test suite
// isn't throttled.

const isTest = () => process.env.NODE_ENV === "test";

const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const MINUTE = 60 * 1000;

const jsonMessage = (error) => ({ success: false, error });

const makeLimiter = ({ windowMs, max, error }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true, // RateLimit-* headers
    legacyHeaders: false, // no X-RateLimit-* headers
    skip: isTest,
    message: jsonMessage(error),
  });

// Strict: auth endpoints (login / register / forgot-password) are the prime
// brute-force targets. Default ~10 attempts / 15 min per IP.
export const authLimiter = makeLimiter({
  windowMs: num(process.env.AUTH_RATE_WINDOW_MS, 15 * MINUTE),
  max: num(process.env.AUTH_RATE_MAX, 10),
  error: "Too many attempts. Please wait a while and try again.",
});

// Moderate: food search/lookup can be called often during normal use but should
// not be scriptable without bound. Default ~60 requests / minute per IP.
export const foodLimiter = makeLimiter({
  windowMs: num(process.env.FOOD_RATE_WINDOW_MS, MINUTE),
  max: num(process.env.FOOD_RATE_MAX, 60),
  error: "Too many requests. Please slow down and try again shortly.",
});

// Moderate: admin routes. Default ~100 requests / 15 min per IP.
export const adminLimiter = makeLimiter({
  windowMs: num(process.env.ADMIN_RATE_WINDOW_MS, 15 * MINUTE),
  max: num(process.env.ADMIN_RATE_MAX, 100),
  error: "Too many requests. Please slow down and try again shortly.",
});
