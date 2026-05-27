import { difficulty } from './difficulty';

/**
 * Pure calculation: derives enhancement difficulty fields shared by habitat,
 * hedgerow and watercourse enhancement schemas.
 *
 * The decision tree is identical across families; only the source field name
 * (e.g. `habitatEnhancedInAdvance` vs `hedgerowEnhancedInAdvance`), the
 * "not possible" sentinel, and the noun/verb in the warning label differ.
 * Callers pre-resolve the standard difficulty and pass the family-specific
 * `lowDifficultyMessage`.
 */
export function calculateEnhancementDifficulty<S extends string>(input: {
    enhancedInAdvance: number | "30+",
    finalTimeToTargetCondition: number | "30+" | S,
    standardDifficultyOfEnhancement: keyof typeof difficulty,
    lowDifficultyMessage: string,
}) {
    const normalisedEnhancedInAdvance = typeof input.enhancedInAdvance === "string" ? 30 : input.enhancedInAdvance;

    const hasReachedTargetCondition =
        normalisedEnhancedInAdvance > 0 &&
        input.finalTimeToTargetCondition === 0;

    let appliedDifficultyMultiplier: string;
    let finalDifficultyOfEnhancement: keyof typeof difficulty;
    if (hasReachedTargetCondition) {
        appliedDifficultyMultiplier = input.lowDifficultyMessage;
        finalDifficultyOfEnhancement = "Low";
    } else {
        appliedDifficultyMultiplier = "Standard difficulty applied";
        finalDifficultyOfEnhancement = input.standardDifficultyOfEnhancement;
    }

    const difficultyMultiplierApplied = difficulty[finalDifficultyOfEnhancement];

    return {
        standardDifficultyOfEnhancement: input.standardDifficultyOfEnhancement,
        appliedDifficultyMultiplier,
        finalDifficultyOfEnhancement,
        difficultyMultiplierApplied,
    };
}
