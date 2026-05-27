import { describe, expect, test } from "bun:test";
import { normalizeNumber, normalizeYears } from "./excelHelpers";

describe("normalizeNumber", () => {
    test("returns the number rounded to 8 dp", () => {
        expect(normalizeNumber(1.234567891234)).toBe(1.23456789);
    });

    test("returns 0 for null", () => {
        expect(normalizeNumber(null)).toBe(0);
    });

    test("returns 0 for undefined", () => {
        expect(normalizeNumber(undefined)).toBe(0);
    });

    test("returns 0 for non-numeric strings", () => {
        expect(normalizeNumber("30+")).toBe(0);
        expect(normalizeNumber("abc")).toBe(0);
    });
});

describe("normalizeYears", () => {
    test("returns the number for numeric input", () => {
        expect(normalizeYears(5)).toBe(5);
        expect(normalizeYears(0)).toBe(0);
    });

    test("preserves the literal '30+'", () => {
        expect(normalizeYears("30+")).toBe("30+");
    });

    test("preserves '30+' with surrounding whitespace", () => {
        expect(normalizeYears(" 30+ ")).toBe("30+");
    });

    test("returns 0 for null", () => {
        expect(normalizeYears(null)).toBe(0);
    });

    test("returns 0 for undefined", () => {
        expect(normalizeYears(undefined)).toBe(0);
    });

    test("returns 0 for other strings", () => {
        expect(normalizeYears("abc")).toBe(0);
    });
});
