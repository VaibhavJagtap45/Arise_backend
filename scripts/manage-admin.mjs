// Admin management CLI — rotate who has admin access without touching the DB by
// hand. Run from the Backend/ folder so it picks up Backend/.env (DATABASE_URL).
//
// IMPORTANT: admin access is granted by `role === "admin"` OR the email being in
// the backend's ADMIN_EMAILS env var (see src/middlewares/adminMiddleware.js).
// So to FULLY remove an old admin you must BOTH:
//   1) run this with --demote (or --delete) to change the stored DB role, AND
//   2) remove their email from ADMIN_EMAILS in Backend/.env, then restart.
// To ADD a new admin: make sure the account exists (register it in the app),
// add its email to ADMIN_EMAILS, and optionally --promote it here.
//
// Usage (from Backend/):
//   node scripts/manage-admin.mjs --list
//   node scripts/manage-admin.mjs --promote new@email.com
//   node scripts/manage-admin.mjs --demote old@email.com
//   node scripts/manage-admin.mjs --delete old@email.com        (removes account + their data)
//   node scripts/manage-admin.mjs --demote old@email.com --promote new@email.com
//
// No secrets live in this file — DATABASE_URL is read from your environment/.env.

import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { DailyLog } from "../src/models/DailyLog.js";
import { Transaction } from "../src/models/Transaction.js";
import { Budget } from "../src/models/Budget.js";
import { CoachNote } from "../src/models/CoachNote.js";

const norm = (email) => String(email || "").trim().toLowerCase();

// Collect actions in the order they appear so e.g. --demote runs before --promote.
const parseArgs = (argv) => {
  const actions = [];
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === "--list") {
      actions.push({ type: "list" });
    } else if (["--promote", "--demote", "--delete"].includes(flag)) {
      const email = norm(argv[i + 1]);
      if (!email) {
        throw new Error(`${flag} needs an email, e.g. ${flag} someone@example.com`);
      }
      actions.push({ type: flag.slice(2), email });
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${flag}`);
    }
  }
  return actions;
};

const findByEmail = (email) => User.findOne({ email }).select("+password");

const setRole = async (email, role) => {
  const user = await findByEmail(email);
  if (!user) {
    console.log(`  ✗ ${email} — no account found (skipped)`);
    return;
  }
  if (user.role === role) {
    console.log(`  • ${email} — already "${role}" (no change)`);
    return;
  }
  user.role = role;
  await user.save();
  console.log(`  ✓ ${email} — role set to "${role}"`);
};

const deleteUser = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    console.log(`  ✗ ${email} — no account found (skipped)`);
    return;
  }
  const id = user._id.toString();
  const [logs, txns, budgets, notes] = await Promise.all([
    DailyLog.deleteMany({ userId: id }),
    Transaction.deleteMany({ userId: id }),
    Budget.deleteMany({ userId: id }),
    CoachNote.deleteMany({ userId: id }),
  ]);
  await user.deleteOne();
  console.log(
    `  ✓ ${email} — account deleted (logs:${logs.deletedCount || 0} txns:${txns.deletedCount || 0} budgets:${budgets.deletedCount || 0} notes:${notes.deletedCount || 0})`,
  );
};

const listAdmins = async () => {
  const admins = await User.find({ role: "admin" })
    .select("email fullName role")
    .lean();
  if (admins.length === 0) {
    console.log("  (no accounts currently have role \"admin\")");
    return;
  }
  for (const a of admins) {
    console.log(`  • ${a.email} — ${a.fullName}`);
  }
};

const run = async () => {
  let actions;
  try {
    actions = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n${error.message}\n`);
    console.error("Run with --list to see current admins, or --promote/--demote/--delete <email>.");
    process.exit(1);
  }

  if (actions.length === 0) {
    console.error(
      "\nNothing to do. Examples:\n" +
        "  node scripts/manage-admin.mjs --list\n" +
        "  node scripts/manage-admin.mjs --demote old@email.com --promote new@email.com\n",
    );
    process.exit(1);
  }

  const mongoUrl =
    process.env.DATABASE_URL || "mongodb://localhost:27017/calorie-tracker";
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.log("Connected to MongoDB\n");

  for (const action of actions) {
    if (action.type === "list") {
      console.log("Current admins:");
      await listAdmins();
    } else if (action.type === "promote") {
      await setRole(action.email, "admin");
    } else if (action.type === "demote") {
      await setRole(action.email, "user");
    } else if (action.type === "delete") {
      await deleteUser(action.email);
    }
  }

  await mongoose.disconnect();
  console.log(
    "\nDone. Remember: also update ADMIN_EMAILS in Backend/.env (remove the old\n" +
      "email, add the new one) and restart the backend — access is granted by role\n" +
      "OR by ADMIN_EMAILS, so both must agree.",
  );
  process.exit(0);
};

run().catch((error) => {
  console.error("\nFailed:", error.message);
  process.exit(1);
});
