
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        // Import the scheduler dynamically
        const { initScheduler } = await import('@/lib/scheduler');
        initScheduler();
    }
}
