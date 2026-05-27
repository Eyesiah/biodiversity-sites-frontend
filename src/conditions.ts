import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const conditions = [
    "Good",
    "Fairly Good",
    "Moderate",
    "Fairly Poor",
    "Poor",
    "Condition Assessment N/A",
    "N/A - Other",
] as const;

export const conditionSchema = fuzzyPicklist(conditions);
export type Condition = v.InferOutput<typeof conditionSchema>

