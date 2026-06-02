import { startAutoSync } from './lib/mock-apis/sync-engine';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Existing aggregator auto-sync
    const intervalSeconds = parseInt(process.env.AUTO_SYNC_INTERVAL_SECONDS || '60', 10);
    console.log('[OneCredit] Aggregator auto-sync registered (interval: ' + intervalSeconds + 's)');
    startAutoSync(intervalSeconds);

    // New Fivetran rewards scheduler
    const { startRewardsScheduler } = await import('./lib/fivetran/scheduler');
    startRewardsScheduler();
  }
}
