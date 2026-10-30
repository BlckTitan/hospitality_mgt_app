export const BUILTIN_BEVERAGE_CATEGORIES = [
  "spirits",
  "wine",
  "Lager beer",
  "cocktails",
  "non-alcoholic",
  "liqueurs",
  "whiskey",
  "vodka",
  "rum",
  "gin",
  "tequila",
  "brandy",
  "cognac",
  "champagne",
  "other",
] as const;

export function beverageCategoryLabel(name: string) {
  if (!name) return name;
  return name.charAt(0).toUpperCase() + name.slice(1).replaceAll("-", " ");
}
