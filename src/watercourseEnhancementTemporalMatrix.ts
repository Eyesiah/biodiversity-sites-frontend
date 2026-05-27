// THIS FILE IS GENERATED AUTOMATICALLY
// Source: G-7 WaterC' Data sheet, columns T through Y

/**
 * Watercourse enhancement temporal matrix
 * Maps baseline condition -> proposed condition to years to reach target
 */
export const watercourseEnhancementTemporalMatrix: Record<string, number | "N/A"> = {
    // From Poor baseline
    "Poor to Poor": 1,
    "Poor to Fairly Poor": 2,
    "Poor to Moderate": 4,
    "Poor to Fairly Good": 6,
    "Poor to Good": 8,

    // From Fairly Poor baseline
    "Fairly Poor to Poor": "N/A",
    "Fairly Poor to Fairly Poor": 1,
    "Fairly Poor to Moderate": 2,
    "Fairly Poor to Fairly Good": 4,
    "Fairly Poor to Good": 6,

    // From Moderate baseline
    "Moderate to Poor": "N/A",
    "Moderate to Fairly Poor": "N/A",
    "Moderate to Moderate": 1,
    "Moderate to Fairly Good": 2,
    "Moderate to Good": 4,

    // From Fairly Good baseline
    "Fairly Good to Poor": "N/A",
    "Fairly Good to Fairly Poor": "N/A",
    "Fairly Good to Moderate": "N/A",
    "Fairly Good to Fairly Good": 1,
    "Fairly Good to Good": 2,

    // From Good baseline
    "Good to Poor": "N/A",
    "Good to Fairly Poor": "N/A",
    "Good to Moderate": "N/A",
    "Good to Fairly Good": "N/A",
    "Good to Good": 1,
};
