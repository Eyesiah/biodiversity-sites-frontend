import { findRow, getCellValue, normalizeNumber, normalizeYears, parseBoolean, type SheetView } from './excelHelpers';
import { decodeCol } from './cellRef';
import type { OnSiteHedgerowBaselineSchema } from '../onSite/hedgerowBaseline';
import type { OnSiteHedgerowEnhancementSchema } from '../onSite/hedgerowEnhancement';
import type { OnSiteWatercourseBaselineSchema } from '../onSite/watercourseBaseline';
import type { OnSiteWatercourseCreationSchema } from '../onSite/watercourseCreation';
import type { OnSiteWatercourseEnhancementSchema } from '../onSite/watercourseEnhancement';
import type { OffSiteWatercourseBaselineSchema } from '../offSite/watercourseBaseline';
import type { OffSiteWatercourseCreationSchema } from '../offSite/watercourseCreation';
import type { OffSiteWatercourseEnhancementSchema } from '../offSite/watercourseEnhancement';
import type { OnSiteHabitatBaselineSchema } from '../onSite/habitatBaseline';
import type { OnSiteHabitatCreationSchema } from '../onSite/habitatCreation';
import type { OnSiteHabitatEnhancementSchema } from '../onSite/habitatEnhancement';
import type { OffSiteHabitatBaselineSchema } from '../offSite/habitatBaseline';
import type { OffSiteHabitatCreationSchema } from '../offSite/habitatCreation';
import type { OffSiteHabitatEnhancementSchema } from '../offSite/habitatEnhancement';
import type { OnSiteHedgerowCreationSchema } from '../onSite/hedgerowCreation';
import type { OffSiteHedgerowBaselineSchema } from '../offSite/hedgerowBaseline';
import type { OffSiteHedgerowEnhancementSchema } from '../offSite/hedgerowEnhancement';
import type { OffSiteHedgerowCreationSchema } from '../offSite/hedgerowCreation';
import {
    onSiteHabitatBaselineSpec,
    onSiteHabitatCreationSpec,
    onSiteHabitatEnhancementSpec,
    offSiteHabitatBaselineSpec,
    offSiteHabitatCreationSpec,
    offSiteHabitatEnhancementSpec,
    onSiteHedgerowBaselineSpec,
    onSiteHedgerowCreationSpec,
    onSiteHedgerowEnhancementSpec,
    offSiteHedgerowBaselineSpec,
    offSiteHedgerowCreationSpec,
    offSiteHedgerowEnhancementSpec,
    onSiteWatercourseBaselineSpec,
    onSiteWatercourseCreationSpec,
    onSiteWatercourseEnhancementSpec,
    offSiteWatercourseBaselineSpec,
    offSiteWatercourseCreationSpec,
    offSiteWatercourseEnhancementSpec,
} from './columnMappings';

const colIndex = (letter: string) => decodeCol(letter);

export function parseOnSiteHabitatBaselineRow(sheet: SheetView, dataRow: number): OnSiteHabitatBaselineSchema {
    const c = onSiteHabitatBaselineSpec.columns;
    return {
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        irreplaceableHabitat: parseBoolean(getCellValue(sheet, dataRow, c.irreplaceableHabitat.column)),
        area: normalizeNumber(getCellValue(sheet, dataRow, c.area.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        areaRetained: normalizeNumber(getCellValue(sheet, dataRow, c.areaRetained.column)) || 0,
        areaEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.areaEnhanced.column)) || 0,
        bespokeCompensationAgreed: getCellValue(sheet, dataRow, c.bespokeCompensationAgreed.column) || undefined,
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
}

export function parseOnSiteHabitatCreationRow(sheet: SheetView, dataRow: number): OnSiteHabitatCreationSchema {
    const c = onSiteHabitatCreationSpec.columns;
    return {
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        area: normalizeNumber(getCellValue(sheet, dataRow, c.area.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatCreationInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreationInAdvance.column)),
        habitatCreationDelay: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreationDelay.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
};

export function parseOnSiteHabitatEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OnSiteHabitatEnhancementSchema {
    const c = onSiteHabitatEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(onSiteHabitatBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOnSiteHabitatBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatEnhancedInAdvance.column)),
        habitatEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.habitatEnhancedDelay.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    }
}


