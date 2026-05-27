import { fuzzyPicklist } from './valibotPipes';

export const bespokeCompensation = [
    "Yes",
    "No",
    "Pending",
] as const
export type BespokeCompensation = typeof bespokeCompensation[number];

export const bespokeCompensationSchema = fuzzyPicklist(bespokeCompensation);
