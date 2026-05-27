import * as v from 'valibot';
import { allHedgerows, type HedgerowLabel } from './hedgerows';
import { fuzzyPicklist } from './valibotPipes';

export const hedgerowTypeSchema = fuzzyPicklist(Object.keys(allHedgerows) as [HedgerowLabel, ...HedgerowLabel[]]);
export type HedgerowType = v.InferOutput<typeof hedgerowTypeSchema>;

