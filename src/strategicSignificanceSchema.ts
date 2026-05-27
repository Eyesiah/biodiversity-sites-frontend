import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const strategicSignificance = [
    {
        description: "Formally identified in local strategy",
        significance: "High strategic significance", multiplier: 1.15,
    },
    {
        description: "Location ecologically desirable but not in local strategy",
        significance: "Medium strategic significance", multiplier: 1.1
    },
    {
        description: "Area/compensation not in local strategy/ no local strategy",
        significance: "Low strategic significance", multiplier: 1,
    },
] as const;
export type StrategicSignificance = typeof strategicSignificance[number];

export const strategicSignificanceSchema = fuzzyPicklist(
    strategicSignificance.map(s => s.description),
);
export type StrategicSignificanceDescription = v.InferOutput<typeof strategicSignificanceSchema>

export const getStrategicSignificance = (desc: v.InferInput<typeof strategicSignificanceSchema>) => {
    return strategicSignificance.find(s => s.description === desc)!;
}
