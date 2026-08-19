export function localDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const MAX_MILES_PER_ENTRY = 100_000;
export const MAX_EXPENSE_AMOUNT = 99_999_999.99;

function finitePositive(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function calculateMileage(input: { start: string; end: string; miles: string }): { miles?: number; start?: number; end?: number; error?: string } {
  const hasStart = input.start.trim() !== '';
  const hasEnd = input.end.trim() !== '';
  if (hasStart !== hasEnd) return { error: 'Enter both start and end odometer values, or leave both blank and enter total miles.' };

  if (hasStart && hasEnd) {
    if (input.miles.trim() !== '') return { error: 'Use either start/end odometer values or total miles, not both.' };
    const start = Number(input.start);
    const end = Number(input.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0) return { error: 'Odometer values must be valid non-negative numbers.' };
    if (end < start) return { error: 'End odometer cannot be less than start odometer.' };
    const miles = Number((end - start).toFixed(1));
    if (miles <= 0) return { error: 'Mileage must be greater than zero.' };
    if (miles > MAX_MILES_PER_ENTRY) return { error: `Mileage cannot exceed ${MAX_MILES_PER_ENTRY.toLocaleString()} miles in one entry.` };
    return { start, end, miles };
  }

  const miles = finitePositive(input.miles);
  if (miles === undefined) return { error: 'Enter valid business miles greater than zero.' };
  const rounded = Number(miles.toFixed(1));
  if (rounded > MAX_MILES_PER_ENTRY) return { error: `Mileage cannot exceed ${MAX_MILES_PER_ENTRY.toLocaleString()} miles in one entry.` };
  return { miles: rounded };
}

export function parseExpenseAmount(value: string): number | undefined {
  const parsed = finitePositive(value);
  if (parsed === undefined) return undefined;
  const rounded = Math.round((parsed + Number.EPSILON) * 100) / 100;
  return rounded <= MAX_EXPENSE_AMOUNT ? rounded : undefined;
}
