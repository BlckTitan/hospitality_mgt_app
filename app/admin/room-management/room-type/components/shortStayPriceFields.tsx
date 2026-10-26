'use client';

export const SHORT_STAY_HOURS = [1, 2, 3, 4, 5, 6, 7] as const;

export function emptyShortStayPrices() {
  return SHORT_STAY_HOURS.map(() => 0);
}

export function pricesFromRates(rates: Array<{ hours: number; amount: number }> | undefined) {
  return SHORT_STAY_HOURS.map((hours) => rates?.find((rate) => rate.hours === hours)?.amount ?? 0);
}

export function pricesToPayload(prices: number[]) {
  return SHORT_STAY_HOURS.map((hours, index) => ({
    hours,
    amount: Number.isFinite(prices[index]) ? prices[index] : 0,
  }));
}

export function ShortStayPriceFields({
  prices,
  onChange,
}: {
  prices: number[];
  onChange: (index: number, amount: number) => void;
}) {
  return (
    <div className="mb-4 w-full">
      <label className="mb-1 block text-sm font-semibold">Short stay prices</label>
      <p className="mb-2 text-sm text-gray-500">
        Package price for a visit that does not include the night. Leave a length at 0 to not sell it.
      </p>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {SHORT_STAY_HOURS.map((hours, index) => (
          <label key={hours} className="text-sm">
            {hours} hour{hours === 1 ? '' : 's'}
            <input
              type="number"
              min={0}
              step="0.01"
              className="w-full rounded border p-2"
              value={prices[index] ? String(prices[index]) : ''}
              onChange={(event) => onChange(index, event.target.value === '' ? 0 : Number(event.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
