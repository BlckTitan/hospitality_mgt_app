const DAY_MS = 86400000;
function lastUtcDay(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function dueDateForCycle(periodStart, frequency, cycleDate) {
  const cycle = new Date(cycleDate);
  const start = new Date(periodStart);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + 1;
  if (frequency === "weekly") {
    const daysFromMonday = (cycle.getUTCDay() + 6) % 7;
    return periodStart + daysFromMonday * DAY_MS;
  }
  if (frequency === "monthly") {
    const day = Math.min(cycle.getUTCDate(), lastUtcDay(year, month));
    return Date.UTC(year, month - 1, day);
  }
  const cycleMonth = cycle.getUTCMonth() + 1;
  const day = Math.min(cycle.getUTCDate(), lastUtcDay(year, cycleMonth));
  return Date.UTC(year, cycleMonth - 1, day);
}
const cycle = Date.UTC(2026, 10, 20);
const fmt = (n) => new Date(n).toISOString().slice(0, 10);
console.log("monthly", fmt(dueDateForCycle(Date.UTC(2026, 10, 1), "monthly", cycle)));
console.log("weekly", fmt(dueDateForCycle(Date.UTC(2026, 10, 2), "weekly", cycle)));
console.log("yearly", fmt(dueDateForCycle(Date.UTC(2026, 0, 1), "annually", cycle)));
console.log("feb31", fmt(dueDateForCycle(Date.UTC(2026, 1, 1), "monthly", Date.UTC(2026, 0, 31))));
