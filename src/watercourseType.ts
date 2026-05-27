import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const watercourseTypes = [
    "Priority habitat",
    "Other rivers and streams",
    "Ditches",
    "Canals",
    "Culvert",
] as const;
export const watercourseTypeSchema = fuzzyPicklist(watercourseTypes);
export type WatercourseType = v.InferOutput<typeof watercourseTypeSchema>;
