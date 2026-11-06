export type SupplyCost = {
  label: string;
  amount: number;
};

export type CratePurchaseInput = {
  packQty: number;
  packPrice: number;
  unitsPerPack: number;
  supplyCosts?: { label?: string; amount?: number }[];
};

export type CratePurchase = {
  packQty: number;
  packPrice: number;
  unitsPerPack: number;
  supplyCosts: SupplyCost[];
  goodsCost: number;
  supplyTotal: number;
  qty: number;
  totalCost: number;
  unitCost: number;
};

const MAX_SUPPLY_COSTS = 8;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function roundUnitCost(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function cratePurchaseError(
  result: CratePurchase | SupplyCost[] | { error: string },
): result is { error: string } {
  return !Array.isArray(result) && "error" in result;
}

/** Blank amounts are unused rows. A filled amount needs a name. */
export function normalizeSupplyCosts(
  lines: { label?: string; amount?: number }[] | undefined,
): SupplyCost[] | { error: string } {
  const raw = lines ?? [];
  if (raw.length > MAX_SUPPLY_COSTS) {
    return { error: `Add at most ${MAX_SUPPLY_COSTS} supply costs` };
  }
  const cleaned: SupplyCost[] = [];
  for (const line of raw) {
    const label = (line.label ?? "").trim();
    const amount = line.amount;
    const amountMissing = typeof amount !== "number" || !Number.isFinite(amount);
    if (amountMissing) continue;
    if (!label) return { error: "Each supply cost needs a name" };
    if (label.length > 40) return { error: "A supply cost name must be 40 characters or less" };
    if (amount < 0) return { error: `${label} cannot be negative` };
    cleaned.push({ label, amount });
  }
  return cleaned;
}

/**
 * Bottle cost for one receipt.
 * Landed total is crates × price per crate, plus supply costs such as transportation.
 * Unit cost is that total divided by crates × bottles per crate.
 */
export function landedCratePurchase(
  input: CratePurchaseInput,
): CratePurchase | { error: string } {
  if (!Number.isFinite(input.packQty) || input.packQty <= 0) {
    return { error: "Enter the number of crates" };
  }
  if (!Number.isFinite(input.packPrice) || input.packPrice < 0) {
    return { error: "Enter a price per crate of 0 or more" };
  }
  if (!Number.isInteger(input.unitsPerPack) || input.unitsPerPack < 1) {
    return { error: "Enter how many bottles are in one crate" };
  }
  const supplyCosts = normalizeSupplyCosts(input.supplyCosts);
  if (cratePurchaseError(supplyCosts)) return supplyCosts;

  const goodsCost = roundMoney(input.packQty * input.packPrice);
  const supplyTotal = roundMoney(supplyCosts.reduce((sum, line) => sum + line.amount, 0));
  const totalCost = roundMoney(goodsCost + supplyTotal);
  const qty = input.packQty * input.unitsPerPack;
  if (!(qty > 0) || !Number.isFinite(qty)) {
    return { error: "This receipt must add at least one bottle" };
  }
  return {
    packQty: input.packQty,
    packPrice: input.packPrice,
    unitsPerPack: input.unitsPerPack,
    supplyCosts,
    goodsCost,
    supplyTotal,
    qty,
    totalCost,
    unitCost: roundUnitCost(totalCost / qty),
  };
}
