import React from 'react';
import { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { IndicatorSection } from '../../types';

interface DescriptiveGradeSheetProps {
    indicators: IndicatorSection[];
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    level?: string;
}

const DescriptiveGradeSheet: React.FC<DescriptiveGradeSheetProps> = ({ indicators, register, watch, level = '' }) => {
    
    // Determine the 4th option based on the level
    const isPrimary = level.includes('Grado');
    const lastOption = isPrimary ? "Con Ayuda" : "Sin Evidencias";
    
    const OPTIONS = ["Consolidado", "En proceso", "Iniciado", lastOption];

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
                                    {OPTIONS.map(option => (
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
                                            {OPTIONS.map(option => (
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
                            <div className="relative">
                                <textarea
                                    id={`recommendations_${sectionIndex}`}
                                    {...register(`recommendations_${sectionIndex}`)}
                                    maxLength={250}
                                    rows={4}
                                    className="w-full p-2 border border-border rounded-md bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    placeholder="Escriba aquí las recomendaciones para este estudiante en esta área..."
                                />
                                <div className="text-right text-xs text-text-secondary mt-1">
                                    {(watch(`recommendations_${sectionIndex}`) || '').length}/250 caracteres
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default DescriptiveGradeSheet;