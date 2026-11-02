const VALUE_ALIASES: Record<string, string> = {
  fnb: "food beverage",
  utilities: "billing",
  supplies: "inventory",
  staff: "payroll",
  cable: "cable tv",
};

function skipKey(key: string) {
  if (key.startsWith("_")) return true;
  if (key.endsWith("Id")) return true;
  if (key.endsWith("Url")) return true;
  return key === "permissions" || key === "content" || key === "preferences";
}

function pushString(parts: string[], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  parts.push(trimmed);
  const spaced = trimmed.replace(/[-_]+/g, " ");
  if (spaced !== trimmed) parts.push(spaced);
  const alias = VALUE_ALIASES[trimmed];
  if (alias) parts.push(alias);
}

function booleanLabel(key: string, value: boolean) {
  if (key === "isActive") return value ? "active" : "inactive";
  if (key === "isReady") return value ? "ready" : "not ready";
  if (key === "isFinalized") return value ? "finalized" : "open";
  if (key === "isMetered") return value ? "metered" : "not metered";
  if (key === "paid") return value ? "paid" : "unpaid";
  if (key === "isSystemRole" || key === "isSystem") return value ? "system" : "custom";
  if (key === "isDefault") return value ? "default" : "";
  if (key === "isCover") return value ? "cover covered" : "";
  return "";
}

function collectText(value: unknown, depth: number, parts: string[]) {
  if (value == null || depth > 4) return;
  if (typeof value === "string") {
    pushString(parts, value);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    if (Math.abs(value) >= 1e11 && Math.abs(value) < 1e14) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) parts.push(date.toISOString().slice(0, 10));
      return;
    }
    parts.push(String(value));
    return;
  }
  if (typeof value === "boolean") return;
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, depth + 1, parts);
    return;
  }
  if (typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (skipKey(key)) continue;
      if (typeof nested === "boolean") {
        const label = booleanLabel(key, nested);
        if (label) parts.push(label);
        continue;
      }
      collectText(nested, depth + 1, parts);
    }
  }
}

/** Case-insensitive match against the text, dates, and status labels on a list row. */
export function rowMatchesSearch(row: unknown, term: string) {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return true;
  const parts: string[] = [];
  collectText(row, 0, parts);
  return parts.join(" ").toLowerCase().includes(needle);
}
