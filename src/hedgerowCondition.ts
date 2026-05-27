import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const condition = [
    "Good",
    "Moderate",
    "Poor",
] as const;
export const hedgerowConditionSchema = fuzzyPicklist(condition);
export type HedgerowCondition = v.InferOutput<typeof hedgerowConditionSchema>;


