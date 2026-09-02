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

export default crons;
