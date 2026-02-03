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

// --- NUEVO COMPONENTE DE ÍCONO (TU SVG) ---
const CrossMarkIcon = () => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="#000000" 
        width="14px" // Ajustado para que se vea bien en la celda
        height="14px" 
        viewBox="0 0 1024 1024"
        style={{ display: 'inline-block', verticalAlign: 'middle' }} // Alineación
    >
        <path d="M697.4 759.2l61.8-61.8L573.8 512l185.4-185.4-61.8-61.8L512 450.2 326.6 264.8l-61.8 61.8L450.2 512 264.8 697.4l61.8 61.8L512 573.8z"/>
    </svg>
);

// Helper to strip status tags before parsing
const cleanContent = (content: string | undefined | null) => {
    if (!content) return '';
    return content
        .replace('[BOLETA_CONFIRMADA]', '')
        .replace('[BOLETA_RECHAZADA]', '')
        .trim();
};

// Helper to replace newlines with spaces for continuous text
const flattenText = (text: string | undefined | null) => {
    if (!text) return '';
    // Replace newline characters with a single space
    return text.replace(/(\r\n|\n|\r)/gm, ' ').trim();
};

// PRE-SCHOOL Options
const PRESCHOOL_GRADE_OPTIONS = ["Consolidado", "En proceso", "Iniciado", "Sin Evidencias"];

