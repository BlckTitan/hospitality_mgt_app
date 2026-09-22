import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Local Convex expiry only. Clerk invitation emails follow Clerk's own TTL.
crons.cron(
  "expire pending invitations",
  "0 0 * * *",
  internal.users.expirePendingInvites,
  {},
);

crons.cron(
  "create preventive maintenance orders",
  "0 6 * * *",
  internal.assets.createPreventiveOrdersDue,
  {},
);

crons.cron(
  "open current bill periods",
  "0 6 * * *",
  internal.billing.generateCurrentPeriods,
  {},
);

crons.cron(
  "aggregate daily bar sales",
  "0 1 * * *",
  internal.cron.aggregateDailySummaries,
  {},
);

crons.cron(
  "aggregate weekly bar sales",
  "0 2 * * 1",
  internal.cron.aggregateWeeklySummaries,
  {},
);

crons.cron(
  "aggregate monthly bar sales",
  "0 3 1 * *",
  internal.cron.aggregateMonthlySummaries,
  {},
);

crons.cron(
  "aggregate yearly bar sales",
  "0 4 1 1 *",
  internal.cron.aggregateYearlySummaries,
  {},
);

export default crons;
