import * as v from 'valibot';
import type { offSiteHabitatBaselineSchema } from './offSite/habitatBaseline';
import type { offSiteHabitatCreationSchema } from './offSite/habitatCreation';
import type { offSiteHabitatEnhancementSchema } from './offSite/habitatEnhancement';
import type { offSiteHedgerowBaselineSchema } from './offSite/hedgerowBaseline';
import type { offSiteHedgerowCreationSchema } from './offSite/hedgerowCreation';
import type { offSiteHedgerowEnhancementSchema } from './offSite/hedgerowEnhancement';
import type { offSiteWatercourseBaselineSchema } from './offSite/watercourseBaseline';
import type { offSiteWatercourseCreationSchema } from './offSite/watercourseCreation';
import type { offSiteWatercourseEnhancementSchema } from './offSite/watercourseEnhancement';
import type { onSiteHabitatBaselineSchema } from './onSite/habitatBaseline';
import type { onSiteHabitatCreationSchema } from './onSite/habitatCreation';
import type { onSiteHabitatEnhancementSchema } from './onSite/habitatEnhancement';
import type { onSiteHedgerowBaselineSchema } from './onSite/hedgerowBaseline';
import type { onSiteHedgerowCreationSchema } from './onSite/hedgerowCreation';
import type { onSiteHedgerowEnhancementSchema } from './onSite/hedgerowEnhancement';
import type { onSiteWatercourseBaselineSchema } from './onSite/watercourseBaseline';
import type { onSiteWatercourseCreationSchema } from './onSite/watercourseCreation';
import type { onSiteWatercourseEnhancementSchema } from './onSite/watercourseEnhancement';

export type AllFeatures = {
    // On-site Habitats (A-1, A-2, A-3)
    onSiteHabitatBaselines: v.InferOutput<typeof onSiteHabitatBaselineSchema>[];
    onSiteHabitatCreations: v.InferOutput<typeof onSiteHabitatCreationSchema>[];
    onSiteHabitatEnhancements: v.InferOutput<typeof onSiteHabitatEnhancementSchema>[];

    // Off-site Habitats (D-1, D-2, D-3)
    offSiteHabitatBaselines: v.InferOutput<typeof offSiteHabitatBaselineSchema>[];
    offSiteHabitatCreations: v.InferOutput<typeof offSiteHabitatCreationSchema>[];
    offSiteHabitatEnhancements: v.InferOutput<typeof offSiteHabitatEnhancementSchema>[];

    // On-site Hedgerows (B-1, B-2, B-3)
    onSiteHedgerowBaselines: v.InferOutput<typeof onSiteHedgerowBaselineSchema>[];
    onSiteHedgerowCreations: v.InferOutput<typeof onSiteHedgerowCreationSchema>[];
    onSiteHedgerowEnhancements: v.InferOutput<typeof onSiteHedgerowEnhancementSchema>[];

    // Off-site Hedgerows (E-1, E-2, E-3)
    offSiteHedgerowBaselines: v.InferOutput<typeof offSiteHedgerowBaselineSchema>[];
    offSiteHedgerowCreations: v.InferOutput<typeof offSiteHedgerowCreationSchema>[];
    offSiteHedgerowEnhancements: v.InferOutput<typeof offSiteHedgerowEnhancementSchema>[];

    // On-site Watercourses (C-1, C-2, C-3)
    onSiteWatercourseBaselines: v.InferOutput<typeof onSiteWatercourseBaselineSchema>[];
    onSiteWatercourseCreations: v.InferOutput<typeof onSiteWatercourseCreationSchema>[];
    onSiteWatercourseEnhancements: v.InferOutput<typeof onSiteWatercourseEnhancementSchema>[];

    // Off-site Watercourses (F-1, F-2, F-3)
    offSiteWatercourseBaselines: v.InferOutput<typeof offSiteWatercourseBaselineSchema>[];
    offSiteWatercourseCreations: v.InferOutput<typeof offSiteWatercourseCreationSchema>[];
    offSiteWatercourseEnhancements: v.InferOutput<typeof offSiteWatercourseEnhancementSchema>[];
};