export function parseOffSiteHabitatBaselineRow(sheet: SheetView, dataRow: number): OffSiteHabitatBaselineSchema {
    const c = offSiteHabitatBaselineSpec.columns;
    return {
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        irreplaceableHabitat: parseBoolean(getCellValue(sheet, dataRow, c.irreplaceableHabitat.column)),
        area: normalizeNumber(getCellValue(sheet, dataRow, c.area.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column) || "Low",
        areaRetained: normalizeNumber(getCellValue(sheet, dataRow, c.areaRetained.column)) || 0,
        areaEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.areaEnhanced.column)) || 0,
        bespokeCompensationAgreed: getCellValue(sheet, dataRow, c.bespokeCompensationAgreed.column) || undefined,
        userComments: getCellValue(sheet, dataRow, c.userComments.column) || undefined,
        planningAuthorityComments: getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || undefined,
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
    }
};

export function parseOffSiteHabitatCreationRow(sheet: SheetView, dataRow: number): OffSiteHabitatCreationSchema {
    const c = offSiteHabitatCreationSpec.columns;
    return {
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        area: normalizeNumber(getCellValue(sheet, dataRow, c.area.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatCreationInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreationInAdvance.column)),
        habitatCreationDelay: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreationDelay.column)),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column) || "Low",
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
        baselineReferenceNumber: String(getCellValue(sheet, dataRow, c.baselineReferenceNumber.column) || ""),
    };
}

export function parseOffSiteHabitatEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OffSiteHabitatEnhancementSchema {
    const c = offSiteHabitatEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(offSiteHabitatBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOffSiteHabitatBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        broadHabitat: getCellValue(sheet, dataRow, c.broadHabitat.column),
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatEnhancedInAdvance.column)),
        habitatEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.habitatEnhancedDelay.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
    }
}

export function parseOnSiteHedgerowBaselineRow(sheet: SheetView, dataRow: number): OnSiteHedgerowBaselineSchema {
    const c = onSiteHedgerowBaselineSpec.columns;
    return {
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        lengthRetained: normalizeNumber(getCellValue(sheet, dataRow, c.lengthRetained.column)) || 0,
        lengthEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.lengthEnhanced.column)) || 0,
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    }
}

export function parseOnSiteHedgerowCreationRow(sheet: SheetView, dataRow: number): OnSiteHedgerowCreationSchema {
    const c = onSiteHedgerowCreationSpec.columns;
    return {
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatCreatedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreatedInAdvance.column)),
        delayInStartingHabitatCreation: normalizeYears(getCellValue(sheet, dataRow, c.delayInStartingHabitatCreation.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
}

export function parseOnSiteHedgerowEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OnSiteHedgerowEnhancementSchema {
    const c = onSiteHedgerowEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(onSiteHedgerowBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOnSiteHedgerowBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        hedgerowEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.hedgerowEnhancedInAdvance.column)),
        hedgerowEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.hedgerowEnhancedDelay.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    }
}

export function parseOffSiteHedgerowBaselineRow(sheet: SheetView, dataRow: number): OffSiteHedgerowBaselineSchema {
    const c = offSiteHedgerowBaselineSpec.columns;
    return {
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column) || undefined,
        lengthRetained: normalizeNumber(getCellValue(sheet, dataRow, c.lengthRetained.column)) || 0,
        lengthEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.lengthEnhanced.column)) || 0,
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
    };
}

export function parseOffSiteHedgerowEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OffSiteHedgerowEnhancementSchema {
    const c = offSiteHedgerowEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(offSiteHedgerowBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOffSiteHedgerowBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        hedgerowEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.hedgerowEnhancedInAdvance.column)),
        hedgerowEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.hedgerowEnhancedDelay.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
    }
}

export function parseOffSiteHedgerowCreationRow(sheet: SheetView, dataRow: number): OffSiteHedgerowCreationSchema {
    const c = offSiteHedgerowCreationSpec.columns;
    return {
        habitatType: getCellValue(sheet, dataRow, c.habitatType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column) || undefined,
        habitatCreatedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreatedInAdvance.column)),
        delayInStartingHabitatCreation: normalizeYears(getCellValue(sheet, dataRow, c.delayInStartingHabitatCreation.column)),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
        baselineReferenceNumber: String(getCellValue(sheet, dataRow, c.baselineReferenceNumber.column) || ""),
    };
}

export function parseOnSiteWatercourseBaselineRow(sheet: SheetView, dataRow: number): OnSiteWatercourseBaselineSchema {
    const c = onSiteWatercourseBaselineSpec.columns;
    return {
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        watercourseEncroachment: getCellValue(sheet, dataRow, c.watercourseEncroachment.column),
        riparianEncroachment: getCellValue(sheet, dataRow, c.riparianEncroachment.column),
        lengthRetained: normalizeNumber(getCellValue(sheet, dataRow, c.lengthRetained.column)) || 0,
        lengthEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.lengthEnhanced.column)) || 0,
        bespokeCompensation: getCellValue(sheet, dataRow, c.bespokeCompensation.column) || undefined,
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
}

