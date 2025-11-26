
import React, { useEffect, useState } from 'react';
import { Certificate, IndicatorSection, Lapso, User, Parent, Course } from '../../types';
import {
    SALA_1_INDICATORS, SALA_2_INDICATORS, SALA_3_INDICATORS,
    PRIMER_GRADO_INDICATORS, SEGUNDO_GRADO_INDICATORS, TERCER_GRADO_INDICATORS,
    CUARTO_GRADO_INDICATORS, QUINTO_GRADO_INDICATORS, SEXTO_GRADO_INDICATORS
} from '../../data/indicators';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';

interface BoletaReportProps {
  data: Certificate;
  templateRef: React.RefObject<HTMLDivElement>;
}

// Helper to strip status tags before parsing
const cleanContent = (content: string | undefined | null) => {
    if (!content) return '';
    return content
        .replace('[BOLETA_CONFIRMADA]', '')
        .replace('[BOLETA_RECHAZADA]', '')
        .trim();
};

const DESCRIPTIVE_GRADE_OPTIONS = ["Consolidado", "En proceso", "Iniciado", "Sin Evidencias"];

const SectionTable: React.FC<{section: IndicatorSection, sectionIndex: number, gradesData: Record<string, any>}> = ({section, sectionIndex, gradesData}) => (
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
                    const value = gradesData[fieldName];
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

const BoletaReport: React.FC<BoletaReportProps> = ({ data, templateRef }) => {
    const { user: authUser } = useAuth();
    const [extraData, setExtraData] = useState({
        loading: true,
        teacherName: '',
        parentName: '',
        cedula: ''
    });
    const [resolvedStudentName, setResolvedStudentName] = useState(data.studentName || 'N/A');
    
    let parsedContent: { level: string, data: Record<string, any>, attendance: any, turno: string, schoolName?: string, lapso?: Lapso } = { level: '', data: {}, attendance: null, turno: '', schoolName: '', lapso: undefined };
    
    try {
        if (data.content) {
            // Clean the content string before parsing to handle status tags
            const cleanedJson = cleanContent(data.content);
            const parsed = JSON.parse(cleanedJson);
            if (parsed) {
                parsedContent = parsed;
            }
        }
    } catch (e) {
        console.error("Failed to parse Boleta content JSON:", e);
    }

    const { level, data: gradesData = {}, attendance, turno, lapso } = parsedContent;
    const isPrimaryGrade = level?.includes('Grado');

    useEffect(() => {
        if (authUser?.schoolId && data.userId) {
            const fetchExtraData = async () => {
                try {
                    // Logic specifically for Parents (Role 3) to avoid 403 errors
                    if (authUser.roleId === 3) {
                        // Parents cannot call getUserDetails. 
                        // Instead, fetch their children list to find the correct student name.
                        const children = await apiService.getChildrenOfParent(authUser.userId, authUser.schoolId);
                        const child = children.find(c => c.userID === data.userId);
                        
                        if (child) {
                            setResolvedStudentName(child.userName);
                        }

                        setExtraData({
                            loading: false,
                            cedula: '', // Parents might not have access to fetch full details including cedula via standard endpoints
                            parentName: authUser.userName,
                            teacherName: data.signatoryName || 'Docente' // Fallback to signatory as we can't query teacher relationship
                        });
                    } 
                    // Logic for Admin/Teachers
                    else if (isPrimaryGrade) {
                        // Use optional chaining to avoid crashes if getUserDetails returns null
                        const details = await apiService.getUserDetails(data.userId, authUser.schoolId).catch(() => null);
                        const parents = await apiService.getParentsOfChild(data.userId, authUser.schoolId).catch(() => []);
                        
                        let teacherName = 'N/A';
                        if (details && details.classroom?.classroomID) {
                            const allCourses = await apiService.getCourses(authUser.schoolId);
                            const classroomCourse = allCourses.find(c => c.classroomID === details.classroom?.classroomID);
                            if (classroomCourse?.userID) {
                                const teacher = await apiService.getUserById(classroomCourse.userID, authUser.schoolId);
                                teacherName = teacher.userName;
                            }
                        }

                        if (details) {
                            setResolvedStudentName(details.userName);
                        }

                        setExtraData({
                            loading: false,
                            cedula: details?.cedula || 'N/A',
                            parentName: parents[0]?.userName || 'N/A',
                            teacherName: teacherName
                        });
                    } else {
                        // Preschool/General for Staff
                        setExtraData(prev => ({ ...prev, loading: false }));
                        if (data.studentName && data.studentName !== 'N/A') {
                             setResolvedStudentName(data.studentName);
                        } else {
                             // Try to fetch user if name is missing
                             const u = await apiService.getUserById(data.userId, authUser.schoolId);
                             setResolvedStudentName(u.userName);
                        }
                    }
                } catch (error) {
                    console.error("Error fetching extra data for boleta", error);
                    setExtraData(prev => ({ ...prev, loading: false }));
                }
            };
            fetchExtraData();
        } else {
            setExtraData(prev => ({...prev, loading: false }));
        }
    }, [isPrimaryGrade, authUser, data.userId, data.signatoryName, data.studentName]);


    const getIndicators = (lvl: string): IndicatorSection[] => {
        const normalizedLevel = (lvl || '').trim();
        if (normalizedLevel === 'Sala 1') return SALA_1_INDICATORS;
        if (normalizedLevel === 'Sala 2') return SALA_2_INDICATORS;
        if (normalizedLevel === 'Sala 3') return SALA_3_INDICATORS;
        if (normalizedLevel === 'Primer Grado') return PRIMER_GRADO_INDICATORS;
        if (normalizedLevel === 'Segundo Grado') return SEGUNDO_GRADO_INDICATORS;
        if (normalizedLevel === 'Tercer Grado') return TERCER_GRADO_INDICATORS;
        if (normalizedLevel === 'Cuarto Grado') return CUARTO_GRADO_INDICATORS;
        if (normalizedLevel === 'Quinto Grado') return QUINTO_GRADO_INDICATORS;
        if (normalizedLevel === 'Sexto Grado') return SEXTO_GRADO_INDICATORS;
        return [];
    };
    
    const indicators = getIndicators(level);
    
    // Common Components
    const ReportHeader: React.FC = () => {
        const schoolName = parsedContent.schoolName || 'Mons. Luis Eduardo Henríquez';
        return (
             <div className="flex justify-between items-start mb-2 text-xs">
                <div className="w-1/4"><img src="https://jfywkgbqxijdfwqsscqa.supabase.co/storage/v1/object/public/assets/Alcaldia%20San%20Diego%20logo%20azul.png" alt="Alcaldia de San Diego" className="w-40" /></div>
                <div className="w-1/2 text-center leading-tight">
                    <p>República Bolivariana de Venezuela</p>
                    <p>Ministerio del Poder Popular para la Educación</p>
                    <p className="font-bold">Complejo Educativo "{schoolName}"</p>
                    <p>Municipio San Diego - Edo. Carabobo</p>
                    <p>Código D.E.A.: OD16020812</p>
                </div>
                <div className="w-1/4"></div>
            </div>
        );
    }
    const PreschoolSignatures: React.FC = () => (
         <div className="flex justify-around items-end text-center text-xs mt-auto pt-4">
            <div className="w-1/3">
                <div className="border-t border-black pt-1 mx-4">Representante</div>
            </div>
             <div className="w-1/3">
                <div className="border-t border-black pt-1 mx-4 font-bold">{data.signatoryName || ''}</div>
                <div className="text-[10px]">{data.signatoryTitle || 'Docente'}</div>
            </div>
        </div>
    );
    
    // Preschool Components
    const PreschoolStudentInfo: React.FC = () => {
        // Recalculate totals to ensure percentages are correct (0-100%)
        // We use the data from the 'attendance' object but calculate the total sum manually 
        // because 'attendance.total' in the DB might be storing 'remaining days'.
        const present = attendance?.present || 0;
        const late = attendance?.late || 0;
        const absent = attendance?.absent || 0;
        const justified = attendance?.justifiedAbsent || 0;

        const diasAsistidos = present + late;
        const diasInasistentes = absent + justified;
        const totalRegistrado = diasAsistidos + diasInasistentes;

        const porcentajeAsistencia = totalRegistrado > 0 ? ((diasAsistidos / totalRegistrado) * 100).toFixed(1) + '%' : '0%';
        const porcentajeInasistencia = totalRegistrado > 0 ? ((diasInasistentes / totalRegistrado) * 100).toFixed(1) + '%' : '0%';
        
        return (
            <div className="border-2 border-black p-2 mb-2 text-xs">
                <div className="flex justify-between items-center font-bold mb-2">
                    <span className="text-sm">BOLETIN DESCRIPTIVO EDUCACIÓN INICIAL:</span>
                    <span className="text-sm">{lapso?.nombre || "I LAPSO"} {new Date(lapso?.fechaInicio || Date.now()).getFullYear()}-{new Date(lapso?.fechaFin || Date.now()).getFullYear()}</span>
                    <span className="text-2xl font-black bg-gray-200 px-4 py-1">{level || 'SALA 1'}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-4 gap-y-1">
                    <div className="col-span-12"><span className="font-bold">Estudiante:</span> {resolvedStudentName}</div>
                    <div className="col-span-3"><span className="font-bold">Días Asistente:</span> {diasAsistidos}</div>
                    <div className="col-span-3"><span className="font-bold">Días Inasistente:</span> {diasInasistentes}</div>
                    <div className="col-span-3"><span className="font-bold">Turno:</span> {turno || ''}</div>
                    <div className="col-span-3"><span className="font-bold">Días hábiles:</span> {totalRegistrado}</div>
                    <div className="col-span-3"><span className="font-bold">Porcentaje de Asistencia:</span> {porcentajeAsistencia}</div>
                    <div className="col-span-9"><span className="font-bold">Porcentaje de Inasistencia:</span> {porcentajeInasistencia}</div>
                    <div className="col-span-12 mt-1">
                        <div className="border border-black p-2 min-h-[3rem]">
                            <span className="font-bold block mb-1">Características de la actuación escolar:</span>
                            {gradesData['schoolPerformanceFeatures'] || ''}
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    const PreschoolPage: React.FC<{ pageNumber: number, totalPages: number }> = ({ pageNumber, totalPages }) => {
        const sectionsForPage = indicators.filter((_, index) => {
            if (pageNumber === 1) return index < 1; // Section 0 on page 1
            if (pageNumber === 2) return index >= 1; // Rest on page 2
            return false;
        });

        if (sectionsForPage.length === 0) return null;

        return (
            <div className="p-6" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', pageBreakBefore: pageNumber > 1 ? 'always' : 'auto' }}>
                <ReportHeader />
                <PreschoolStudentInfo />
                {sectionsForPage.map((section, index) => {
                    const originalIndex = indicators.findIndex(s => s.title === section.title);
                    return <SectionTable key={originalIndex} section={section} sectionIndex={originalIndex} gradesData={gradesData} />;
                })}
                {pageNumber === 1 && (
                    <div className="mt-2 text-xs">
                        <p><span className="font-bold">Consolidado:</span> Aprendizaje logrado</p>
                        <p><span className="font-bold">En proceso:</span> En vía para lograr el aprendizaje</p>
                        <p><span className="font-bold">Iniciado:</span> Requiere ayuda para lograr el aprendizaje</p>
                        <p><span className="font-bold">Sin Evidencias:</span> Inasistente</p>
                    </div>
                )}
                {pageNumber === 2 && indicators.some(s => s.hasRecommendations) && (
                    <div className="mt-4">
                        <h4 className="font-bold text-xs">Recomendaciones:</h4>
                        <div className="border border-black min-h-[8rem] p-1">{gradesData['recommendations_1'] || ''}</div>
                    </div>
                )}
                <PreschoolSignatures />
                <div className="text-right font-bold text-lg mt-2">{pageNumber}/{totalPages} <span className="text-xs">PAGINA</span></div>
            </div>
        );
    };

    // Primary Grade Components
    const PrimaryGradePage: React.FC = () => {
        // Recalculate totals
        const present = attendance?.present || 0;
        const late = attendance?.late || 0;
        const absent = attendance?.absent || 0;
        const justified = attendance?.justifiedAbsent || 0;

        const diasAsistidos = present + late;
        const diasInasistentes = absent + justified;
        const totalRegistrado = diasAsistidos + diasInasistentes;
        
        const GradeHeader: React.FC = () => (
            <table className="w-full text-sm font-bold my-2">
                <tbody>
                    <tr className="text-center"><td colSpan={4}>INSTRUMENTO DE EVALUACIÓN DE EDUCACIÓN PRIMARIA</td></tr>
                    <tr className="text-center"><td colSpan={4}>{level?.toUpperCase()}</td></tr>
                    <tr className="text-center"><td colSpan={4}>{lapso?.nombre || "PRIMER MOMENTO"} AÑO ESCOLAR {new Date(lapso?.fechaInicio || Date.now()).getFullYear()}-{new Date(lapso?.fechaFin || Date.now()).getFullYear()}</td></tr>
                    <tr><td colSpan={4} className="h-2"></td></tr>
                    <tr>
                        <td className="w-1/5">Estudiante:</td>
                        <td className="w-2/5 border-b border-black font-normal">{resolvedStudentName}</td>
                        <td className="w-1/12">C.E.</td>
                        <td className="w-1/4 border-b border-black font-normal">{extraData.cedula}</td>
                    </tr>
                    <tr><td colSpan={4} className="h-2"></td></tr>
                    <tr>
                        <td>Docente:</td>
                        <td className="border-b border-black font-normal">{extraData.teacherName}</td>
                        <td>Representante:</td>
                        <td className="border-b border-black font-normal">{extraData.parentName}</td>
                    </tr>
                    <tr><td colSpan={4} className="h-2"></td></tr>
                    <tr>
                        <td>INICIO:</td>
                        <td className="border-b border-black font-normal">{lapso ? new Date(lapso.fechaInicio).toLocaleDateString('es-ES') : ''}</td>
                        <td>CULMINACIÓN:</td>
                        <td className="border-b border-black font-normal">{lapso ? new Date(lapso.fechaFin).toLocaleDateString('es-ES') : ''}</td>
                    </tr>
                </tbody>
            </table>
        );
        
        const PrimaryGradeIndicatorsTable: React.FC<{indicators: IndicatorSection[], gradesData: Record<string, any>}> = ({ indicators, gradesData }) => {
            const GRADE_COLUMNS = ["C.", "E.P.", "I.", "C.A."];
            
            return (
                <table className="w-full border-collapse border-2 border-black text-xs my-2">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 w-2/3 text-center font-bold">INDICADORES</th>
                            {GRADE_COLUMNS.map(option => (
                                <th key={option} className="border border-black p-1 font-bold">{option}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {indicators.map((section, sectionIndex) => (
                            <React.Fragment key={sectionIndex}>
                                <tr className="bg-gray-200">
                                    <td colSpan={GRADE_COLUMNS.length + 1} className="border border-black p-1 text-center font-bold">
                                        {section.title}
                                    </td>
                                </tr>
                                {section.indicators.map((indicator, indicatorIndex) => {
                                    const fieldName = `${sectionIndex}-${indicatorIndex}`;
                                    const value = gradesData[fieldName];
                                    return (
                                        <tr key={indicatorIndex} className="even:bg-gray-50">
                                            <td className="border border-black p-1">{indicator.text}</td>
                                            <td className="border border-black p-1 text-center font-bold">{value === "Consolidado" ? 'X' : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{value === "En proceso" ? 'X' : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{value === "Iniciado" ? 'X' : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold">{/* C.A. remains empty as per logic */}</td>
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            );
        };
        
        const PrimarySignatures: React.FC = () => (
            <div className="flex justify-between items-end text-center text-xs mt-24 pt-4 px-8">
                <div className="w-2/5">
                    <div className="border-t border-black pt-1 mx-4">Representante</div>
                </div>
                <div className="w-2/5">
                    <div className="border-t border-black pt-1 mx-4">
                         <p className="font-bold">{extraData.teacherName}</p>
                         <p>Docente</p>
                    </div>
                </div>
            </div>
        );

        return (
            <div className="p-6" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '10pt' }}>
                <ReportHeader />
                {extraData.loading ? <p>Cargando datos adicionales...</p> : <GradeHeader />}
                <table className="w-full text-xs font-bold border-collapse border-2 border-black my-2">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 text-center">Días Hábiles: {totalRegistrado}</td>
                            <td className="border border-black p-1 text-center">Asistencias: {diasAsistidos}</td>
                            <td className="border border-black p-1 text-center">Inasistencias: {diasInasistentes}</td>
                        </tr>
                    </tbody>
                </table>
                <div className="space-y-2 flex-grow">
                     <PrimaryGradeIndicatorsTable indicators={indicators} gradesData={gradesData} />
                </div>
                 <div className="mt-4 text-xs space-y-2">
                    <div>
                        <h4 className="font-bold">Actitudes, Hábitos de Trabajo:</h4>
                        <p className="border border-black min-h-[3rem] p-1">{gradesData['actitudesHabitos'] || ''}</p>
                    </div>
                     <div>
                        <h4 className="font-bold">Recomendaciones:</h4>
                        <p className="border border-black min-h-[3rem] p-1">{gradesData['recomendacionesDocente'] || ''}</p>
                    </div>
                </div>
                <PrimarySignatures />
            </div>
        );
    };


    return (
        <div ref={templateRef} className="bg-white text-black font-sans">
            {isPrimaryGrade ? (
                <PrimaryGradePage />
            ) : (
                <>
                    <PreschoolPage pageNumber={1} totalPages={2} />
                    <PreschoolPage pageNumber={2} totalPages={2} />
                </>
            )}
        </div>
    );
};

export default BoletaReport;