const SectionTable: React.FC<{section: IndicatorSection, sectionIndex: number, gradesData: Record<string, any>}> = ({section, sectionIndex, gradesData}) => (
    <div className="break-inside-avoid">
        <h3 className="text-center font-bold bg-gray-200 border-t-2 border-b-2 border-black p-1 text-xs">{section.title}</h3>
        <table className="w-full border-collapse text-xs">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-black p-1 w-2/3 text-left font-bold">Indicadores</th>
                    {PRESCHOOL_GRADE_OPTIONS.map(option => (
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
                            {PRESCHOOL_GRADE_OPTIONS.map(option => {
                                // For Preschool, standard check. 
                                // Robustness: If data accidentally has "Con Ayuda", map it to "Sin Evidencias" column
                                const isChecked = value === option || (option === "Sin Evidencias" && value === "Con Ayuda");
                                return (
                                    <td key={option} className="border border-black p-1 text-center font-bold align-middle">
                                        {isChecked ? <CrossMarkIcon /> : ''}
                                    </td>
                                )
                            })}
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
        teacherCedula: '',
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
                        
                        // Fallback to fetch just the user to get C.E if child object doesn't have it
                        let cedula = 'N/A';
                        if (child) {
                            setResolvedStudentName(child.userName);
                            // Try to get cached info or fetch basic user info if possible for parents
                            // Usually parent endpoint returns minimal info, let's try get user by id if allowed, else empty
                            try {
                                const fullChild = await apiService.getUserById(data.userId, authUser.schoolId);
                                cedula = fullChild.cedula || 'N/A';
                            } catch { /* Permission denied likely */ }
                        }

                        setExtraData({
                            loading: false,
                            cedula: cedula, 
                            parentName: authUser.userName,
                            teacherName: data.signatoryName || 'Docente',
                            teacherCedula: ''
                        });
                    } 
                    // Logic for Admin/Teachers
                    else if (isPrimaryGrade) {
                        // Use optional chaining to avoid crashes if getUserDetails returns null
                        const details = await apiService.getUserDetails(data.userId, authUser.schoolId).catch(() => null);
                        const parents = await apiService.getParentsOfChild(data.userId, authUser.schoolId).catch(() => []);
                        
                        // --- Teacher Info Logic ---
                        // Initialize with what we have in the boleta (Signatory Name)
                        let teacherName = data.signatoryName || 'N/A';
                        let teacherCedula = '';

                        // Try to fetch the official classroom teacher to get Name AND Cedula
                        if (details && details.classroom?.classroomID) {
                            const allCourses = await apiService.getCourses(authUser.schoolId);
                            // Find the course associated with this classroom (typically the main grade course)
                            const classroomCourse = allCourses.find(c => c.classroomID === details.classroom?.classroomID);
                            
                            if (classroomCourse?.userID) {
                                try {
                                    const teacher = await apiService.getUserById(classroomCourse.userID, authUser.schoolId);
                                    // Use the system's teacher info for consistency
                                    teacherName = teacher.userName;
                                    teacherCedula = teacher.cedula || '';
                                } catch (e) {
                                    console.warn("Error fetching teacher details", e);
                                }
                            }
                        }

                        // --- Student Cedula Logic ---
                        let studentCedula = 'N/A';
                        if (details && details.cedula) {
                            studentCedula = details.cedula;
                        } else {
                            try {
                                const basicUser = await apiService.getUserById(data.userId, authUser.schoolId);
                                if (basicUser && basicUser.cedula) {
                                    studentCedula = basicUser.cedula;
                                }
                            } catch (e) {
                                console.warn("Could not fetch basic user for cedula fallback");
                            }
                        }

                        if (details) {
                            setResolvedStudentName(details.userName);
                        }

                        setExtraData({
                            loading: false,
                            cedula: studentCedula,
                            parentName: parents[0]?.userName || 'N/A',
                            teacherName: teacherName,
                            teacherCedula: teacherCedula
                        });
                    } else {
                        // Preschool/General for Staff
                        let studentCedula = 'N/A';
                        try {
                             const u = await apiService.getUserById(data.userId, authUser.schoolId);
                             setResolvedStudentName(u.userName);
                             studentCedula = u.cedula || 'N/A';
                        } catch {}

                        setExtraData({ 
                            loading: false, 
                            teacherName: data.signatoryName || '',
                            teacherCedula: '',
                            parentName: '',
                            cedula: studentCedula
                        });
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
        // Use manual inputs preferentially
        const manualAsistencias = gradesData['manualAsistencias'];
        const manualInasistencias = gradesData['manualInasistencias'];
        const diasHabilesSaved = gradesData['diasHabiles'];

        const diasAsistidos = (manualAsistencias !== undefined && manualAsistencias !== null) 
            ? String(manualAsistencias) 
            : '';

        const diasInasistentes = (manualInasistencias !== undefined && manualInasistencias !== null) 
            ? String(manualInasistencias) 
            : '';

        const totalRegistrado = (diasHabilesSaved !== undefined && diasHabilesSaved !== null && String(diasHabilesSaved).trim() !== '')
            ? String(diasHabilesSaved)
            : ((Number(diasAsistidos) || 0) + (Number(diasInasistentes) || 0));

        const numAsistidos = parseFloat(diasAsistidos);
        const numInasistentes = parseFloat(diasInasistentes);
        const numTotal = Number(totalRegistrado);
        
        const hasAsistencia = !isNaN(numAsistidos) && diasAsistidos !== '';
        const hasInasistencia = !isNaN(numInasistentes) && diasInasistentes !== '';

        const porcentajeAsistencia = (numTotal > 0 && hasAsistencia) 
            ? ((numAsistidos / numTotal) * 100).toFixed(1) + '%' 
            : '';
            
        const porcentajeInasistencia = (numTotal > 0 && hasInasistencia) 
            ? ((numInasistentes / numTotal) * 100).toFixed(1) + '%' 
            : '';
        
        return (
            <div className="p-2 pb-1 text-xs">
                <div className="flex justify-between items-center font-bold mb-2">
                    <span className="text-sm">BOLETIN DESCRIPTIVO EDUCACIÓN INICIAL:</span>
                    <span className="text-sm">{lapso?.nombre || "I LAPSO"} {new Date(lapso?.fechaInicio || Date.now()).getFullYear()}-{new Date(lapso?.fechaFin || Date.now()).getFullYear()}</span>
                    <span className="text-2xl font-black bg-gray-200 px-4 py-1">{level || 'SALA 1'}</span>
                </div>
                <div className="grid grid-cols-12 gap-x-4 gap-y-0">
                    <div className="col-span-12"><span className="font-bold">Estudiante:</span> {resolvedStudentName}</div>
                    <div className="col-span-3"><span className="font-bold">Días Asistente:</span> {diasAsistidos}</div>
                    <div className="col-span-3"><span className="font-bold">Días Inasistente:</span> {diasInasistentes}</div>
                    <div className="col-span-3"><span className="font-bold">Turno:</span> {turno || ''}</div>
                    <div className="col-span-3"><span className="font-bold">Días hábiles:</span> {totalRegistrado || ''}</div>
                    <div className="col-span-3"><span className="font-bold">Porcentaje de Asistencia:</span> {porcentajeAsistencia}</div>
                    <div className="col-span-9"><span className="font-bold">Porcentaje de Inasistencia:</span> {porcentajeInasistencia}</div>
                    {showFeatures && (
                        <div className="col-span-12 mt-1">
                            <div className="text-justify leading-snug">
                                <span className="font-bold mr-1">Características de la actuación escolar:</span>
                                <span>{flattenText(gradesData['schoolPerformanceFeatures'])}</span>
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
            <div className="p-6" style={{ width: '216mm', height: '279mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', pageBreakBefore: pageNumber > 1 ? 'always' : 'auto' }}>
                <ReportHeader />
                <div className="border-2 border-black flex-grow flex flex-col">
                    <PreschoolStudentInfo showFeatures={pageNumber === 1} />
                    
                    <div className="flex-grow">
                        {sectionsForPage.map((section, index) => {
                            const originalIndex = indicators.findIndex(s => s.title === section.title);
                            return <SectionTable key={originalIndex} section={section} sectionIndex={originalIndex} gradesData={gradesData} />;
                        })}
                        
                        {pageNumber === 2 && indicators.some(s => s.hasRecommendations) && (
                            <div className="border-t-2 border-black p-1 text-xs text-justify leading-snug">
                                <span className="font-bold inline">Recomendaciones:</span>
                                <span className="ml-1">{flattenText(gradesData['recommendations_1'])}</span>
                            </div>
                        )}
                    </div>

                    <div className="border-t-2 border-black">
                         <div className="flex h-16 text-xs">
                            <div className="w-1/3 border-r-2 border-black relative">
                                <div className="absolute top-1 left-1 font-bold">Representante:</div>
                                <div className="absolute bottom-1 left-1 font-bold">Firma:</div>
                            </div>
                            <div className="w-1/3 border-r-2 border-black relative">
                                <div className="absolute top-1 left-1 font-bold">Docente:</div>
                                <div className="absolute bottom-1 left-1 font-bold">Firma:</div>
                            </div>
                            <div className="w-1/3 relative">
                                <div className="absolute top-1 left-1 font-bold">Docente:</div>
                                <div className="absolute bottom-1 left-1 font-bold">Firma:</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-right font-bold text-[10px] mt-1">{pageNumber}/{totalPages} PAGINA</div>
            </div>
        );
    };

    // Primary Grade Components
    const PrimaryGradePage: React.FC = () => {
        // Attendance Data
        const manualAsistencias = gradesData['manualAsistencias'];
        const manualInasistencias = gradesData['manualInasistencias'];
        const diasHabilesSaved = gradesData['diasHabiles'];

        const diasAsistidos = (manualAsistencias !== undefined && manualAsistencias !== null) 
            ? String(manualAsistencias) 
            : '';

        const diasInasistentes = (manualInasistencias !== undefined && manualInasistencias !== null) 
            ? String(manualInasistencias) 
            : '';

        const totalRegistrado = (diasHabilesSaved !== undefined && diasHabilesSaved !== null && String(diasHabilesSaved).trim() !== '')
            ? String(diasHabilesSaved) 
            : ((Number(diasAsistidos) || 0) + (Number(diasInasistentes) || 0));
        
        // Teacher Display Logic
        // 1. Primary Teacher (Auto) - From fetchExtraData
        const tName = extraData.teacherName;
        const tCedula = extraData.teacherCedula;
        let finalTeacherDisplay = tCedula && tCedula !== 'N/A' && tCedula !== '' 
            ? `${tName} (C.I. ${tCedula})` 
            : tName;

        // 2. Additional Teacher (Manual) - From gradesData
        const manualTeacherName = gradesData['manualTeacherName'];
        const manualTeacherCedulaPrefix = gradesData['manualTeacherCedulaPrefix'];
        const manualTeacherCedulaNumber = gradesData['manualTeacherCedulaNumber'];

        if (manualTeacherName && manualTeacherName.trim() !== '') {
            let additional = manualTeacherName;
            if (manualTeacherCedulaNumber && manualTeacherCedulaNumber.trim() !== '') {
                additional += ` (C.I. ${manualTeacherCedulaPrefix || 'V'}-${manualTeacherCedulaNumber})`;
            }
            finalTeacherDisplay = `${finalTeacherDisplay}, ${additional}`;
        }

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
                        <td className="border-b border-black font-normal p-0">{finalTeacherDisplay}</td>
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
        
        const PrimaryGradeIndicatorsTable: React.FC<{indicators: IndicatorSection[], gradesData: Record<string, any> }> = ({ indicators, gradesData }) => {
            const GRADE_COLUMNS = ["C.", "E.P.", "I.", "C.A."];
            
            return (
                <table className="w-full border-collapse border-2 border-black text-xs my-1">
                    <thead>
                        {/* Merged Attendance Row */}
                        <tr className="bg-white">
                            <td colSpan={GRADE_COLUMNS.length + 1} className="p-0 border-b border-black">
                                <div className="flex w-full">
                                    <div className="flex-1 border-r border-black p-1 text-center font-bold">Días Hábiles: {totalRegistrado || ''}</div>
                                    <div className="flex-1 border-r border-black p-1 text-center font-bold">Asistencias: {diasAsistidos}</div>
                                    <div className="flex-1 p-1 text-center font-bold">Inasistencias: {diasInasistentes}</div>
                                </div>
                            </td>
                        </tr>
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
                                            <td className="border border-black p-1 text-center font-bold align-middle">{value === "Consolidado" ? <CrossMarkIcon /> : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold align-middle">{value === "En proceso" ? <CrossMarkIcon /> : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold align-middle">{value === "Iniciado" ? <CrossMarkIcon /> : ''}</td>
                                            <td className="border border-black p-1 text-center font-bold align-middle">{(value === "Con Ayuda" || value === "Sin Evidencias") ? <CrossMarkIcon /> : ''}</td>
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
            <div className="p-6" style={{ width: '216mm', height: '279mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: '9pt' }}>
                <ReportHeader />
                {extraData.loading ? <p>Cargando datos adicionales...</p> : <GradeHeader />}
                <div className="space-y-1">
                     <PrimaryGradeIndicatorsTable 
                        indicators={indicators} 
                        gradesData={gradesData} 
                     />
                </div>
                 <div className="mt-0 text-xs space-y-0 mb-0 flex-grow flex flex-col">
                    <div className="flex-1 flex flex-col">
                        <h4 className="font-bold">Actitudes, Hábitos de Trabajo:</h4>
                        <p className="border border-black p-1 break-words whitespace-pre-wrap flex-grow text-[9px] leading-tight">{flattenText(gradesData['actitudesHabitos'])}</p>
                    </div>
                     <div className="flex-1 flex flex-col">
                        <h4 className="font-bold">Recomendaciones:</h4>
                        <p className="border border-black p-1 break-words whitespace-pre-wrap flex-grow text-[9px] leading-tight">{flattenText(gradesData['recomendacionesDocente'])}</p>
                    </div>
                </div>
                <SignaturesTable />
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