export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Fivetran rewards scheduler
    const { startRewardsScheduler } = await import('./lib/fivetran/scheduler');
    startRewardsScheduler();
  }
}
