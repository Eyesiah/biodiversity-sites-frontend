import { expect, test } from "bun:test";
import * as v from 'valibot';
import { onSiteHabitatBaselineSchema, enrichWithBaselineUnitsData, enrichWithUnitsLost, type OnSiteHabitatBaselineSchema } from "./habitatBaseline";

export function fixture(overrides: Partial<OnSiteHabitatBaselineSchema> = {}): OnSiteHabitatBaselineSchema {
    return {
        broadHabitat: "Woodland and forest",
        habitatType: "Other coniferous woodland",
        area: 1,
        strategicSignificance: "Location ecologically desirable but not in local strategy",
        condition: "Good",
        irreplaceableHabitat: false,
        areaRetained: 1,
        ...overrides,
    }
}

test("valid combinations of broad habitat and habitat type", () => {
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ broadHabitat: "Woodland and forest", habitatType: "Felled" })).success).toBeTrue()
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Urban tree" })).success).toBeTrue()

    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ broadHabitat: "Individual trees", habitatType: "Felled" })).success).toBeFalse()
})


test("condition validation", () => {
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ condition: "Good" })).success).toBeTrue()
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ condition: "Moderate" })).success).toBeTrue()
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ condition: "Poor" })).success).toBeTrue()

    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ condition: "Condition Assessment N/A" })).success).toBeFalse()
    expect(v.safeParse(onSiteHabitatBaselineSchema, fixture({ condition: "N/A - Other" })).success).toBeFalse()
})

test("enrichWithBaselineUnitsData calculations", () => {
    const inputData = {
        irreplaceableHabitat: false,
        area: 10,
        areaRetained: 6,
        areaEnhanced: 3,
        distinctivenessScore: 2,
        conditionScore: 0.8,
        strategicSignificanceMultiplier: 1.5,
    }

    const result = enrichWithBaselineUnitsData(inputData)

    expect(result.baselineUnitsRetained).toEqual(14.4)
    expect(result.baselineUnitsEnhanced).toEqual(7.2)
    expect(result.areaHabitatLost).toEqual(10 - 6 - 3)
    expect(result).toMatchObject(inputData)
})

test("enrichWithBaselineUnitsData with zero areas", () => {
    const inputData = {
        irreplaceableHabitat: false,
        area: 5,
        areaRetained: 0,
        areaEnhanced: 0,
        distinctivenessScore: 1,
        conditionScore: 1,
        strategicSignificanceMultiplier: 1,
    }

    const result = enrichWithBaselineUnitsData(inputData)

    expect(result.baselineUnitsRetained).toEqual(0)
    expect(result.baselineUnitsEnhanced).toEqual(0)
    expect(result.areaHabitatLost).toEqual(5)
})

test("enrichWithBaselineUnitsData full retention", () => {
    const inputData = {
        irreplaceableHabitat: false,
        area: 8,
        areaRetained: 8,
        areaEnhanced: 0,
        distinctivenessScore: 3,
        conditionScore: 0.9,
        strategicSignificanceMultiplier: 2,
    }

    const result = enrichWithBaselineUnitsData(inputData)

    expect(result.baselineUnitsRetained).toEqual(8 * 3 * 0.9 * 2)
    expect(result.baselineUnitsEnhanced).toEqual(0)
    expect(result.areaHabitatLost).toEqual(0)
})

test("enrichWithBaselineUnitsData zero when irreplaceable", () => {
    const inputData = {
        irreplaceableHabitat: true,
        area: 8,
        areaRetained: 7,
        areaEnhanced: 0,
        distinctivenessScore: 3,
        conditionScore: 0.9,
        strategicSignificanceMultiplier: 2,
    }

    const result = enrichWithBaselineUnitsData(inputData)

    expect(result.baselineUnitsRetained).toEqual(0)
    expect(result.baselineUnitsEnhanced).toEqual(0)
    expect(result.areaHabitatLost).toEqual(1)
})

test("enrichWithUnitsLost calculations", () => {
    expect(enrichWithUnitsLost({
        areaHabitatLost: 0,
        totalHabitatUnits: 100,
        baselineUnitsRetained: 60,
        baselineUnitsEnhanced: 30
    }).unitsLost).toEqual(0)

    expect(enrichWithUnitsLost({
        areaHabitatLost: 5,
        totalHabitatUnits: 100,
        baselineUnitsRetained: 60,
        baselineUnitsEnhanced: 30
    }).unitsLost).toEqual(10)

    expect(enrichWithUnitsLost({
        areaHabitatLost: 2,
        totalHabitatUnits: 50,
        baselineUnitsRetained: 40,
        baselineUnitsEnhanced: 8
    }).unitsLost).toEqual(2)
})

test("irreplaceable habitats produce zero total habitat units", () => {
    // Excel cell shows "Irreplaceable habitat - no units generated ⚠" → 0.
    const parsed = v.parse(onSiteHabitatBaselineSchema, fixture({
        broadHabitat: "Individual trees",
        habitatType: "Rural tree",
        area: 0.0765,
        condition: "Good",
        strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
        areaRetained: 0.0765,
        irreplaceableHabitat: true,
    }))
    expect(parsed.totalHabitatUnits).toEqual(0)
    expect(parsed.baselineUnitsRetained).toEqual(0)
    expect(parsed.unitsLost).toEqual(0)
})

test("irreplaceable habitats cannot lose any area", () => {
    const okay = fixture({
        broadHabitat: "Individual trees",
        habitatType: "Rural tree",
        area: 0.0765,
        condition: "Good",
        strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
        areaRetained: 0.0765,
        irreplaceableHabitat: true,
    })
    expect(v.safeParse(onSiteHabitatBaselineSchema, okay).success).toBeTrue()
    const notOkay = fixture({
        broadHabitat: "Individual trees",
        habitatType: "Rural tree",
        area: 0.0765,
        condition: "Good",
        strategicSignificance: "Area/compensation not in local strategy/ no local strategy",
        areaRetained: 0.0765 - 0.001,
        irreplaceableHabitat: true,
    })
    expect(v.safeParse(onSiteHabitatBaselineSchema, notOkay).success).toBeFalse()
})
