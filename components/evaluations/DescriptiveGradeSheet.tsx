import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { IndicatorSection } from '../../types';

interface DescriptiveGradeSheetProps {
    indicators: IndicatorSection[];
    register: UseFormRegister<any>;
}

const DESCRIPTIVE_GRADE_OPTIONS = ["Consolidado", "En proceso", "Iniciado", "Sin Evidencias"];

const DescriptiveGradeSheet: React.FC<DescriptiveGradeSheetProps> = ({ indicators, register }) => {
    return (
        <div className="space-y-6">
            {indicators.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border border-border rounded-lg overflow-hidden">
                    <h3 className="bg-background p-3 text-lg font-semibold text-text-primary">{section.title}</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-header-light">
                                <tr>
                                    <th className="py-2 px-4 text-left font-semibold w-2/5">Indicadores</th>
                                    {DESCRIPTIVE_GRADE_OPTIONS.map(option => (
                                        <th key={option} className="py-2 px-4 text-center font-semibold">{option}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {section.indicators.map((indicator, indicatorIndex) => {
                                    const fieldName = `${sectionIndex}-${indicatorIndex}`;
                                    return (
                                        <tr key={indicatorIndex} className="border-t border-border hover:bg-background">
                                            <td className="py-2 px-4">{indicator.text}</td>
                                            {DESCRIPTIVE_GRADE_OPTIONS.map(option => (
                                                <td key={option} className="py-2 px-4 text-center">
                                                    <input
                                                        type="radio"
                                                        value={option}
                                                        {...register(fieldName)}
                                                        className="h-4 w-4 text-primary focus:ring-accent border-border"
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {section.hasRecommendations && (
                        <div className="p-4 border-t border-border">
                            <label htmlFor={`recommendations_${sectionIndex}`} className="block text-sm font-medium text-text-primary mb-2">Recomendaciones</label>
                            <textarea
                                id={`recommendations_${sectionIndex}`}
                                {...register(`recommendations_${sectionIndex}`)}
                                rows={4}
                                className="w-full p-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                                placeholder="Escriba aquí las recomendaciones para este estudiante en esta área..."
                            />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DescriptiveGradeSheet;