import { describe, expect, it } from 'vitest';
import { calculateMileage, localDateInputValue, parseExpenseAmount } from './fieldWorkLogic';

describe('field-work validation', () => {
  it('calculates odometer mileage', () => {
    expect(calculateMileage({ start: '101.2', end: '112.7', miles: '' })).toEqual({ start: 101.2, end: 112.7, miles: 11.5 });
  });

  it('rejects conflicting odometer and manual mileage entry', () => {
    expect(calculateMileage({ start: '100', end: '110', miles: '12' }).error).toMatch(/either/i);
  });

  it('requires both odometer values', () => {
    expect(calculateMileage({ start: '100', end: '', miles: '5' }).error).toMatch(/both start and end/i);
  });

  it('rejects reversed, non-finite, zero, and negative mileage', () => {
    expect(calculateMileage({ start: '110', end: '100', miles: '' }).error).toBeTruthy();
    expect(calculateMileage({ start: '', end: '', miles: 'Infinity' }).error).toBeTruthy();
    expect(calculateMileage({ start: '', end: '', miles: '0' }).error).toBeTruthy();
    expect(calculateMileage({ start: '', end: '', miles: '-2' }).error).toBeTruthy();
    expect(calculateMileage({ start: '', end: '', miles: '100001' }).error).toBeTruthy();
  });

  it('rounds positive expenses to cents', () => {
    expect(parseExpenseAmount('12.345')).toBe(12.35);
    expect(parseExpenseAmount('0')).toBeUndefined();
    expect(parseExpenseAmount('NaN')).toBeUndefined();
    expect(parseExpenseAmount('100000000')).toBeUndefined();
  });

  it('formats local dates without UTC shifting', () => {
    expect(localDateInputValue(new Date(2026, 7, 18, 23, 59))).toBe('2026-08-18');
  });
});
