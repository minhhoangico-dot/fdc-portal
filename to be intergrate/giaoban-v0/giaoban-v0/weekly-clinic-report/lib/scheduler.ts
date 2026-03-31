
import cron from 'node-cron';
import prisma from '@/lib/db/app-client';

const CRON_SCHEDULE = '0 23 * * 0'; // 23:00 Sunday

export function initScheduler() {
    console.log('Initializing Scheduler...');

    // Prevent multiple inits if this file is imported multiple times
    if ((global as any).schedulerInitialized) {
        console.log('Scheduler already initialized.');
        return;
    }
    (global as any).schedulerInitialized = true;

    cron.schedule(CRON_SCHEDULE, async () => {
        console.log('⏰ Running Weekly Report Scheduler task...');
        try {
            // We can call the API via fetch if the app is running accessible via localhost:3000
            // Or better, just invoke the logic if we move the generate logic to a lib function.
            // For simplicity and decoupling, calling the API via fetch is brittle without absolute URL.
            // So we will trigger the API route handler logic manually? No, route handlers expect Request.

            // I will implement a service function `generateReportSnapshot` in `lib/services/report.ts` 
            // to be shared by API and Scheduler.
            // For now, let's just use the `fetch` to localhost? We don't know the port.

            // Let's use `process.env.PORT` or default 3000.
            const port = process.env.PORT || 3000;
            const res = await fetch(`http://localhost:${port}/api/report/generate`, {
                method: 'POST'
            });

            if (res.ok) {
                console.log('✅ Scheduled report generation successful');
            } else {
                console.error('❌ Scheduled report generation failed', await res.text());
            }
        } catch (error) {
            console.error('❌ Scheduler error:', error);
        }
    });

    console.log(`✅ Scheduler configured for ${CRON_SCHEDULE}`);
}
