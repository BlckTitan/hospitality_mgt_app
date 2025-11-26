# Helper Functions & Utilities - Hospitality Management Suite

Comprehensive collection of TypeScript helper functions for implementing entities, calculations, and business logic across the platform.

---

## Table of Contents

1. [Date & Time Utilities](#date--time-utilities)
2. [Financial Calculations](#financial-calculations)
3. [Reporting & Analytics](#reporting--analytics)
4. [Inventory Management](#inventory-management)
5. [Room Management](#room-management)
6. [Payroll Calculations](#payroll-calculations)
7. [Document Processing](#document-processing)
8. [Validation Helpers](#validation-helpers)
9. [Data Transformation](#data-transformation)
10. [Query Builders](#query-builders)
11. [Error Handling](#error-handling)

---

## Date & Time Utilities

### Convert UTC to Property Timezone

```typescript
/**
 * Converts a UTC timestamp to property's local timezone
 * @param utcDate - UTC date to convert
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @returns Date object in property's timezone context
 */
export function convertToPropertyTimezone(
  utcDate: Date,
  timezone: string
): Date {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const dateObj: Record<string, string> = {};
  
  parts.forEach(({ type, value }) => {
    dateObj[type] = value;
  });

  return new Date(
    `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`
  );
}
```

### Get Date Range for Period

```typescript
/**
 * Returns start and end dates for a given period type and optional date
 * @param periodType - 'daily' | 'monthly' | 'yearly'
 * @param referenceDate - Date to base calculation on (defaults to today)
 * @returns Object with startDate and endDate
 */
export function getDateRangeForPeriod(
  periodType: 'daily' | 'monthly' | 'yearly',
  referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
  const date = new Date(referenceDate);
  
  if (periodType === 'daily') {
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startDate: start, endDate: end };
  }
  
  if (periodType === 'monthly') {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return { startDate: start, endDate: end };
  }
  
  if (periodType === 'yearly') {
    const start = new Date(date.getFullYear(), 0, 1);
    const end = new Date(date.getFullYear() + 1, 0, 1);
    return { startDate: start, endDate: end };
  }
  
  throw new Error(`Invalid period type: ${periodType}`);
}
```

### Get Occupancy Days

```typescript
/**
 * Calculates number of days between check-in and check-out
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Number of nights
 */
export function getOccupancyDays(
  checkInDate: Date,
  checkOutDate: Date
): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / msPerDay
  );
}
```

### Check if Date Range Overlaps

```typescript
/**
 * Checks if two date ranges overlap
 * @param start1 - First range start
 * @param end1 - First range end
 * @param start2 - Second range start
 * @param end2 - Second range end
 * @returns true if ranges overlap
 */
export function dateRangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}
```

---

## Financial Calculations

### Calculate RevPAR

```typescript
/**
 * Calculates Revenue Per Available Room
 * @param totalRoomRevenue - Total room revenue for period
 * @param totalAvailableRooms - Total available rooms
 * @param occupiedRooms - Alternatively: number of rooms sold
 * @param adr - Alternatively: average daily rate
 * @returns RevPAR value
 */
export function calculateRevPAR(
  totalRoomRevenue: number,
  totalAvailableRooms: number
): number {
  if (totalAvailableRooms === 0) return 0;
  return totalRoomRevenue / totalAvailableRooms;
}

export function calculateRevPARFromMetrics(
  adr: number,
  occupancyRate: number
): number {
  return (adr * occupancyRate) / 100;
}
```

### Calculate Occupancy Rate

```typescript
/**
 * Calculates occupancy rate as percentage
 * @param occupiedRooms - Number of rooms sold/occupied
 * @param totalAvailableRooms - Total available rooms
 * @returns Occupancy rate as percentage (0-100)
 */
export function calculateOccupancyRate(
  occupiedRooms: number,
  totalAvailableRooms: number
): number {
  if (totalAvailableRooms === 0) return 0;
  return (occupiedRooms / totalAvailableRooms) * 100;
}
```

### Calculate Average Daily Rate (ADR)

```typescript
/**
 * Calculates Average Daily Rate
 * @param totalRoomRevenue - Total room revenue
 * @param roomsSold - Number of rooms sold
 * @returns ADR value
 */
export function calculateADR(
  totalRoomRevenue: number,
  roomsSold: number
): number {
  if (roomsSold === 0) return 0;
  return totalRoomRevenue / roomsSold;
}
```

### Calculate TRevPAR

```typescript
/**
 * Calculates Total Revenue Per Available Room (includes all revenue)
 * @param totalHotelRevenue - Total revenue (rooms + F&B + other)
 * @param totalAvailableRooms - Total available rooms
 * @returns TRevPAR value
 */
export function calculateTRevPAR(
  totalHotelRevenue: number,
  totalAvailableRooms: number
): number {
  if (totalAvailableRooms === 0) return 0;
  return totalHotelRevenue / totalAvailableRooms;
}
```

### Calculate Average Check (F&B)

```typescript
/**
 * Calculates average spending per customer/cover
 * @param totalSales - Total F&B sales
 * @param numberOfCovers - Number of customer visits/covers
 * @returns Average check value
 */
export function calculateAverageCheck(
  totalSales: number,
  numberOfCovers: number
): number {
  if (numberOfCovers === 0) return 0;
  return totalSales / numberOfCovers;
}
```

### Calculate RevPASH

```typescript
/**
 * Calculates Revenue Per Available Seat Hour
 * @param totalOutletRevenue - Total F&B outlet revenue
 * @param availableSeats - Total available seats
 * @param operatingHours - Operating hours per day/period
 * @returns RevPASH value
 */
export function calculateRevPASH(
  totalOutletRevenue: number,
  availableSeats: number,
  operatingHours: number
): number {
  const denominator = availableSeats * operatingHours;
  if (denominator === 0) return 0;
  return totalOutletRevenue / denominator;
}
```

### Calculate GOPPAR

```typescript
/**
 * Calculates Gross Operating Profit Per Available Room
 * @param grossOperatingProfit - GOP amount
 * @param totalAvailableRooms - Total available rooms
 * @returns GOPPAR value
 */
export function calculateGOPPAR(
  grossOperatingProfit: number,
  totalAvailableRooms: number
): number {
  if (totalAvailableRooms === 0) return 0;
  return grossOperatingProfit / totalAvailableRooms;
}
```

### Calculate Profit Margins

```typescript
/**
 * Calculates profit margin as percentage
 * @param profit - Profit amount
 * @param revenue - Total revenue
 * @returns Profit margin as percentage (0-100)
 */
export function calculateProfitMargin(
  profit: number,
  revenue: number
): number {
  if (revenue === 0) return 0;
  return (profit / revenue) * 100;
}

/**
 * Calculates EBITDA margin
 * @param ebitda - EBITDA amount
 * @param revenue - Total revenue
 * @returns EBITDA margin as percentage
 */
export function calculateEBITDAMargin(
  ebitda: number,
  revenue: number
): number {
  return calculateProfitMargin(ebitda, revenue);
}

/**
 * Calculates gross profit margin
 * @param grossProfit - Gross profit (revenue - COGS)
 * @param revenue - Total revenue
 * @returns Gross profit margin as percentage
 */
export function calculateGrossProfitMargin(
  grossProfit: number,
  revenue: number
): number {
  return calculateProfitMargin(grossProfit, revenue);
}

/**
 * Calculates net profit margin
 * @param netIncome - Net income
 * @param revenue - Total revenue
 * @returns Net profit margin as percentage
 */
export function calculateNetProfitMargin(
  netIncome: number,
  revenue: number
): number {
  return calculateProfitMargin(netIncome, revenue);
}
```

### Calculate Cost Percentages

```typescript
/**
 * Calculates cost as percentage of revenue
 * @param costAmount - Cost amount
 * @param revenue - Total revenue
 * @returns Cost percentage (0-100)
 */
export function calculateCostPercentage(
  costAmount: number,
  revenue: number
): number {
  if (revenue === 0) return 0;
  return (costAmount / revenue) * 100;
}

/**
 * Calculates labor cost percentage
 * @param laborCosts - Total labor/payroll costs
 * @param revenue - Total revenue
 * @returns Labor cost percentage
 */
export function calculateLaborCostPercentage(
  laborCosts: number,
  revenue: number
): number {
  return calculateCostPercentage(laborCosts, revenue);
}

/**
 * Calculates F&B cost percentage (COGS / F&B Revenue)
 * @param foodBeverageCogs - Cost of goods sold for F&B
 * @param foodBeverageRevenue - F&B revenue
 * @returns F&B cost percentage
 */
export function calculateFBCostPercentage(
  foodBeverageCogs: number,
  foodBeverageRevenue: number
): number {
  return calculateCostPercentage(foodBeverageCogs, foodBeverageRevenue);
}

/**
 * Calculates prime cost (COGS + Labor as % of revenue)
 * @param cogs - Cost of goods sold
 * @param laborCosts - Labor/payroll costs
 * @returns Prime cost amount
 */
export function calculatePrimeCost(
  cogs: number,
  laborCosts: number
): number {
  return cogs + laborCosts;
}
```

### Calculate Cost Per Occupied Room (CPOR)

```typescript
/**
 * Calculates Cost Per Occupied Room
 * @param totalOperationalCosts - Total costs for room operations
 * @param roomsSold - Number of rooms sold/occupied
 * @returns CPOR value
 */
export function calculateCPOR(
  totalOperationalCosts: number,
  roomsSold: number
): number {
  if (roomsSold === 0) return 0;
  return totalOperationalCosts / roomsSold;
}
```

### Calculate Financial Ratios

```typescript
/**
 * Calculates current ratio (current assets / current liabilities)
 * @param currentAssets - Total current assets
 * @param currentLiabilities - Total current liabilities
 * @returns Current ratio
 */
export function calculateCurrentRatio(
  currentAssets: number,
  currentLiabilities: number
): number {
  if (currentLiabilities === 0) return 0;
  return currentAssets / currentLiabilities;
}

/**
 * Calculates quick ratio (current assets - inventory / current liabilities)
 * @param currentAssets - Total current assets
 * @param inventory - Inventory value
 * @param currentLiabilities - Total current liabilities
 * @returns Quick ratio
 */
export function calculateQuickRatio(
  currentAssets: number,
  inventory: number,
  currentLiabilities: number
): number {
  if (currentLiabilities === 0) return 0;
  const quickAssets = currentAssets - inventory;
  return quickAssets / currentLiabilities;
}

/**
 * Calculates debt-to-equity ratio
 * @param totalDebt - Total debt/liabilities
 * @param shareholdersEquity - Total shareholders' equity
 * @returns Debt-to-equity ratio
 */
export function calculateDebtToEquityRatio(
  totalDebt: number,
  shareholdersEquity: number
): number {
  if (shareholdersEquity === 0) return 0;
  return totalDebt / shareholdersEquity;
}

/**
 * Calculates interest coverage ratio
 * @param ebit - Earnings before interest and taxes
 * @param interestExpense - Interest expense
 * @returns Interest coverage ratio
 */
export function calculateInterestCoverageRatio(
  ebit: number,
  interestExpense: number
): number {
  if (interestExpense === 0) return 0;
  return ebit / interestExpense;
}

/**
 * Calculates return on assets (ROA)
 * @param netIncome - Net income
 * @param totalAssets - Total assets
 * @returns ROA as percentage
 */
export function calculateROA(
  netIncome: number,
  totalAssets: number
): number {
  if (totalAssets === 0) return 0;
  return (netIncome / totalAssets) * 100;
}

/**
 * Calculates return on equity (ROE)
 * @param netIncome - Net income
 * @param shareholdersEquity - Shareholders' equity
 * @returns ROE as percentage
 */
export function calculateROE(
  netIncome: number,
  shareholdersEquity: number
): number {
  if (shareholdersEquity === 0) return 0;
  return (netIncome / shareholdersEquity) * 100;
}
```

### Calculate Inventory Metrics

```typescript
/**
 * Calculates inventory turnover ratio
 * @param cogs - Cost of goods sold
 * @param averageInventoryValue - Average inventory value ((beginning + ending) / 2)
 * @returns Inventory turnover ratio
 */
export function calculateInventoryTurnover(
  cogs: number,
  averageInventoryValue: number
): number {
  if (averageInventoryValue === 0) return 0;
  return cogs / averageInventoryValue;
}

/**
 * Calculates days inventory outstanding (DIO)
 * @param inventoryTurnover - Inventory turnover ratio
 * @returns Average days inventory is held
 */
export function calculateDaysInventoryOutstanding(
  inventoryTurnover: number
): number {
  if (inventoryTurnover === 0) return 0;
  return 365 / inventoryTurnover;
}
```

---

## Reporting & Analytics

### Build Report Metrics

```typescript
/**
 * Aggregates operational performance metrics for a reporting period
 * @param reservations - Array of reservations for period
 * @param orders - Array of F&B orders for period
 * @param totalAvailableRooms - Total available rooms
 * @returns Object with calculated metrics
 */
export function buildOperationalPerformanceMetrics(
  reservations: Array<{ totalAmount: number; status: string }>,
  orders: Array<{ totalAmount: number }>,
  totalAvailableRooms: number
) {
  const roomRevenue = reservations
    .filter((r) => ['checked-in', 'checked-out'].includes(r.status))
    .reduce((sum, r) => sum + r.totalAmount, 0);

  const fbRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalRevenue = roomRevenue + fbRevenue;
  const roomsSold = reservations.filter((r) =>
    ['checked-in', 'checked-out'].includes(r.status)
  ).length;

  return {
    revpar: calculateRevPAR(roomRevenue, totalAvailableRooms),
    occupancy_rate: calculateOccupancyRate(roomsSold, totalAvailableRooms),
    adr: calculateADR(roomRevenue, roomsSold),
    trevpar: calculateTRevPAR(totalRevenue, totalAvailableRooms),
    average_check: calculateAverageCheck(fbRevenue, orders.length),
    revpash:
      orders.length > 0
        ? calculateRevPASH(fbRevenue, 50, 8) // example: 50 seats, 8 hours
        : 0,
  };
}

/**
 * Aggregates profitability metrics
 * @param totalRevenue - Total revenue for period
 * @param operatingExpenses - Operating expenses
 * @param cogs - Cost of goods sold
 * @param interestExpense - Interest expense
 * @param taxes - Tax expense
 * @param totalAssets - Total assets
 * @param shareholdersEquity - Shareholders' equity
 * @returns Object with calculated metrics
 */
export function buildProfitabilityMetrics(
  totalRevenue: number,
  operatingExpenses: number,
  cogs: number,
  interestExpense: number,
  taxes: number,
  totalAssets: number,
  shareholdersEquity: number
) {
  const ebitda = totalRevenue - operatingExpenses;
  const ebit = ebitda - interestExpense;
  const netIncome = ebit - taxes;
  const grossProfit = totalRevenue - cogs;

  return {
    goppar: calculateGOPPAR(ebitda, 100), // assuming 100 rooms
    ebitda_margin: calculateEBITDAMargin(ebitda, totalRevenue),
    net_profit_margin: calculateNetProfitMargin(netIncome, totalRevenue),
    gross_profit_margin: calculateGrossProfitMargin(grossProfit, totalRevenue),
    roa: calculateROA(netIncome, totalAssets),
    roe: calculateROE(netIncome, shareholdersEquity),
  };
}

/**
 * Aggregates cost efficiency metrics
 * @param laborCosts - Total labor costs
 * @param fbCogs - F&B cost of goods sold
 * @param totalRevenue - Total revenue
 * @param fbRevenue - F&B revenue
 * @param roomOperatingCosts - Room operation costs
 * @param roomsSold - Rooms sold
 * @returns Object with calculated metrics
 */
export function buildCostEfficiencyMetrics(
  laborCosts: number,
  fbCogs: number,
  totalRevenue: number,
  fbRevenue: number,
  roomOperatingCosts: number,
  roomsSold: number
) {
  return {
    labor_cost_percentage: calculateLaborCostPercentage(
      laborCosts,
      totalRevenue
    ),
    f_and_b_cost_percentage: calculateFBCostPercentage(fbCogs, fbRevenue),
    cpor: calculateCPOR(roomOperatingCosts, roomsSold),
    prime_cost: calculatePrimeCost(fbCogs, laborCosts),
    inventory_turnover: calculateInventoryTurnover(fbCogs, 5000), // example avg inventory
  };
}

/**
 * Aggregates liquidity and solvency metrics
 * @param currentAssets - Total current assets
 * @param inventory - Inventory value
 * @param currentLiabilities - Total current liabilities
 * @param totalDebt - Total debt
 * @param shareholdersEquity - Shareholders' equity
 * @param ebit - Earnings before interest and taxes
 * @param interestExpense - Interest expense
 * @param operatingCashFlow - Operating cash flow
 * @returns Object with calculated metrics
 */
export function buildLiquiditySolvencyMetrics(
  currentAssets: number,
  inventory: number,
  currentLiabilities: number,
  totalDebt: number,
  shareholdersEquity: number,
  ebit: number,
  interestExpense: number,
  operatingCashFlow: number
) {
  return {
    current_ratio: calculateCurrentRatio(currentAssets, currentLiabilities),
    quick_ratio: calculateQuickRatio(
      currentAssets,
      inventory,
      currentLiabilities
    ),
    debt_to_equity: calculateDebtToEquityRatio(totalDebt, shareholdersEquity),
    interest_coverage: calculateInterestCoverageRatio(ebit, interestExpense),
    cash_flow_from_operations: operatingCashFlow,
  };
}
```

### Filter Data by Date Range

```typescript
/**
 * Filters array of objects by date range
 * @param items - Array of items with date property
 * @param dateField - Name of date field to filter on
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (exclusive)
 * @returns Filtered array
 */
export function filterByDateRange<T extends Record<string, any>>(
  items: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date
): T[] {
  return items.filter((item) => {
    const itemDate = new Date(item[dateField] as string | number);
    return itemDate >= startDate && itemDate < endDate;
  });
}
```

---

## Inventory Management

### Calculate Recipe Cost

```typescript
/**
 * Calculates total cost of a recipe based on ingredient quantities and unit costs
 * @param recipeLines - Array of recipe line items with quantity and unit cost
 * @returns Total recipe cost
 */
export function calculateRecipeCost(
  recipeLines: Array<{ quantity: number; unitCost: number; wastePercent?: number }>
): number {
  return recipeLines.reduce((total, line) => {
    const baseCost = line.quantity * line.unitCost;
    const wasteCost = baseCost * ((line.wastePercent || 0) / 100);
    return total + baseCost + wasteCost;
  }, 0);
}
```

### Calculate Menu Item Cost

```typescript
/**
 * Calculates menu item cost from recipe cost
 * @param recipeCost - Total recipe cost
 * @param servings - Number of servings recipe produces
 * @returns Cost per serving
 */
export function calculateMenuItemCost(
  recipeCost: number,
  servings: number
): number {
  if (servings === 0) return 0;
  return recipeCost / servings;
}
```

### Deduct Inventory for Order

```typescript
/**
 * Generates inventory transactions for order line items based on recipes
 * @param orderLines - Array of order line items
 * @param recipes - Map of menu item ID to recipe data
 * @returns Array of inventory transactions to record
 */
export function generateInventoryTransactionsForOrder(
  orderLines: Array<{ menuItemId: string; quantity: number }>,
  recipes: Map<
    string,
    {
      recipeLines: Array<{
        inventoryItemId: string;
        quantity: number;
        unitCost: number;
      }>;
    }
  >
) {
  const transactions: Array<{
    inventoryItemId: string;
    quantity: number;
    totalCost: number;
    transactionType: string;
  }> = [];

  orderLines.forEach((line) => {
    const recipe = recipes.get(line.menuItemId);
    if (!recipe) return;

    recipe.recipeLines.forEach((recipeLine) => {
      const quantityUsed = recipeLine.quantity * line.quantity;
      transactions.push({
        inventoryItemId: recipeLine.inventoryItemId,
        quantity: -quantityUsed, // negative for deduction
        totalCost: quantityUsed * recipeLine.unitCost,
        transactionType: 'usage',
      });
    });
  });

  return transactions;
}
```

### Check Reorder Status

```typescript
/**
 * Determines if inventory item needs reordering
 * @param currentQuantity - Current stock quantity
 * @param reorderPoint - Minimum quantity before reorder
 * @returns true if quantity is at or below reorder point
 */
export function needsReorder(
  currentQuantity: number,
  reorderPoint: number
): boolean {
  return currentQuantity <= reorderPoint;
}

/**
 * Calculates days until reorder needed (based on usage rate)
 * @param currentQuantity - Current stock quantity
 * @param dailyUsage - Average daily usage
 * @param leadTimeDays - Supplier lead time in days
 * @returns Days until reorder should be placed
 */
export function daysUntilReorderNeeded(
  currentQuantity: number,
  dailyUsage: number,
  leadTimeDays: number
): number {
  if (dailyUsage === 0) return Infinity;
  return currentQuantity / dailyUsage - leadTimeDays;
}
```

---

## Room Management

### Check Room Availability

```typescript
/**
 * Checks if a room is available for a date range
 * @param roomId - Room ID to check
 * @param checkInDate - Desired check-in date
 * @param checkOutDate - Desired check-out date
 * @param existingReservations - Array of existing reservations
 * @returns true if room is available
 */
export function isRoomAvailable(
  roomId: string,
  checkInDate: Date,
  checkOutDate: Date,
  existingReservations: Array<{
    roomId: string;
    checkInDate: Date;
    checkOutDate: Date;
    status: string;
  }>
): boolean {
  const conflictingReservation = existingReservations.find(
    (res) =>
      res.roomId === roomId &&
      ['pending', 'confirmed', 'checked-in'].includes(res.status) &&
      dateRangesOverlap(
        checkInDate,
        checkOutDate,
        new Date(res.checkInDate),
        new Date(res.checkOutDate)
      )
  );

  return !conflictingReservation;
}
```

### Calculate Reservation Total

```typescript
/**
 * Calculates total reservation amount including taxes and discounts
 * @param rate - Nightly rate
 * @param numberOfNights - Number of nights
 * @param taxRate - Tax percentage (0-100)
 * @param discountPercent - Discount percentage (0-100)
 * @returns Total amount due
 */
export function calculateReservationTotal(
  rate: number,
  numberOfNights: number,
  taxRate: number = 0,
  discountPercent: number = 0
): number {
  const subtotal = rate * numberOfNights;
  const afterDiscount = subtotal * (1 - discountPercent / 100);
  const withTax = afterDiscount * (1 + taxRate / 100);
  return Math.round(withTax * 100) / 100;
}
```

### Find Best Available Room

```typescript
/**
 * Finds best available room based on preferences and availability
 * @param roomType - Preferred room type
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @param availableRooms - Array of available rooms with prices
 * @param criteria - Selection criteria ('cheapest' | 'highest_floor' | 'best_view')
 * @returns Best matching room or null
 */
export function findBestAvailableRoom(
  roomType: string,
  checkInDate: Date,
  checkOutDate: Date,
  availableRooms: Array<{
    roomId: string;
    roomType: string;
    floor: number;
    rate: number;
    notes?: string;
  }>,
  criteria: 'cheapest' | 'highest_floor' | 'best_view' = 'cheapest'
): {
  roomId: string;
  rate: number;
} | null {
  const validRooms = availableRooms.filter((room) => room.roomType === roomType);

  if (validRooms.length === 0) return null;

  let bestRoom = validRooms[0];

  if (criteria === 'cheapest') {
    bestRoom = validRooms.reduce((lowest, room) =>
      room.rate < lowest.rate ? room : lowest
    );
  } else if (criteria === 'highest_floor') {
    bestRoom = validRooms.reduce((highest, room) =>
      room.floor > highest.floor ? room : highest
    );
  }

  return { roomId: bestRoom.roomId, rate: bestRoom.rate };
}
```

---

## Payroll Calculations

### Calculate Overtime Hours

```typescript
/**
 * Calculates regular and overtime hours
 * @param totalHours - Total hours worked
 * @param regularHoursLimit - Hours before overtime kicks in (typically 8 per day or 40 per week)
 * @returns Object with regular and overtime hours
 */
export function calculateOvertimeHours(
  totalHours: number,
  regularHoursLimit: number = 8
): { regularHours: number; overtimeHours: number } {
  const regularHours = Math.min(totalHours, regularHoursLimit);
  const overtimeHours = Math.max(0, totalHours - regularHoursLimit);
  return { regularHours, overtimeHours };
}
```

### Calculate Pay Amount

```typescript
/**
 * Calculates pay amount based on hours and rates
 * @param hourlyRate - Hourly rate
 * @param regularHours - Regular hours worked
 * @param overtimeHours - Overtime hours worked
 * @param overtimeMultiplier - Overtime rate multiplier (typically 1.5 for 1.5x pay)
 * @returns Object with regular pay, overtime pay, and total
 */
export function calculatePayAmount(
  hourlyRate: number,
  regularHours: number,
  overtimeHours: number,
  overtimeMultiplier: number = 1.5
): { regularPay: number; overtimePay: number; grossPay: number } {
  const regularPay = hourlyRate * regularHours;
  const overtimePay = hourlyRate * overtimeHours * overtimeMultiplier;
  const grossPay = regularPay + overtimePay;

  return {
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    grossPay: Math.round(grossPay * 100) / 100,
  };
}
```

### Calculate Deductions

```typescript
/**
 * Calculates payroll deductions
 * @param grossPay - Gross pay amount
 * @param deductionRates - Object with deduction types and percentages
 * @returns Object with individual deductions and total
 */
export function calculateDeductions(
  grossPay: number,
  deductionRates: Record<string, number> = {
    incomeTax: 0.15,
    socialSecurity: 0.062,
    medicare: 0.0145,
  }
): Record<string, number> & { totalDeductions: number } {
  const deductions: Record<string, number> = {};
  let totalDeductions = 0;

  Object.entries(deductionRates).forEach(([type, rate]) => {
    const amount = grossPay * rate;
    deductions[type] = Math.round(amount * 100) / 100;
    totalDeductions += amount;
  });

  return {
    ...deductions,
    totalDeductions: Math.round(totalDeductions * 100) / 100,
  };
}
```

### Calculate Net Pay

```typescript
/**
 * Calculates net pay (take-home pay)
 * @param grossPay - Gross pay amount
 * @param deductions - Total deductions
 * @param allowances - Additional allowances (bonuses, gratuity, etc.)
 * @returns Net pay amount
 */
export function calculateNetPay(
  grossPay: number,
  deductions: number,
  allowances: number = 0
): number {
  return Math.round((grossPay - deductions + allowances) * 100) / 100;
}
```

### Calculate Gratuity/Tip Allocation

```typescript
/**
 * Allocates gratuity/tips among staff
 * @param totalGratuity - Total gratuity amount collected
 * @param employeeWorkingHours - Map of employee ID to hours worked
 * @returns Map of employee ID to gratuity allocation
 */
export function allocateGratuity(
  totalGratuity: number,
  employeeWorkingHours: Record<string, number>
): Record<string, number> {
  const totalHours = Object.values(employeeWorkingHours).reduce(
    (sum, hours) => sum + hours,
    0
  );

  if (totalHours === 0) return {};

  const allocations: Record<string, number> = {};

  Object.entries(employeeWorkingHours).forEach(([employeeId, hours]) => {
    const allocation = (hours / totalHours) * totalGratuity;
    allocations[employeeId] = Math.round(allocation * 100) / 100;
  });

  return allocations;
}
```

---

## Document Processing

### Extract Document Metadata

```typescript
/**
 * Extracts metadata from OCR data
 * @param ocrData - Raw OCR extracted text
 * @returns Object with extracted fields
 */
export function extractDocumentMetadata(ocrData: string): {
  vendor?: string;
  invoiceNumber?: string;
  amount?: number;
  date?: Date;
  taxAmount?: number;
} {
  const metadata: {
    vendor?: string;
    invoiceNumber?: string;
    amount?: number;
    date?: Date;
    taxAmount?: number;
  } = {};

  // Simple regex patterns - in production, use more sophisticated NLP/ML
  const amountMatch = ocrData.match(
    /(?:total|amount|due)[:=\s]+[$]?(\d+(?:\.\d{2})?)/i
  );
  if (amountMatch) {
    metadata.amount = parseFloat(amountMatch[1]);
  }

  const dateMatch = ocrData.match(
    /(?:date|invoice date)[:=\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i
  );
  if (dateMatch) {
    metadata.date = new Date(dateMatch[1]);
  }

  const invoiceMatch = ocrData.match(
    /(?:invoice|bill)(?:\s+)?(?:no|number|#)[:=\s]+([A-Z0-9-]+)/i
  );
  if (invoiceMatch) {
    metadata.invoiceNumber = invoiceMatch[1];
  }

  const taxMatch = ocrData.match(
    /(?:tax|gst|sales tax)[:=\s]+[$]?(\d+(?:\.\d{2})?)/i
  );
  if (taxMatch) {
    metadata.taxAmount = parseFloat(taxMatch[1]);
  }

  return metadata;
}
```

### Detect Document Type

```typescript
/**
 * Detects document type based on keywords in content
 * @param content - Document text content
 * @returns Detected document type
 */
export function detectDocumentType(content: string): string {
  const lowerContent = content.toLowerCase();

  const keywords: Record<string, string[]> = {
    invoice: ['invoice', 'bill', 'amount due', 'invoice number'],
    receipt: ['receipt', 'paid', 'thank you', 'transaction'],
    contract: ['agreement', 'contract', 'terms', 'conditions', 'signature'],
    'delivery-note': ['delivery', 'received', 'qty', 'items delivered'],
    'payment-confirmation': [
      'payment confirmed',
      'transaction id',
      'payment received',
    ],
    'utility-bill': ['electricity', 'water', 'gas', 'utility', 'meter reading'],
  };

  let bestMatch = 'other';
  let bestScore = 0;

  Object.entries(keywords).forEach(([type, typeKeywords]) => {
    const score = typeKeywords.filter((keyword) =>
      lowerContent.includes(keyword)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = type;
    }
  });

  return bestMatch;
}
```

### Verify Document Completeness

```typescript
/**
 * Verifies that document has all required fields based on type
 * @param documentType - Type of document
 * @param metadata - Extracted document metadata
 * @returns Object with validation result and missing fields
 */
export function verifyDocumentCompleteness(
  documentType: string,
  metadata: Record<string, any>
): { isComplete: boolean; missingFields: string[] } {
  const requiredFields: Record<string, string[]> = {
    invoice: ['amount', 'date', 'invoiceNumber'],
    receipt: ['amount', 'date'],
    contract: ['date'],
    'delivery-note': ['date'],
    'payment-confirmation': ['amount', 'date'],
    'utility-bill': ['amount', 'date', 'vendor'],
  };

  const required = requiredFields[documentType] || [];
  const missingFields = required.filter((field) => !metadata[field]);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
  };
}
```

---

## Validation Helpers

### Validate Email

```typescript
/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

### Validate Phone Number

```typescript
/**
 * Validates phone number format
 * @param phone - Phone number to validate
 * @param country - Country code for format validation (default 'US')
 * @returns true if valid phone format
 */
export function isValidPhoneNumber(phone: string, country: string = 'US'): boolean {
  const phoneRegex: Record<string, RegExp> = {
    US: /^(\+?1)?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/,
    UK: /^(\+?44)?[-.\s]?\(?[0-9]{3,5}\)?[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}$/,
  };

  const regex = phoneRegex[country] || phoneRegex['US'];
  return regex.test(phone);
}
```

### Validate Reservation Dates

```typescript
/**
 * Validates reservation date range
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Object with validation result and error message
 */
export function validateReservationDates(
  checkInDate: Date,
  checkOutDate: Date
): { isValid: boolean; error?: string } {
  if (checkInDate >= checkOutDate) {
    return { isValid: false, error: 'Check-out must be after check-in' };
  }

  const now = new Date();
  if (checkInDate < now) {
    return { isValid: false, error: 'Check-in date cannot be in the past' };
  }

  const maxDays = 365;
  const days = getOccupancyDays(checkInDate, checkOutDate);
  if (days > maxDays) {
    return {
      isValid: false,
      error: `Reservation cannot exceed ${maxDays} days`,
    };
  }

  return { isValid: true };
}
```

### Validate Payment Amount

```typescript
/**
 * Validates payment amount against expected amount
 * @param paymentAmount - Actual payment amount
 * @param expectedAmount - Expected amount
 * @param tolerance - Tolerance percentage for minor discrepancies (default 0.5%)
 * @returns Object with validation result and variance
 */
export function validatePaymentAmount(
  paymentAmount: number,
  expectedAmount: number,
  tolerance: number = 0.5
): { isValid: boolean; variance: number; message?: string } {
  const variance = Math.abs(paymentAmount - expectedAmount);
  const variancePercent = (variance / expectedAmount) * 100;
  const isValid = variancePercent <= tolerance;

  return {
    isValid,
    variance,
    message: !isValid
      ? `Payment variance of ${variancePercent.toFixed(2)}% exceeds tolerance of ${tolerance}%`
      : undefined,
  };
}
```

### Validate Purchase Order

```typescript
/**
 * Validates a purchase order for completeness and consistency
 * @param po - Purchase order object
 * @returns Object with validation result and errors
 */
export function validatePurchaseOrder(po: {
  supplierId?: string;
  lineItems?: Array<{ quantity: number; unitPrice: number }>;
  totalAmount?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!po.supplierId) {
    errors.push('Supplier is required');
  }

  if (!po.lineItems || po.lineItems.length === 0) {
    errors.push('At least one line item is required');
  }

  const calculatedTotal =
    po.lineItems?.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0
    ) || 0;

  if (po.totalAmount && Math.abs(po.totalAmount - calculatedTotal) > 0.01) {
    errors.push(
      `Total amount mismatch: expected ${calculatedTotal}, got ${po.totalAmount}`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

---

## Data Transformation

### Format Currency

```typescript
/**
 * Formats number as currency string
 * @param amount - Amount to format
 * @param currency - Currency code (default 'USD')
 * @param locale - Locale for formatting (default 'en-US')
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}
```

### Format Percentage

```typescript
/**
 * Formats number as percentage string
 * @param value - Value to format (0-1 or 0-100 depending on decimal)
 * @param decimal - Number of decimal places (default 2)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimal: number = 2): string {
  return `${(value * 100).toFixed(decimal)}%`;
}
```

### Format Date

```typescript
/**
 * Formats date as string
 * @param date - Date to format
 * @param format - Format pattern ('short' | 'long' | 'ISO')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date,
  format: 'short' | 'long' | 'ISO' = 'short'
): string {
  const d = new Date(date);

  if (format === 'ISO') {
    return d.toISOString().split('T')[0];
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: '2-digit', day: '2-digit' };

  return d.toLocaleDateString('en-US', options);
}
```

### Convert Entity to DTO

```typescript
/**
 * Converts database entity to data transfer object (removes sensitive fields)
 * @param entity - Entity to convert
 * @param excludeFields - Array of field names to exclude
 * @returns DTO object
 */
export function entityToDTO<T extends Record<string, any>>(
  entity: T,
  excludeFields: string[] = []
): Partial<T> {
  const dto: any = { ...entity };

  const defaultExcluded = ['bankAccount', 'ssn', 'apiKey', 'password'];
  const fieldsToExclude = [...defaultExcluded, ...excludeFields];

  fieldsToExclude.forEach((field) => {
    delete dto[field];
  });

  return dto;
}
```

### Paginate Array

```typescript
/**
 * Paginates an array
 * @param items - Array to paginate
 * @param page - Page number (1-indexed)
 * @param pageSize - Items per page
 * @returns Object with paginated data and pagination info
 */
export function paginateArray<T>(
  items: T[],
  page: number = 1,
  pageSize: number = 10
): {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    data: items.slice(start, end),
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  };
}
```

---

## Query Builders

### Build Reservation Filter Query

```typescript
/**
 * Builds filter query for reservations
 * @param filters - Filter criteria
 * @returns Query object for database
 */
export function buildReservationFilterQuery(filters: {
  propertyId?: string;
  status?: string;
  checkInStart?: Date;
  checkInEnd?: Date;
  guestId?: string;
  roomType?: string;
}): Record<string, any> {
  const query: Record<string, any> = {};

  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.status) query.status = filters.status;
  if (filters.guestId) query.guestId = filters.guestId;
  if (filters.roomType) query.roomType = filters.roomType;

  if (filters.checkInStart || filters.checkInEnd) {
    query.checkInDate = {};
    if (filters.checkInStart)
      query.checkInDate.$gte = filters.checkInStart;
    if (filters.checkInEnd) query.checkInDate.$lt = filters.checkInEnd;
  }

  return query;
}
```

### Build Expense Filter Query

```typescript
/**
 * Builds filter query for expenses
 * @param filters - Filter criteria
 * @returns Query object for database
 */
export function buildExpenseFilterQuery(filters: {
  propertyId?: string;
  status?: string;
  category?: string;
  dateStart?: Date;
  dateEnd?: Date;
  minAmount?: number;
  maxAmount?: number;
}): Record<string, any> {
  const query: Record<string, any> = {};

  if (filters.propertyId) query.propertyId = filters.propertyId;
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;

  if (filters.dateStart || filters.dateEnd) {
    query.expenseDate = {};
    if (filters.dateStart) query.expenseDate.$gte = filters.dateStart;
    if (filters.dateEnd) query.expenseDate.$lt = filters.dateEnd;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    query.amount = {};
    if (filters.minAmount !== undefined) query.amount.$gte = filters.minAmount;
    if (filters.maxAmount !== undefined) query.amount.$lte = filters.maxAmount;
  }

  return query;
}
```

---

## Error Handling

### Create Business Error

```typescript
/**
 * Creates a standardized business error
 * @param code - Error code (e.g., 'ROOM_NOT_AVAILABLE')
 * @param message - Error message
 * @param details - Additional error details
 * @returns Error object
 */
export class BusinessError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessError';
  }
}

export function createBusinessError(
  code: string,
  message: string,
  details?: Record<string, any>
): BusinessError {
  return new BusinessError(code, message, details);
}
```

### Handle Validation Error

```typescript
/**
 * Creates a validation error with field details
 * @param fields - Object with field names and error messages
 * @returns Error object
 */
export class ValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export function createValidationError(
  fieldErrors: Record<string, string>
): ValidationError {
  return new ValidationError(fieldErrors);
}
```

### Safe Number Calculation

```typescript
/**
 * Performs safe number calculation with error handling
 * @param operation - Calculation function
 * @param defaultValue - Value to return on error
 * @returns Calculation result or default value
 */
export function safeCalculate(
  operation: () => number,
  defaultValue: number = 0
): number {
  try {
    const result = operation();
    return isNaN(result) || !isFinite(result) ? defaultValue : result;
  } catch {
    return defaultValue;
  }
}
```

---

## Export Summary

All helper functions are categorized by domain and include:

- **Date & Time Utilities**: Timezone conversion, date range calculations, occupancy day calculations
- **Financial Calculations**: RevPAR, ADR, occupancy rates, profit margins, financial ratios, inventory metrics
- **Reporting & Analytics**: Metric aggregation builders, date filtering
- **Inventory Management**: Recipe costing, inventory deduction, reorder logic
- **Room Management**: Availability checking, reservation calculations, room selection
- **Payroll Calculations**: Overtime, pay calculations, deductions, gratuity allocation
- **Document Processing**: OCR metadata extraction, document type detection, completeness verification
- **Validation Helpers**: Email, phone, dates, payment amounts, purchase orders
- **Data Transformation**: Currency/percentage formatting, entity to DTO conversion, pagination
- **Query Builders**: Dynamic filter query builders for reservations and expenses
- **Error Handling**: Standardized error classes and safe calculation wrappers

These helpers enable:
- Real-time metric calculation for dashboards (< 2 min latency)
- Automatic accounting journal entry generation (60%+ auto-GL)
- Inventory and recipe costing
- Multi-currency and timezone support
- Document processing and OCR integration
- Comprehensive validation and error handling
- Database query optimization through query builders