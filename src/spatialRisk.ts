import * as v from 'valibot';
import { fuzzyPicklist } from './valibotPipes';

const spatialRiskCategories = [
    "Compensation inside LPA boundary or NCA of impact site",
    "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA",
    "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA",
    "This metric is being used by an off-site provider",
    "Intertidal habitats - Compensation inside Marine Plan Area of impact site",
    "Intertidal habitats - Compensation outside same Marine Plan Area but in neighbouring Marine Plan Area",
    "Intertidal habitats - Compensation outside Marine Plan Area of impact site and beyond neighbouring Marine Plan Area",
] as const;
export const spatialRiskCategorySchema = fuzzyPicklist(spatialRiskCategories);
export type SpatialRiskCategory = v.InferOutput<typeof spatialRiskCategorySchema>

const spatialRiskMultipliers: Record<SpatialRiskCategory, number> = {
    "Compensation inside LPA boundary or NCA of impact site": 1,
    "Compensation outside LPA or NCA of impact site, but in neighbouring LPA or NCA": 0.75,
    "Compensation outside LPA or NCA of impact site and neighbouring LPA or NCA": 0.5,
    "This metric is being used by an off-site provider": 1,
    "Intertidal habitats - Compensation inside Marine Plan Area of impact site": 1,
    "Intertidal habitats - Compensation outside same Marine Plan Area but in neighbouring Marine Plan Area": 0.75,
    "Intertidal habitats - Compensation outside Marine Plan Area of impact site and beyond neighbouring Marine Plan Area": 0.5,
}

export function getSpatialRiskMultiplier(category: SpatialRiskCategory): number {
    return spatialRiskMultipliers[category];
}

const watercourseSpatialRiskCategories = [
    "This metric is being used by an off-site provider",
    "Within waterbody catchment",
    "Outside waterbody catchment, but within operational catchment",
    "Outside operational catchment",
] as const;
export const watercourseSpatialRiskCategorySchema = fuzzyPicklist(watercourseSpatialRiskCategories);
export type WatercourseSpatialRiskCategory = v.InferOutput<typeof watercourseSpatialRiskCategorySchema>

const watercourseSpatialRiskMultipliers: Record<WatercourseSpatialRiskCategory, number> = {
    "This metric is being used by an off-site provider": 1,
    "Within waterbody catchment": 1,
    "Outside waterbody catchment, but within operational catchment": 0.75,
    "Outside operational catchment": 0.5,
}

export function getWatercourseSpatialRiskMultiplier(category: WatercourseSpatialRiskCategory): number {
    return watercourseSpatialRiskMultipliers[category];
}
