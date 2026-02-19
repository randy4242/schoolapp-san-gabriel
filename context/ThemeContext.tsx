import React, { createContext, useState, useEffect, useContext } from 'react';
import { getSchoolColors } from '../data/schoolColors';
import { theme } from '../styles/theme';

interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    logoUrl: string;
}

interface ThemeContextType {
    currentColors: ThemeColors;
    schoolName: string;
    applySchoolTheme: (schoolId: number) => void;
}

const THEME_STORAGE_KEY = 'schoolTheme';
const SCHOOL_NAME_STORAGE_KEY = 'schoolName';
const DEFAULT_LOGO = 'https://i.postimg.cc/TwvTg2P6/LOGO-VERTICAL-BLANCO-Y-ROJO.png';

export const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentColors, setCurrentColors] = useState<ThemeColors>({
        primary: theme.colors.primary,
        secondary: theme.colors.accent,
        accent: theme.colors.secondary,
        logoUrl: DEFAULT_LOGO,
    });
    const [schoolName, setSchoolName] = useState<string>('SchoolApp');

    // Load persisted theme on mount
    useEffect(() => {
        loadPersistedTheme();

        // Listen for login events to apply school theme
        const handleSchoolLogin = (event: CustomEvent) => {
            const { schoolData, schoolId } = event.detail;

            if (schoolData) {
                // Use API data if available
                applySchoolThemeFromData(schoolData);
            } else if (schoolId) {
                // Fallback to hardcoded data if API fails
                applySchoolTheme(schoolId);
            }
        };

        window.addEventListener('schoolLogin', handleSchoolLogin as EventListener);

        return () => {
            window.removeEventListener('schoolLogin', handleSchoolLogin as EventListener);
        };
    }, []);


    // Apply colors to CSS variables whenever currentColors changes
    useEffect(() => {
        applyCssVariables(currentColors);
    }, [currentColors]);

    const loadPersistedTheme = () => {
        try {
            const stored = localStorage.getItem(THEME_STORAGE_KEY);
            if (stored) {
                const colors: ThemeColors = JSON.parse(stored);
                setCurrentColors(colors);
            }
            const storedName = localStorage.getItem(SCHOOL_NAME_STORAGE_KEY);
            if (storedName) {
                setSchoolName(storedName);
            }
        } catch (error) {
            console.error('Failed to load persisted theme:', error);
        }
    };

    const persistTheme = (colors: ThemeColors, name: string) => {
        try {
            localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(colors));
            localStorage.setItem(SCHOOL_NAME_STORAGE_KEY, name);
        } catch (error) {
            console.error('Failed to persist theme:', error);
        }
    };

    const applyCssVariables = (colors: ThemeColors) => {
        const root = document.documentElement;

        // Apply primary color
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-header', colors.primary);
        root.style.setProperty('--color-sidebar-background', colors.primary);

        // Apply secondary color
        root.style.setProperty('--color-secondary', colors.secondary);

        // Apply accent color
        root.style.setProperty('--color-accent', colors.accent);
        root.style.setProperty('--color-danger', colors.accent);
        root.style.setProperty('--color-danger-dark', colors.accent);

        // Update sidebar colors to match primary
        root.style.setProperty('--color-sidebar-border', colors.primary);
        root.style.setProperty('--color-sidebar-bgHover', adjustColorBrightness(colors.primary, 10));
    };

    const adjustColorBrightness = (color: string, percent: number): string => {
        // Simple brightness adjustment for hover states
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return '#' + (
            0x1000000 +
            (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 1 ? 0 : B) : 255)
        ).toString(16).slice(1);
    };

    // New function: Apply theme from school data received from API
    const applySchoolThemeFromData = (schoolData: any) => {
        const colors: ThemeColors = {
            primary: schoolData.primaryColor,
            secondary: schoolData.secondaryColor,
            accent: schoolData.accentColor,
            logoUrl: schoolData.logoUrl || DEFAULT_LOGO,
        };

        setCurrentColors(colors);
        setSchoolName(schoolData.name || 'SchoolApp');
        persistTheme(colors, schoolData.name || 'SchoolApp');

        console.log(`Applied theme for ${schoolData.name}:`, colors);
    };

    // Legacy function: kept for backward compatibility (can be removed later)
    const applySchoolTheme = (schoolId: number) => {
        const schoolData = getSchoolColors(schoolId);

        if (schoolData) {
            const colors: ThemeColors = {
                primary: schoolData.primaryColor,
                secondary: schoolData.secondaryColor,
                accent: schoolData.accentColor,
                logoUrl: schoolData.logoUrl || DEFAULT_LOGO,
            };

            setCurrentColors(colors);
            setSchoolName(schoolData.name || 'SchoolApp');
            persistTheme(colors, schoolData.name || 'SchoolApp');

            console.log(`Applied theme for ${schoolData.name}:`, colors);
        } else {
            // Fallback to default theme
            const defaultColors: ThemeColors = {
                primary: theme.colors.primary,
                secondary: theme.colors.accent,
                accent: theme.colors.secondary,
                logoUrl: DEFAULT_LOGO,
            };

            setCurrentColors(defaultColors);
            setSchoolName('SchoolApp');
            persistTheme(defaultColors, 'SchoolApp');

            console.log('Applied default theme for school ID:', schoolId);
        }
    };

    return (
        <ThemeContext.Provider value={{ currentColors, schoolName, applySchoolTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Custom hook for using theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
