export interface IndicatorDto {
    indicatorId: number;
    planId: number;
    section: string;
    subSection?: string;
    content: string;
    orderIndex: number;
}

export interface IndicatorSection {
    title: string;
    hasRecommendations?: boolean;
    indicators: { text: string }[];
}

export const transformIndicators = (dbIndicators: IndicatorDto[]): IndicatorSection[] => {
    // 1. Sort by OrderIndex first to respect DB order
    const sorted = [...dbIndicators].sort((a, b) => a.orderIndex - b.orderIndex);

    const sectionsMap = new Map<string, IndicatorSection>();

    // 2. Group by Section
    sorted.forEach(indicator => {
        const sectionTitle = indicator.section.trim();

        if (!sectionsMap.has(sectionTitle)) {
            sectionsMap.set(sectionTitle, {
                title: sectionTitle,
                hasRecommendations: false, // Default, logic for this might need to be enhanced if DB supports it or via matching known titles
                indicators: []
            });
        }

        const section = sectionsMap.get(sectionTitle)!;
        section.indicators.push({ text: indicator.content });

        // Heuristic: If section title implies recommendations, set flag
        // This mirrors the hardcoded logic where "RELACIÓN ENTRE LOS COMPONENTES DEL AMBIENTE" has recommendations
        // But for generic dynamic indicators, maybe we just assume standard structure or specific naming convention
        // For now, let's keep it simple. The backend didn't seem to have a 'HasRecommendations' boolean on the Plan or Indicator.
    });

    return Array.from(sectionsMap.values());
};
