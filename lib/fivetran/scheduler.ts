/**
 * lib/fivetran/scheduler.ts
 *
 * Lightweight in-process scheduler for the rewards Fivetran connector.
 * Runs every FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS (default: 300 = 5 min).
 *
 * Initialized once by the Next.js instrumentation hook (see instrumentation.ts).
 */

import { runRewardsSync } from './rewards-connector';
import logger from '@/lib/logger';

let timer: NodeJS.Timeout | null = null;
let isRunning = false;

export function startRewardsScheduler(intervalSeconds?: number): void {
  if (timer) {
    logger.info('[FivetranScheduler] Already running — skipping re-init');
    return;
  }

  const interval =
    intervalSeconds ??
    parseInt(process.env.FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS ?? '300', 10);

  logger.info(`[FivetranScheduler] Starting rewards sync every ${interval}s`);

  // Run immediately on boot, then on schedule
  void runRewardsSyncCycle();

  timer = setInterval(async () => {
    await runRewardsSyncCycle();
  }, interval * 1000);
}

export function stopRewardsScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('[FivetranScheduler] Stopped');
  }
}

async function runRewardsSyncCycle(): Promise<void> {
  if (isRunning) {
    logger.warn('[FivetranScheduler] Previous sync still running — skipping');
    return;
  }
  isRunning = true;
  try {
    const report = await runRewardsSync();
    const summary = report.connectors
      .map((c) => `${c.source}:${c.recordsUpserted}`)
      .join(', ');
    logger.info(
      `[FivetranScheduler] Sync ${report.syncId.slice(0, 8)} — ${summary} (${report.totalMs}ms)`
    );
  } catch (err) {
    logger.error({ error: err }, '[FivetranScheduler] Sync error');
  } finally {
    isRunning = false;
  }
}
