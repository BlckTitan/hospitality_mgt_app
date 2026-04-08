// This file will be used by Convex to schedule cron jobs
// The actual scheduling will be configured in the Convex dashboard
// or through the convex CLI

export const cronJobs = {
  // Daily aggregation - runs every day at 01:00 UTC
  daily: {
    schedule: "0 1 * * *", // Cron expression: minute hour day month day_of_week
    handler: "cron.aggregateDailySummaries",
  },
  // Weekly aggregation - runs every Monday at 02:00 UTC
  weekly: {
    schedule: "0 2 * * 1", // Monday at 02:00 UTC
    handler: "cron.aggregateWeeklySummaries",
  },
  // Monthly aggregation - runs on the 1st of each month at 03:00 UTC
  monthly: {
    schedule: "0 3 1 * *", // 1st of month at 03:00 UTC
    handler: "cron.aggregateMonthlySummaries",
  },
  // Yearly aggregation - runs on January 1st at 04:00 UTC
  yearly: {
    schedule: "0 4 1 1 *", // January 1st at 04:00 UTC
    handler: "cron.aggregateYearlySummaries",
  },
};
