// School colors data for dynamic theming
export interface SchoolColors {
    schoolID: number;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    phone: string;
    email: string;
    schoolYear: string;
    organizationID?: number;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
    isActive: boolean;
    createdAt: string;
}

export const SCHOOL_COLORS_DATA: SchoolColors[] = [
    // Array vacío - Los colores ahora vienen de la API
    // Si ves colores después de hacer login, significa que la integración con la API funciona correctamente
];

export const getSchoolColors = (schoolId: number): SchoolColors | undefined => {
    return SCHOOL_COLORS_DATA.find(school => school.schoolID === schoolId);
};
