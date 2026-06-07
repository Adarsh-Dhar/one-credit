#!/usr/bin/env tsx
// scripts/cron-persona-refresh.ts
//
// Standalone cron runner for self-hosted deployments (non-Vercel).
// Uses node-cron to fire on a schedule read from PERSONA_CRON_SCHEDULE.
//
// ─── Usage ─────────────────────────────────────────────────────────────────
//
//   # Add to .env:
//   PERSONA_CRON_SCHEDULE="0 2 * * *"   # 02:00 every night (default)
//   CRON_SECRET=your-secret-here
//   APP_BASE_URL=http://localhost:3000   # or your production URL
//
//   # Run the scheduler (keeps process alive):
//   pnpm tsx scripts/cron-persona-refresh.ts
//
//   # Or wire into package.json scripts and run with PM2 / systemd:
//   pm2 start --interpreter tsx scripts/cron-persona-refresh.ts --name persona-cron
//
// ─── Schedule format (standard cron) ─────────────────────────────────────────
//
//   "0 2 * * *"     → 02:00 every day
//   "0 */6 * * *"   → every 6 hours
//   "30 8 * * 1"    → 08:30 every Monday
//   "*/15 * * * *"  → every 15 minutes (useful for testing)
//
// ─── What it does ───────────────────────────────────────────────────────────
//
//   At the scheduled time it POSTs to GET /api/cron/persona-refresh on your
//   Next.js app (authenticated via CRON_SECRET). The API route fetches all
//   users from MongoDB, runs the Gemini RUM agent for each, and stores the
//   inferred persona so that /cards and /insights load instantly with fresh
//   data instead of running the agent on every page visit.
import cron from 'node-cron';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

// ─── Config ─────────────────────────────────────────────────────────────────
const SCHEDULE = process.env.PERSONA_CRON_SCHEDULE ?? '0 2 * * *';
const APP_URL = (process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CRON_SECRET = process.env.CRON_SECRET ?? '';
const ENDPOINT = `${APP_URL}/api/cron/persona-refresh`;

// ─── Validate schedule ─────────────────────────────────────────────────────
if (!cron.validate(SCHEDULE)) {
  console.error(`[persona-cron] ❌  Invalid cron expression: "${SCHEDULE}"`);
  console.error(`[persona-cron]     Set a valid PERSONA_CRON_SCHEDULE in .env`);
  process.exit(1);
}

console.log(`[persona-cron] ✅  Scheduler started`);
console.log(`[persona-cron]     Schedule : ${SCHEDULE}`);
console.log(`[persona-cron]     Endpoint : ${ENDPOINT}`);
console.log(`[persona-cron]     Auth     : ${CRON_SECRET ? 'CRON_SECRET set ✓' : '⚠️  CRON_SECRET not set — endpoint unprotected'}`);

// ─── Fire function ─────────────────────────────────────────────────────────
async function firePersonaRefresh(): Promise<void> {
  const firedAt = new Date().toISOString();
  console.log(`\n[persona-cron] 🔔  Firing at ${firedAt}`);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: {
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
        'Content-Type': 'application/json',
      },
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      console.error(`[persona-cron] ❌  HTTP ${res.status}`, body);
      return;
    }

    const { refreshed, errors, durationMs } = body as {
      refreshed: number;
      errors: number;
      durationMs: number;
    };

    console.log(
      `[persona-cron] ✅  Done — ${refreshed} refreshed, ${errors} errors, ${durationMs}ms`,
    );
  } catch (err) {
    console.error('[persona-cron] ❌  Fetch failed:', err);
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────
cron.schedule(SCHEDULE, firePersonaRefresh, {
  timezone: process.env.CRON_TIMEZONE ?? 'UTC',
});

// Keep the process alive; exit cleanly on SIGINT / SIGTERM
process.on('SIGINT', () => {
  console.log('\n[persona-cron] Stopped (SIGINT)');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n[persona-cron] Stopped (SIGTERM)');
  process.exit(0);
});
