"use server"

import { calculateBaselineHU, calculateImprovementHU } from "@/lib/habitat";

export async function calcHU(formData) {
    const size = Number(formData.get("size"));
    const habitat = formData.get("habitat");
    const condition = formData.get("condition");
    const improvementType = formData.get("improvementType");

    const isBaseline = improvementType == "none" || improvementType == null || improvementType == '';
    const hu = isBaseline ? calculateBaselineHU(size, habitat, condition) : calculateImprovementHU(size, habitat, condition, improvementType);
    return {
      HU: hu
    }
    
}