export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fivetran rewards scheduler - disabled for live offer updates testing
    // const { startRewardsScheduler } = await import('./lib/fivetran/scheduler');
    // startRewardsScheduler();
  }
}
