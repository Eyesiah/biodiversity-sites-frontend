import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const distinctiveness = [
    'V.High',
    'High',
    'Medium',
    'Low',
    'V.Low',
    'Irreplaceable',
] as const;
export const distinctivenessSchema = fuzzyPicklist(distinctiveness);
export type DistinctivenessCategory = v.InferOutput<typeof distinctivenessSchema>;

export const distinctivenessCategories = {
    "V.High": { score: 8 as const, suggestedAction: 'Same habitat required – bespoke compensation option ⚠' as const },
    "High": { score: 6 as const, suggestedAction: 'Same habitat required =' as const },
    "Medium": { score: 4 as const, suggestedAction: 'Same broad habitat or a higher distinctiveness habitat required (≥)' as const },
    "Low": { score: 2 as const, suggestedAction: 'Same distinctiveness or better habitat required ≥' as const },
    "V.Low": { score: 0 as const, suggestedAction: 'Compensation Not Required' as const },
    "Irreplaceable": { score: Infinity, suggestedAction: 'Bespoke compensation likely to be required' as const }
} as const satisfies { [K in DistinctivenessCategory]: any };

export type SuggestedTradingActions = typeof distinctivenessCategories[DistinctivenessCategory]['suggestedAction']
