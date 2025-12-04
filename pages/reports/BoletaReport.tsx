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
        // Specific customization for School ID 8 "Los Tulipanes"
        const isLosTulipanes = data.schoolId === 8;
        const defaultSchoolName = parsedContent.schoolName || 'Mons. Luis Eduardo Henríquez';
        
        const schoolTitle = isLosTulipanes 
            ? 'Centro de Educación Inicial "Los Tulipanes"' 
            : `Complejo Educativo "${defaultSchoolName}"`;
            
        const deaCode = isLosTulipanes 
            ? 'OD76980812' 
            : 'OD16020812';

        return (
             <div className="flex justify-between items-start mb-2 text-xs">
                <div className="w-1/4"><img src="https://jfywkgbqxijdfwqsscqa.supabase.co/storage/v1/object/public/assets/Alcaldia%20San%20Diego%20logo%20azul.png" alt="Alcaldia de San Diego" className="w-40" /></div>
                <div className="w-1/2 text-center leading-tight">
                    <p>República Bolivariana de Venezuela</p>
                    <p>Ministerio del Poder Popular para la Educación</p>
                    <p className="font-bold">{schoolTitle}</p>
                    <p>Municipio San Diego - Edo. Carabobo</p>
                    <p>Código D.E.A.: {deaCode}</p>
                </div>
                <div className="w-1/4"></div>
            </div>
        );
    }

    const SignaturesTable: React.FC = () => (
        <div className="mt-auto w-full">
            <div className="relative w-full h-20 border border-black flex">
                <div className="w-1/3 border-r border-black relative">
                    <div className="absolute top-1 left-1 text-[10px] font-bold">Representante:</div>
                    <div className="absolute bottom-1 left-1 text-[10px] font-bold">Firma:</div>
                </div>
                <div className="w-1/3 border-r border-black relative">
                    <div className="absolute top-1 left-1 text-[10px] font-bold">Docente:</div>
                    <div className="absolute bottom-1 left-1 text-[10px] font-bold">Firma:</div>
                </div>
                <div className="w-1/3 relative">
                    <div className="absolute top-1 left-1 text-[10px] font-bold">Docente:</div>
                    <div className="absolute bottom-1 left-1 text-[10px] font-bold">Firma:</div>
                </div>
            </div>
        </div>
    );
    
    // Preschool Components
    const PreschoolStudentInfo: React.FC<{ showFeatures: boolean }> = ({ showFeatures }) => {
        const present = attendance?.present || 0;
        const late = attendance?.late || 0;
        const absent = attendance?.absent || 0;
        const justified = attendance?.justifiedAbsent || 0;

        const diasAsistidos = present + late;
        const diasInasistentes = absent + justified;
        
        // Use stored diasHabiles if available (from creation form), otherwise calculate from attendance total
        const diasHabilesSaved = gradesData['diasHabiles'];
        const totalRegistrado = (diasHabilesSaved !== undefined && diasHabilesSaved !== null && diasHabilesSaved !== '')
            ? Number(diasHabilesSaved) 
            : (diasAsistidos + diasInasistentes);

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
                    {showFeatures && (
                        <div className="col-span-12 mt-1">
                            <div className="border border-black p-2 min-h-[3rem] break-words whitespace-pre-wrap">
                                <span className="font-bold block mb-1">Características de la actuación escolar:</span>
                                {gradesData['schoolPerformanceFeatures'] || ''}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    const PreschoolPage: React.FC<{ pageNumber: number, totalPages: number }> = ({ pageNumber, totalPages }) => {
        const sectionsForPage = indicators.filter((_, index) => {
            if (pageNumber === 1) return index < 1; 
            if (pageNumber === 2) return index >= 1; 
            return false;
        });

        if (sectionsForPage.length === 0) return null;

        return (
            <div className="p-6" style={{ width: '100%', height: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', pageBreakBefore: pageNumber > 1 ? 'always' : 'auto' }}>
                <ReportHeader />
                <PreschoolStudentInfo showFeatures={pageNumber === 1} />
                {sectionsForPage.map((section, index) => {
                    const originalIndex = indicators.findIndex(s => s.title === section.title);
                    return <SectionTable key={originalIndex} section={section} sectionIndex={originalIndex} gradesData={gradesData} />;
                })}
                {pageNumber === 2 && indicators.some(s => s.hasRecommendations) && (
                    <div className="border border-black p-2 flex-grow flex flex-col break-words whitespace-pre-wrap text-xs">
                        <span className="font-bold block mb-1">Recomendaciones:</span>
                        {gradesData['recommendations_1'] || ''}
                    </div>
                )}
                <SignaturesTable />
                <div className="text-right font-bold text-[10px] mt-1">{pageNumber}/{totalPages} PAGINA</div>
            </div>
        );
    };

    // Primary Grade Components
    const PrimaryGradePage: React.FC = () => {
        const present = attendance?.present || 0;
        const late = attendance?.late || 0;
        const absent = attendance?.absent || 0;
        const justified = attendance?.justifiedAbsent || 0;

        const diasAsistidos = present + late;
        const diasInasistentes = absent + justified;
        
        // Use stored diasHabiles if available
        const diasHabilesSaved = gradesData['diasHabiles'];
        const totalRegistrado = (diasHabilesSaved !== undefined && diasHabilesSaved !== null && diasHabilesSaved !== '')
            ? Number(diasHabilesSaved) 
            : (diasAsistidos + diasInasistentes);
        
        const GradeHeader: React.FC = () => (
            <table className="w-full text-[10px] font-bold border-collapse">
                <tbody>
                    <tr className="text-center"><td colSpan={4} className="p-0">INSTRUMENTO DE EVALUACIÓN DE EDUCACIÓN PRIMARIA</td></tr>
                    <tr className="text-center"><td colSpan={4} className="p-0">{level?.toUpperCase()}</td></tr>
                    <tr className="text-center"><td colSpan={4} className="p-0">{lapso?.nombre || "PRIMER MOMENTO"} AÑO ESCOLAR {new Date(lapso?.fechaInicio || Date.now()).getFullYear()}-{new Date(lapso?.fechaFin || Date.now()).getFullYear()}</td></tr>
                    
                    <tr><td colSpan={4} className="h-1"></td></tr>
                    
                    <tr>
                        <td className="w-1/6 p-0">Estudiante:</td>
                        <td className="w-2/5 border-b border-black font-normal p-0">{resolvedStudentName}</td>
                        <td className="w-1/12 text-right pr-1 p-0">C.E.</td>
                        <td className="w-1/4 border-b border-black font-normal p-0">{extraData.cedula}</td>
                    </tr>
                    
                    <tr className="pt-1">
                        <td className="p-0">Docente:</td>
                        <td className="border-b border-black font-normal p-0">{extraData.teacherName}</td>
                        <td className="text-right pr-1 p-0">Rep:</td>
                        <td className="border-b border-black font-normal p-0">{extraData.parentName}</td>
                    </tr>
                    
                    <tr className="pt-1">
                        <td className="p-0">INICIO:</td>
                        <td className="border-b border-black font-normal p-0">{lapso ? new Date(lapso.fechaInicio).toLocaleDateString('es-ES') : ''}</td>
                        <td className="text-right pr-1 p-0">FIN:</td>
                        <td className="border-b border-black font-normal p-0">{lapso ? new Date(lapso.fechaFin).toLocaleDateString('es-ES') : ''}</td>
                    </tr>
                </tbody>
            </table>
        );
        
        const PrimaryGradeIndicatorsTable: React.FC<{indicators: IndicatorSection[], gradesData: Record<string, any>}> = ({ indicators, gradesData }) => {
            const GRADE_COLUMNS = ["C.", "E.P.", "I.", "C.A."];
            
            return (
                <table className="w-full border-collapse border-2 border-black text-xs my-1">
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
        
        return (
            <div className="p-6" style={{ width: '100%', height: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '9pt' }}>
                <ReportHeader />
                {extraData.loading ? <p>Cargando datos adicionales...</p> : <GradeHeader />}
                <table className="w-full text-xs font-bold border-collapse border-2 border-black my-1">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 text-center">Días Hábiles: {totalRegistrado}</td>
                            <td className="border border-black p-1 text-center">Asistencias: {diasAsistidos}</td>
                            <td className="border border-black p-1 text-center">Inasistencias: {diasInasistentes}</td>
                        </tr>
                    </tbody>
                </table>
                <div className="space-y-1">
                     <PrimaryGradeIndicatorsTable indicators={indicators} gradesData={gradesData} />
                </div>
                 <div className="mt-2 text-xs space-y-1 mb-2 flex-grow flex flex-col">
                    <div className="flex-1 flex flex-col">
                        <h4 className="font-bold">Actitudes, Hábitos de Trabajo:</h4>
                        <p className="border border-black p-1 break-words whitespace-pre-wrap flex-grow">{gradesData['actitudesHabitos'] || ''}</p>
                    </div>
                     <div className="flex-1 flex flex-col">
                        <h4 className="font-bold">Recomendaciones:</h4>
                        <p className="border border-black p-1 break-words whitespace-pre-wrap flex-grow">{gradesData['recomendacionesDocente'] || ''}</p>
                    </div>
                </div>
                <SignaturesTable />
                <div className="text-right font-bold text-[10px] mt-1">1/1 PAGINA</div>
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