export function parseOnSiteWatercourseCreationRow(sheet: SheetView, dataRow: number): OnSiteWatercourseCreationSchema {
    const c = onSiteWatercourseCreationSpec.columns;
    return {
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatCreatedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreatedInAdvance.column)),
        delayInStarting: normalizeYears(getCellValue(sheet, dataRow, c.delayInStarting.column)),
        watercourseEncroachment: getCellValue(sheet, dataRow, c.watercourseEncroachment.column),
        riparianEncroachment: getCellValue(sheet, dataRow, c.riparianEncroachment.column),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
}

export function parseOnSiteWatercourseEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OnSiteWatercourseEnhancementSchema {
    const c = onSiteWatercourseEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(onSiteWatercourseBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOnSiteWatercourseBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        watercourseEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.watercourseEnhancedInAdvance.column)),
        watercourseEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.watercourseEnhancedDelay.column)),
        watercourseEncroachment: String(getCellValue(sheet, dataRow, c.watercourseEncroachment.column) || ""),
        riparianEncroachment: String(getCellValue(sheet, dataRow, c.riparianEncroachment.column) || ""),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    }
}



export function parseOffSiteWatercourseBaselineRow(sheet: SheetView, dataRow: number): OffSiteWatercourseBaselineSchema {
    const c = offSiteWatercourseBaselineSpec.columns;
    return {
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        watercourseEncroachment: getCellValue(sheet, dataRow, c.watercourseEncroachment.column),
        riparianEncroachment: getCellValue(sheet, dataRow, c.riparianEncroachment.column),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column),
        lengthRetained: normalizeNumber(getCellValue(sheet, dataRow, c.lengthRetained.column)) || 0,
        lengthEnhanced: normalizeNumber(getCellValue(sheet, dataRow, c.lengthEnhanced.column)) || 0,
        bespokeCompensation: getCellValue(sheet, dataRow, c.bespokeCompensation.column) || undefined,
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
        offSiteReferenceNumber: String(getCellValue(sheet, dataRow, c.offSiteReferenceNumber.column) || ""),
    };
}

export function parseOffSiteWatercourseCreationRow(sheet: SheetView, dataRow: number): OffSiteWatercourseCreationSchema {
    const c = offSiteWatercourseCreationSpec.columns;
    return {
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        length: normalizeNumber(getCellValue(sheet, dataRow, c.length.column)),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        habitatCreatedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.habitatCreatedInAdvance.column)),
        delayInStarting: normalizeYears(getCellValue(sheet, dataRow, c.delayInStarting.column)),
        watercourseEncroachment: getCellValue(sheet, dataRow, c.watercourseEncroachment.column),
        riparianEncroachment: getCellValue(sheet, dataRow, c.riparianEncroachment.column),
        spatialRiskCategory: getCellValue(sheet, dataRow, c.spatialRiskCategory.column),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    };
}

export function parseOffSiteWatercourseEnhancementRow(baselineSheet: SheetView, sheet: SheetView, dataRow: number): OffSiteWatercourseEnhancementSchema {
    const c = offSiteWatercourseEnhancementSpec.columns;
    const baselineRef = getCellValue(sheet, dataRow, c.baselineRef.column);
    const baselineRow = findRow(baselineSheet, colIndex(offSiteWatercourseBaselineSpec.columns.ref.column), baselineRef);
    if (!baselineRow) throw Error("Unable to parse baseline row from ref: " + baselineRef);
    const baselineData = parseOffSiteWatercourseBaselineRow(baselineSheet, baselineRow);

    return {
        baseline: baselineData,
        watercourseType: getCellValue(sheet, dataRow, c.watercourseType.column),
        condition: getCellValue(sheet, dataRow, c.condition.column),
        strategicSignificance: getCellValue(sheet, dataRow, c.strategicSignificance.column),
        watercourseEnhancedInAdvance: normalizeYears(getCellValue(sheet, dataRow, c.watercourseEnhancedInAdvance.column)),
        watercourseEnhancedDelay: normalizeYears(getCellValue(sheet, dataRow, c.watercourseEnhancedDelay.column)),
        watercourseEncroachment: String(getCellValue(sheet, dataRow, c.watercourseEncroachment.column) || ""),
        riparianEncroachment: String(getCellValue(sheet, dataRow, c.riparianEncroachment.column) || ""),
        userComments: String(getCellValue(sheet, dataRow, c.userComments.column) || ""),
        planningAuthorityComments: String(getCellValue(sheet, dataRow, c.planningAuthorityComments.column) || ""),
        habitatReferenceNumber: String(getCellValue(sheet, dataRow, c.habitatReferenceNumber.column) || ""),
    }
}
