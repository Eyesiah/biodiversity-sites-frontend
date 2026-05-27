import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

export const yearsToTargetCondition = {
    "Good": 10,
    "Fairly Good": 8,
    "Moderate": 5,
    "Fairly Poor": 2,
    "Poor": 1,
} as const

const watercourseConditions = Object.keys(yearsToTargetCondition) as (keyof typeof yearsToTargetCondition)[];

export const watercourseConditionSchema = fuzzyPicklist(watercourseConditions);
export type WatercourseCondition = v.InferOutput<typeof watercourseConditionSchema>;

