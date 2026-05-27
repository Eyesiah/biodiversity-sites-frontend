// Export the main parsing function
export { parseFile, type ParseFileOptions } from './parseFile';

// Streaming parser — yields rows incrementally; works in node, bun, browser, workers
export {
    parseFileStream,
    type ParseFileStreamInput,
    type ParseFileStreamOptions,
    type StreamedRow,
    type StreamedRowKind,
} from './streaming/parseFileStream';
export type { SheetView } from './excelHelpers';

// Export unchecked schemas — same enrich/calculate transforms as the validated
// schemas, but with all `v.check` business-logic guards removed. Use these
// directly to compute unit values for a single row without rejecting it on
// cross-field validation failures.
export { onSiteHabitatBaselineUncheckedSchema } from '../onSite/habitatBaseline';
export { onSiteHabitatCreationUncheckedSchema } from '../onSite/habitatCreation';
export { onSiteHabitatEnhancementUncheckedSchema } from '../onSite/habitatEnhancement';
export { onSiteHedgerowBaselineUncheckedSchema } from '../onSite/hedgerowBaseline';
export { onSiteHedgerowCreationUncheckedSchema } from '../onSite/hedgerowCreation';
export { onSiteHedgerowEnhancementUncheckedSchema } from '../onSite/hedgerowEnhancement';
export { onSiteWatercourseBaselineUncheckedSchema } from '../onSite/watercourseBaseline';
export { onSiteWatercourseCreationUncheckedSchema } from '../onSite/watercourseCreation';
export { onSiteWatercourseEnhancementUncheckedSchema } from '../onSite/watercourseEnhancement';
export { offSiteHabitatBaselineUncheckedSchema } from '../offSite/habitatBaseline';
export { offSiteHabitatCreationUncheckedSchema } from '../offSite/habitatCreation';
export { offSiteHabitatEnhancementUncheckedSchema } from '../offSite/habitatEnhancement';
export { offSiteHedgerowBaselineUncheckedSchema } from '../offSite/hedgerowBaseline';
export { offSiteHedgerowCreationUncheckedSchema } from '../offSite/hedgerowCreation';
export { offSiteHedgerowEnhancementUncheckedSchema } from '../offSite/hedgerowEnhancement';
export { offSiteWatercourseBaselineUncheckedSchema } from '../offSite/watercourseBaseline';
export { offSiteWatercourseCreationUncheckedSchema } from '../offSite/watercourseCreation';
export { offSiteWatercourseEnhancementUncheckedSchema } from '../offSite/watercourseEnhancement';

// Export all helpers from excelHelpers
export {
    MAX_DATA_ROWS,
    getCellValue,
    parseBoolean,
    normalizeNumber,
    findRow
} from './excelHelpers';

// Export all row parsers from rowParsers
export {
    parseOnSiteHabitatBaselineRow,
    parseOnSiteHabitatCreationRow,
    parseOnSiteHabitatEnhancementRow,
    parseOffSiteHabitatBaselineRow,
    parseOffSiteHabitatCreationRow,
    parseOffSiteHabitatEnhancementRow,
    parseOnSiteHedgerowBaselineRow,
    parseOnSiteHedgerowCreationRow,
    parseOnSiteHedgerowEnhancementRow,
    parseOffSiteHedgerowBaselineRow,
    parseOffSiteHedgerowEnhancementRow,
    parseOffSiteHedgerowCreationRow,
    parseOnSiteWatercourseBaselineRow,
    parseOnSiteWatercourseCreationRow,
    parseOnSiteWatercourseEnhancementRow,
    parseOffSiteWatercourseBaselineRow,
    parseOffSiteWatercourseCreationRow,
    parseOffSiteWatercourseEnhancementRow
} from './rowParsers';

export {
    parseOnSiteHabitatBaseline,
    parseOnSiteHabitatCreation,
    parseOnSiteHabitatEnhancement,
    parseOnSiteHedgerowBaseline,
    parseOnSiteHedgerowCreation,
    parseOnSiteHedgerowEnhancement,
    parseOnSiteWatercourseBaseline,
    parseOnSiteWatercourseCreation,
    parseOnSiteWatercourseEnhancement,
    parseOffSiteHabitatBaseline,
    parseOffSiteHabitatCreation,
    parseOffSiteHabitatEnhancement,
    parseOffSiteHedgerowBaseline,
    parseOffSiteHedgerowCreation,
    parseOffSiteHedgerowEnhancement,
    parseOffSiteWatercourseBaseline,
    parseOffSiteWatercourseCreation,
    parseOffSiteWatercourseEnhancement,
} from './dataParsers';

export type { OnSiteHabitatBaselineSchema, OnSiteHabitatBaseline } from '../onSite/habitatBaseline';
export type { OnSiteHabitatCreationSchema, OnSiteHabitatCreation } from '../onSite/habitatCreation';
export type { OnSiteHabitatEnhancementSchema, OnSiteHabitatEnhancement } from '../onSite/habitatEnhancement';
export type { OnSiteHedgerowBaselineSchema, OnSiteHedgerowBaseline } from '../onSite/hedgerowBaseline';
export type { OnSiteHedgerowCreationSchema, OnSiteHedgerowCreation } from '../onSite/hedgerowCreation';
export type { OnSiteHedgerowEnhancementSchema, OnSiteHedgerowEnhancement } from '../onSite/hedgerowEnhancement';
export type { OnSiteWatercourseBaselineSchema, OnSiteWatercourseBaseline } from '../onSite/watercourseBaseline';
export type { OnSiteWatercourseCreationSchema, OnSiteWatercourseCreation } from '../onSite/watercourseCreation';
export type { OnSiteWatercourseEnhancementSchema, OnSiteWatercourseEnhancement } from '../onSite/watercourseEnhancement';
export type { OffSiteHabitatBaselineSchema, OffSiteHabitatBaseline } from '../offSite/habitatBaseline';
export type { OffSiteHabitatCreationSchema, OffSiteHabitatCreation } from '../offSite/habitatCreation';
export type { OffSiteHabitatEnhancementSchema, OffSiteHabitatEnhancement } from '../offSite/habitatEnhancement';
export type { OffSiteHedgerowBaselineSchema, OffSiteHedgerowBaseline } from '../offSite/hedgerowBaseline';
export type { OffSiteHedgerowCreationSchema, OffSiteHedgerowCreation } from '../offSite/hedgerowCreation';
export type { OffSiteHedgerowEnhancementSchema, OffSiteHedgerowEnhancement } from '../offSite/hedgerowEnhancement';
export type { OffSiteWatercourseBaselineSchema, OffSiteWatercourseBaseline } from '../offSite/watercourseBaseline';
export type { OffSiteWatercourseCreationSchema, OffSiteWatercourseCreation } from '../offSite/watercourseCreation';
export type { OffSiteWatercourseEnhancementSchema, OffSiteWatercourseEnhancement } from '../offSite/watercourseEnhancement';

