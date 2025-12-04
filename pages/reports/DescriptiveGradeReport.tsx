
import React from 'react';
import { User, Evaluation, Grade, IndicatorSection } from '../../types';
import { SALA_1_INDICATORS, SALA_2_INDICATORS, SALA_3_INDICATORS } from '../../data/indicators';

interface DescriptiveGradeReportProps {
  student: User;
  evaluation: Evaluation;
  grade: Grade;
  templateRef: React.RefObject<HTMLDivElement>;
}

const DescriptiveGradeReport: React.FC<DescriptiveGradeReportProps> = ({ student, evaluation, grade, templateRef }) => {
    
    const getIndicators = () => {
        const courseName = evaluation?.course?.name.toLowerCase() || '';
        // Support for Arabic (1, 2, 3) and Roman (I, II, III) numerals
        if (/(nivel\s*1|sala\s*1|sala\s*i\b)/.test(courseName)) return SALA_1_INDICATORS;
        if (/(nivel\s*2|sala\s*2|sala\s*ii\b)/.test(courseName)) return SALA_2_INDICATORS;
        if (/(nivel\s*3|sala\s*3|sala\s*iii\b)/.test(courseName)) return SALA_3_INDICATORS;
        return SALA_1_INDICATORS; 
    };
    
    const indicators = getIndicators();
    
    let parsedData: Record<string, any> = {};
    if (grade && grade.gradeText?.startsWith('[DESCRIPTIVA]')) {
        try {
            const jsonString = grade.gradeText.replace('[DESCRIPTIVA]', '');
            parsedData = JSON.parse(jsonString);
        } catch (e) {
            console.error("Failed to parse grade JSON:", e);
        }
    }

    const DESCRIPTIVE_GRADE_OPTIONS = ["Consolidado", "En proceso", "Iniciado", "Sin Evidencias"];

    const ReportHeader: React.FC = () => {
        // Customize header for School 8 (Los Tulipanes)
        const isLosTulipanes = evaluation?.schoolID === 8;
        
        const schoolTitle = isLosTulipanes 
            ? 'Centro de Educación Inicial "Los Tulipanes"' 
            : 'Complejo Educativo "Mons. Luis Eduardo Henríquez"';
            
        const deaCode = isLosTulipanes 
            ? 'OD76980812' 
            : 'OD16020812';

        return (
             <div className="flex justify-between items-start mb-2 text-xs">
                <div className="w-1/5">
                    <img src="https://jfywkgbqxijdfwqsscqa.supabase.co/storage/v1/object/public/assets/Alcaldia%20San%20Diego%20logo%20azul.png" alt="Alcaldia de San Diego" className="w-24" />
                </div>
                <div className="w-3/5 text-center leading-tight">
                    <p>República Bolivariana de Venezuela</p>
                    <p>Ministerio del Poder Popular para la Educación</p>
                    <p className="font-bold">{schoolTitle}</p>
                    <p>Municipio San Diego - Edo. Carabobo</p>
                    <p>Código D.E.A.: {deaCode}</p>
                </div>
                <div className="w-1/5 flex justify-end">
                     <img src="https://i.imgur.com/3gXnI26.png" alt="Logo Colegio" className="w-20" />
                </div>
            </div>
        );
    };

    const StudentInfo: React.FC = () => (
        <div className="border-2 border-black p-2 mb-2 text-xs">
            <div className="flex justify-between items-center font-bold mb-2">
                <span className="text-sm">BOLETIN DESCRIPTIVO EDUCACIÓN INICIAL :</span>
                <span className="text-sm">I LAPSO 2025-2026</span>
                <span className="text-2xl font-black bg-gray-200 px-4 py-1">{evaluation?.course?.name || 'SALA 1'}</span>
            </div>
            <div className="grid grid-cols-12 gap-x-4 gap-y-1">
                <div className="col-span-12"><span className="font-bold">Estudiante:</span> {student?.userName}</div>
                <div className="col-span-3"><span className="font-bold">Días Asistente:</span></div>
                <div className="col-span-3"><span className="font-bold">Días Inasistente:</span></div>
                <div className="col-span-3"><span className="font-bold">Turno:</span></div>
                <div className="col-span-3"><span className="font-bold">Días hábiles:</span></div>
                <div className="col-span-3"><span className="font-bold">Porcentaje de Asistencia:</span></div>
                <div className="col-span-9"><span className="font-bold">Porcentaje de Inasistencia:</span></div>
                <div className="col-span-12"><span className="font-bold">Características de la actuación escolar:</span></div>
            </div>
        </div>
    );
    
    const SectionTable: React.FC<{section: IndicatorSection, sectionIndex: number}> = ({section, sectionIndex}) => (
        <div className="break-inside-avoid">
            <h3 className="text-center font-bold bg-gray-200 border-2 border-black p-1 text-xs">{section.title}</h3>
            <table className="w-full border-collapse border-2 border-black text-xs">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-2/3 text-left font-bold">Indicadores</th>
                        {DESCRIPTIVE_GRADE_OPTIONS.map(option => (
                             <th key={option} className="border border-black p-1 font-bold">{option}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {section.indicators.map((indicator, indicatorIndex) => {
                        const fieldName = `${sectionIndex}-${indicatorIndex}`;
                        const value = parsedData[fieldName];
                        return (
                            <tr key={indicatorIndex} className="even:bg-gray-50">
                                <td className="border border-black p-1">{indicator.text}</td>
                                {DESCRIPTIVE_GRADE_OPTIONS.map(option => (
                                    <td key={option} className="border border-black p-1 text-center font-bold">
                                        {value === option ? 'X' : ''}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
    
    const Signatures: React.FC = () => (
         <div className="flex justify-between items-end text-center text-xs mt-auto pt-4">
            <div className="w-1/4">
                <div className="border-t border-black pt-1">Representante</div>
                <div className="mt-4">Firma:</div>
            </div>
             <div className="w-1/4">
                <div className="border-t border-black pt-1">Docente</div>
                 <div className="mt-4">Firma:</div>
            </div>
             <div className="w-1/4">
                <div className="border-t border-black pt-1">Docente</div>
                 <div className="mt-4">Firma:</div>
            </div>
        </div>
    );

    return (
        <div ref={templateRef} className="bg-white text-black font-sans">
            {/* Page 1 */}
            <div className="p-6" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <ReportHeader />
                <StudentInfo />
                <SectionTable section={indicators[0]} sectionIndex={0} />
                <Signatures />
                 <div className="text-right font-bold text-lg mt-2">1/2 <span className="text-xs">PAGINA</span></div>
            </div>

            {/* Page 2 */}
            <div className="p-6" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', pageBreakBefore: 'always' }}>
                <ReportHeader />
                <StudentInfo />
                <SectionTable section={indicators[1]} sectionIndex={1} />
                <div className="mt-4">
                    <h4 className="font-bold text-xs">Recomendaciones:</h4>
                    <div className="border border-black h-32 p-1 break-words whitespace-pre-wrap">
                        {parsedData['recommendations_1'] || ''}
                    </div>
                </div>
                <Signatures />
                <div className="text-right font-bold text-lg mt-2">2/2 <span className="text-xs">PAGINA</span></div>
            </div>
        </div>
    );
};

export default DescriptiveGradeReport;
