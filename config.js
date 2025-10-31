export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://environment.data.gov.uk/bng/api';

export const ARCGIS_LSOA_URL = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/ArcGIS/rest/services/Lower_layer_Super_Output_Areas_December_2021_Boundaries_EW_BFC_V10/FeatureServer/0/query';
export const ARCGIS_LSOA_NAME_FIELD = 'LSOA21NM'
export const ARCGIS_LNRS_URL = 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/Local_Nature_Recovery_Strategy_Areas_England/FeatureServer/0/query';
export const ARCGIS_NCA_URL = 'https://services.arcgis.com/JJzESW51TqeY9uat/arcgis/rest/services/National_Character_Areas_England/FeatureServer/0/query';
export const ARCGIS_LPA_URL = 'https://services1.arcgis.com/ESMARspQHYMw9BZ9/arcgis/rest/services/LPA_APR_2023_UK_BUC_V2/FeatureServer/0/query';

export const WFS_URL = 'https://bristoltrees.space/wfs/wfs-server.xq?SERVICE=WFS&REQUEST=GetCapabilities'

export const NAV_HEIGHT = '4rem';
export const MAP_KEY_HEIGHT = '3rem';
