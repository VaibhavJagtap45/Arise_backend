import "dotenv/config";
import { fileURLToPath } from "url";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { connectDatabase } from "./config/database.js";
import { validateEnv } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";

import authRoutes from "./routes/auth.js";
import foodRoutes from "./routes/food.js";
import logRoutes from "./routes/log.js";
import userRoutes from "./routes/user.js";
import moneyRoutes from "./routes/money.js";
import adminRoutes from "./routes/admin.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Don't advertise the framework/version (harder to fingerprint for known CVEs).
app.disable("x-powered-by");
// Trust the first proxy hop so req.ip reflects the real client (X-Forwarded-For)
// behind a load balancer / hosting proxy — required for correct per-IP rate
// limiting and logging.
app.set("trust proxy", 1);
// Standard secure response headers (CSP is left at helmet's conservative default
// off for an API; the other protections — HSTS, noSniff, frameguard, etc. apply).
app.use(helmet());
// gzip all responses above the default 1 KB threshold. The biggest wins are the
// admin overview (embeds base64 profile photos) and the monthly-logs payload;
// small responses are left uncompressed automatically.
app.use(compression());
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || "*")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
// In development, accept localhost and any private LAN address (any port) so
// the app works from web, simulators and physical devices regardless of the
// dev machine's current IP. Production is restricted to CLIENT_ORIGIN.
const DEV_ORIGIN_PATTERN =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(?::\d+)?$/;

app.use(
  cors({
    origin(origin, callback) {
      const isAllowedDevOrigin =
        process.env.NODE_ENV !== "production" && DEV_ORIGIN_PATTERN.test(origin || "");

      if (
        !origin ||
        CLIENT_ORIGINS.includes("*") ||
        CLIENT_ORIGINS.includes(origin) ||
        isAllowedDevOrigin
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }),
);
// Keep the default request body small to limit abuse. The one exception is the
// profile update, which carries a base64 profile photo (a few hundred KB) — that
// single route gets a larger allowance until photos move to object storage.
const JSON_BODY_LIMIT = process.env.JSON_BODY_LIMIT || "1mb";
const PROFILE_BODY_LIMIT = process.env.PROFILE_BODY_LIMIT || "5mb";
const jsonSmall = express.json({ limit: JSON_BODY_LIMIT });
const jsonProfile = express.json({ limit: PROFILE_BODY_LIMIT });
app.use((req, res, next) => {
  // req.path is the full path at the app level (e.g. "/api/users/profile").
  if (req.method === "POST" && req.path === "/api/users/profile") {
    return jsonProfile(req, res, next);
  }
  return jsonSmall(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Calorie Tracker API is running",
    health: "/health",
    apiBase: "/api",
  });
});

app.get("/health", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  res.json({
    success: true,
    message: "Calorie Tracker API is running",
    database: dbReady ? "connected" : "connecting",
    region: "India",
    timezone: "Asia/Kolkata",
  });
});

// The HTTP server starts before MongoDB finishes connecting (see startServer),
// so requests that need the database must not be served while it is still
// connecting. Returning a clear 503 here means the client shows a meaningful
// "service starting, retry" message instead of an opaque network error caused
// by a request that hangs until Mongoose's buffer times out.
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    return next();
  }

  res.status(503).json({
    success: false,
    error: "Service is starting up (database connecting). Please retry in a few seconds.",
  });
};

app.use("/api/auth", requireDatabase, authRoutes);
app.use("/api/foods", requireDatabase, foodRoutes);
app.use("/api/logs", requireDatabase, logRoutes);
app.use("/api/users", requireDatabase, userRoutes);
app.use("/api/money", requireDatabase, moneyRoutes);
app.use("/api/admin", requireDatabase, adminRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

app.use(errorHandler);

// Keep retrying the database connection in the background. The HTTP server is
// already accepting requests by the time this runs, so a slow or temporarily
// unreachable database degrades the API to clear 503s (via requireDatabase)
// instead of taking the whole server offline — which is what previously turned
// a transient DB issue into a "Network Error" on the client.
const connectDatabaseWithRetry = async (attempt = 1) => {
  try {
    await connectDatabase();
  } catch (error) {
    const retryDelayMs = Math.min(30000, 3000 * attempt);
    if (!error.isDatabaseSetupError) {
      console.error("MongoDB connection attempt failed:", error.message || error);
    }
    console.error(
      `Retrying database connection in ${Math.round(retryDelayMs / 1000)}s (attempt ${attempt + 1}). The API is up but data routes return 503 until connected.`,
    );
    setTimeout(() => connectDatabaseWithRetry(attempt + 1), retryDelayMs);
  }
};

export const startServer = async () => {
  // Fail fast on insecure/missing config (e.g. no real JWT_SECRET in production)
  // before we bind the port and start accepting requests.
  try {
    validateEnv();
  } catch (error) {
    console.error(`[startup] ${error.message}`);
    process.exit(1);
  }

  // Bind to 0.0.0.0 so physical devices and emulators on the LAN can reach the
  // API at the dev machine's IP, not just localhost.
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Calorie Tracker API running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Stop the existing server or set a different PORT in .env.`,
      );
      process.exit(1);
    }

    throw error;
  });

  connectDatabaseWithRetry();
};

export default app;

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectRun) {
  startServer();
}
