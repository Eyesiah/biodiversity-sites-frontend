import Decimal from 'decimal.js';

export { Decimal };

/** Sum an array of numbers using Decimal arithmetic */
export function sumArr(nums: number[]): number {
    return nums.reduce((acc: Decimal, n: number) => acc.plus(n), new Decimal(0)).toNumber();
}
