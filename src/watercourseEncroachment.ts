import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

export const watercourseEncroachmentMultipliers = {
    "No Encroachment": 1,
    "Minor": 0.8,
    "Major": 0.5,
    "N/A - Culvert": 0.68,
} as const;

export const riparianEncroachmentMultipliers = {
    "Major/Major": 0.75,
    "Major/Moderate": 0.8,
    "Major/Minor": 0.84,
    "Major/No Encroachment": 0.87,
    "Moderate/ Moderate": 0.85,
    "Moderate/ Minor": 0.9,
    "Moderate/ No Encroachment": 0.92,
    "Minor/ Minor": 0.95,
    "Minor/ No Encroachment": 0.98,
    "No Encroachment/ No Encroachment": 1,
    "N/A - Culvert": 1,
} as const

// Watercourse encroachment levels for creation
const watercourseEncroachmentKeys = Object.keys(watercourseEncroachmentMultipliers) as (keyof typeof watercourseEncroachmentMultipliers)[];

export const watercourseEncroachmentSchema = fuzzyPicklist(watercourseEncroachmentKeys);
export type WatercourseEncroachment = v.InferOutput<typeof watercourseEncroachmentSchema>

// Riparian encroachment levels for creation
const riparianEncroachmentKeys = Object.keys(riparianEncroachmentMultipliers) as (keyof typeof riparianEncroachmentMultipliers)[];

export const riparianEncroachmentSchema = fuzzyPicklist(riparianEncroachmentKeys);
export type RiparianEncroachment = v.InferOutput<typeof riparianEncroachmentSchema>

