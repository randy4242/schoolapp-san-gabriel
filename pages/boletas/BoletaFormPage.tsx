import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, IndicatorSection, StudentAttendanceStats, Lapso, BOLETA_LEVELS } from '../../types';
import DescriptiveGradeSheet from '../../components/evaluations/DescriptiveGradeSheet';
import {
    SALA_1_INDICATORS, SALA_2_INDICATORS, SALA_3_INDICATORS,
    PRIMER_GRADO_INDICATORS, SEGUNDO_GRADO_INDICATORS, TERCER_GRADO_INDICATORS,
    CUARTO_GRADO_INDICATORS, QUINTO_GRADO_INDICATORS, SEXTO_GRADO_INDICATORS
} from '../../data/indicators';
import { SpinnerIcon } from '../../components/icons';
import Modal from '../../components/Modal';

type FormInputs = {
    userId: number;
    level: string; // 'Sala 1', 'Primer Grado', etc.
    signatoryName: string;
    signatoryTitle: string;
    schoolPerformanceFeatures: string;
    turno: 'Mañana' | 'Tarde';
    diasHabiles?: any;
    manualAsistencias?: string;
    manualInasistencias?: string;
    actitudesHabitos?: string;
    recomendacionesDocente?: string;
    lapsoId: number;
    // New fields for additional teacher
    manualTeacherName?: string;
    manualTeacherCedulaPrefix?: string;
    manualTeacherCedulaNumber?: string;
    [key: string]: any;
};

// Helper to hide the internal tag [Tag] from the display name
const getDisplayName = (name: string, schoolId?: number) => {
    if (!name) return '';
    const allowedSchools = [5, 6, 7, 8, 9];
    if (schoolId && allowedSchools.includes(schoolId)) {
        return name.replace(/^\[.*?\]\s*/, '');
    }
    return name;
};

const determineBoletaLevel = (classroomName: string | undefined | null): string | null => {
    if (!classroomName) return null;

    // 1. Strict Tag Detection: Check for [Level] pattern first
    const tagMatch = classroomName.match(/^\[(.*?)\]/);
    if (tagMatch) {
        return tagMatch[1]; // Return the level inside the brackets immediately
    }

    // 2. Legacy / Natural Language Fallback
    const normalized = classroomName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Preschool Logic (Arabic & Roman Numerals)
    if (/(sala\s*1|nivel\s*1|primer\s*nivel|1er\s*nivel|1\s*nivel|sala\s*i\b|nivel\s*i\b)/.test(normalized)) return "Sala 1";
    if (/(sala\s*2|nivel\s*2|segundo\s*nivel|2do\s*nivel|2\s*nivel|sala\s*ii\b|nivel\s*ii\b)/.test(normalized)) return "Sala 2";
    if (/(sala\s*3|nivel\s*3|tercer\s*nivel|3er\s*nivel|3\s*nivel|sala\s*iii\b|nivel\s*iii\b)/.test(normalized)) return "Sala 3";

    // Primary Logic
    if (/(primer\s*grado|1er\s*grado|1\s*grado|grado\s*1)/.test(normalized)) return "Primer Grado";
    if (/(segundo\s*grado|2do\s*grado|2\s*grado|grado\s*2)/.test(normalized)) return "Segundo Grado";
    if (/(tercer\s*grado|3er\s*grado|3\s*grado|grado\s*3)/.test(normalized)) return "Tercer Grado";
    if (/(cuarto\s*grado|4to\s*grado|4\s*grado|grado\s*4)/.test(normalized)) return "Cuarto Grado";
    if (/(quinto\s*grado|5to\s*grado|5\s*grado|grado\s*5)/.test(normalized)) return "Quinto Grado";
    if (/(sexto\s*grado|6to\s*grado|6\s*grado|grado\s*6)/.test(normalized)) return "Sexto Grado";
    
    return null;
};

// Helper to strip status tag
const cleanContent = (content: string | undefined | null) => {
    if (!content) return '';
    return content
        .replace('[BOLETA_CONFIRMADA]', '')
        .replace('[BOLETA_RECHAZADA]', '')
        .trim();
};

const BoletaFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    
    const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            signatoryName: user?.userName || "",
            signatoryTitle: "",
            level: "",
            schoolPerformanceFeatures: "",
            turno: "Mañana",
            manualAsistencias: "",
            manualInasistencias: "",
            manualTeacherCedulaPrefix: "V"
        }
    });

    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState('');
    const [students, setStudents] = useState<User[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [schoolName, setSchoolName] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [levelMessage, setLevelMessage] = useState<{ type: 'success' | 'warning' | 'error', text: string } | null>(null);
    const [attendanceStats, setAttendanceStats] = useState<StudentAttendanceStats['overall'] | null>(null);
    const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
    const [originalCreatorId, setOriginalCreatorId] = useState<number | null>(null);
    const [dateRangeInfo, setDateRangeInfo] = useState<string>('');
    
    const selectedUserId = watch('userId');
    const selectedLevel = watch('level');
    const selectedLapsoId = watch('lapsoId');

    // Watched values for counters
    const schoolPerformanceFeaturesValue = watch('schoolPerformanceFeatures') || '';
    const actitudesHabitosValue = watch('actitudesHabitos') || '';
    const recomendacionesDocenteValue = watch('recomendacionesDocente') || '';

    const isSuperAdmin = useMemo(() => hasPermission([6]), [hasPermission]);

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getStudents(user.schoolId),
                apiService.getSchoolName(user.schoolId),
                apiService.getLapsos(user.schoolId)
            ]).then(([studentsData, schoolNameData, lapsosData]) => {
                setStudents(studentsData);
                setSchoolName(schoolNameData);
                setLapsos(lapsosData);
            }).catch(() => setError("No se pudo cargar la data inicial."))
            .finally(() => setLoading(false));
        }
    }, [user]);
    
    useEffect(() => {
        if (lapsos.length > 0 && selectedLapsoId) {
            const selectedLapso = lapsos.find(l => l.lapsoID === Number(selectedLapsoId));

            if (selectedLapso) {
                const parseLocal = (dateStr: string) => {
                    const d = new Date(dateStr);
                    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
                };

                const startDate = parseLocal(selectedLapso.fechaInicio);
                const endDate = parseLocal(selectedLapso.fechaFin);
                
                setDateRangeInfo(`(${startDate.toLocaleDateString('es-ES')} al ${endDate.toLocaleDateString('es-ES')})`);

                const calculateTotalBusinessDays = (start: Date, end: Date): number => {
                    let count = 0;
                    const curDate = new Date(start.getTime());
                    
                    if (curDate > end) return 0;

                    while (curDate <= end) {
                        const dayOfWeek = curDate.getDay();
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                            count++;
                        }
                        curDate.setDate(curDate.getDate() + 1);
                    }
                    return count;
                };

                const totalWorkingDays = calculateTotalBusinessDays(startDate, endDate);
                
                const currentVal = getValues('diasHabiles');
                if (!currentVal || currentVal == 0) {
                    setValue('diasHabiles', totalWorkingDays);
                }
            } 
        }
    }, [lapsos, selectedLapsoId, getValues, setValue]);

    useEffect(() => {
        const fetchStudentData = async () => {
            if (selectedUserId && user?.schoolId) {
                setDetailsLoading(true);
                setLevelMessage(null);
                setAttendanceStats(null);
                
                if (!isEditMode) {
                    setValue('level', ''); 
                }

                try {
                    const stats = await apiService.getStudentAttendanceStats(selectedUserId, '', user.schoolId, selectedLapsoId ? Number(selectedLapsoId) : undefined);
                    setAttendanceStats(stats.overall);
                } catch (e) {
                    console.warn("Could not load attendance stats", e);
                }

                try {
                    let classroomName = '';
                    try {
                        const details = await apiService.getUserDetails(selectedUserId, user.schoolId);
                        if (details?.classroom?.name) {
                            classroomName = details.classroom.name;
                        } else if (details?.classroomID) {
                            const cls = await apiService.getClassroomById(details.classroomID, user.schoolId);
                            classroomName = cls.name;
                        }
                    } catch (detailErr) {
                        console.warn("User details fetch failed, trying fallback from student list...");
                    }

                    if (!classroomName && students.length > 0) {
                        const currentStudent = students.find(s => s.userID === Number(selectedUserId));
                        if (currentStudent?.classroomID) {
                             try {
                                const cls = await apiService.getClassroomById(currentStudent.classroomID, user.schoolId);
                                classroomName = cls.name;
                             } catch (clsErr) {
                                 console.warn("Failed to fetch classroom by ID from student list fallback");
                             }
                        }
                    }

                    const detectedLevel = determineBoletaLevel(classroomName);
                    const cleanClassName = getDisplayName(classroomName, user.schoolId);

                    if (detectedLevel) {
                        if (!isEditMode) {
                            setValue('level', detectedLevel);
                        }
                        setLevelMessage({
                            type: 'success',
                            text: `Estudiante en "${cleanClassName}". Se detectó nivel sugerido: ${detectedLevel}.`
                        });
                    } else {
                        if (classroomName) {
                            setLevelMessage({
                                type: 'warning',
                                text: `El salón "${cleanClassName}" no tiene un nivel automático. Por favor seleccione la boleta manualmente.`
                            });
                        } else {
                             setLevelMessage({
                                type: 'warning',
                                text: `No se pudo detectar el salón del estudiante. Seleccione el nivel manualmente.`
                            });
                        }
                    }
                } catch (err) {
                    console.error("Error determining classroom/level", err);
                    setLevelMessage({ type: 'warning', text: "Error obteniendo datos del salón. Seleccione manualmente." });
                } finally {
                    setDetailsLoading(false);
                }
            } else {
                setLevelMessage(null);
                setAttendanceStats(null);
            }
        };

        fetchStudentData();
    }, [selectedUserId, user?.schoolId, setValue, isEditMode, selectedLapsoId, students]);

    useEffect(() => {
        if (isEditMode && id && user?.schoolId && students.length > 0 && lapsos.length > 0) {
            setLoading(true);
            apiService.getCertificateById(Number(id), user.schoolId)
                .then(boletaData => {
                    const rawContent = cleanContent(boletaData.content);
                    let content = {};
                    try {
                        if (rawContent) content = JSON.parse(rawContent);
                    } catch (e) {
                        console.error("Failed to parse boleta content", e);
                    }
                    const typedContent = content as any;
                    
                    setOriginalCreatorId(typedContent.createdBy || boletaData.userId); 

                    // Construct the full form data object for reset()
                    const formData: any = {
                        userId: boletaData.userId,
                        level: typedContent.level || '',
                        lapsoId: typedContent.lapso?.lapsoID || (lapsos.length > 0 ? lapsos[0].lapsoID : ''),
                        signatoryName: boletaData.signatoryName || user?.userName || '',
                        signatoryTitle: boletaData.signatoryTitle || '',
                        schoolPerformanceFeatures: typedContent.data?.schoolPerformanceFeatures || '',
                        turno: typedContent.turno || 'Mañana',
                        diasHabiles: typedContent.data?.diasHabiles || '',
                        manualAsistencias: typedContent.data?.manualAsistencias || '',
                        manualInasistencias: typedContent.data?.manualInasistencias || '',
                        
                        // Additional Teacher Fields
                        manualTeacherName: typedContent.data?.manualTeacherName || '',
                        manualTeacherCedulaPrefix: typedContent.data?.manualTeacherCedulaPrefix || 'V',
                        manualTeacherCedulaNumber: typedContent.data?.manualTeacherCedulaNumber || '',
                        
                        // Text Areas
                        actitudesHabitos: typedContent.data?.actitudesHabitos || '',
                        recomendacionesDocente: typedContent.data?.recomendacionesDocente || ''
                    };

                    // Merge all dynamic grade keys (e.g., "0-1": "Consolidado") into formData
                    if (typedContent.data) {
                        const isPrimary = (typedContent.level || '').includes('Grado');
                        
                        for (const key in typedContent.data) {
                            // Migrate legacy "Sin Evidencias" to "Con Ayuda" ONLY for Primary levels
                            if (isPrimary && typedContent.data[key] === "Sin Evidencias") {
                                typedContent.data[key] = "Con Ayuda";
                            }
                        }
                        Object.assign(formData, typedContent.data);
                    }

                    // Perform reset to populate the form
                    reset(formData);

                    if (typedContent.attendance) {
                        setAttendanceStats(typedContent.attendance);
                    }
                })
                .catch((err) => {
                    console.error(err);
                    setError("No se pudo cargar la boleta para editar.");
                })
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, user, reset, students, lapsos]);

    const filteredStudents = useMemo(() => {
        if (!userSearch) return students;
        return students.filter(s => 
            s.userName.toLowerCase().includes(userSearch.toLowerCase()) || 
            (s.cedula && s.cedula.includes(userSearch))
        );
    }, [students, userSearch]);

    const getIndicators = (level: string): IndicatorSection[] => {
        if (level === 'Sala 1') return SALA_1_INDICATORS;
        if (level === 'Sala 2') return SALA_2_INDICATORS;
        if (level === 'Sala 3') return SALA_3_INDICATORS;
        if (level === 'Primer Grado') return PRIMER_GRADO_INDICATORS;
        if (level === 'Segundo Grado') return SEGUNDO_GRADO_INDICATORS;
        if (level === 'Tercer Grado') return TERCER_GRADO_INDICATORS;
        if (level === 'Cuarto Grado') return CUARTO_GRADO_INDICATORS;
        if (level === 'Quinto Grado') return QUINTO_GRADO_INDICATORS;
        if (level === 'Sexto Grado') return SEXTO_GRADO_INDICATORS;
        return [];
    };

    const indicators = useMemo(() => getIndicators(selectedLevel), [selectedLevel]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }
        
        if (!data.level) {
            setError("Debe seleccionar un Nivel/Grado para generar la boleta.");
            return;
        }

        setLoading(true);
        setError('');
        
        const { userId, level, signatoryName, signatoryTitle, turno, diasHabiles, lapsoId, manualAsistencias, manualInasistencias, manualTeacherName, manualTeacherCedulaPrefix, manualTeacherCedulaNumber, ...gradesData } = data;
        
        const selectedLapso = lapsos.find(l => l.lapsoID === Number(lapsoId));
        
        const finalAttendance = {
            ...attendanceStats,
            total: (diasHabiles !== null && diasHabiles !== undefined && String(diasHabiles).trim() !== '') ? Number(diasHabiles) : attendanceStats?.total,
        };
         
        const contentPayload = {
            level: level,
            data: {
                ...gradesData, 
                diasHabiles: finalAttendance.total,
                manualAsistencias, 
                manualInasistencias,
                manualTeacherName,
                manualTeacherCedulaPrefix,
                manualTeacherCedulaNumber
            },
            turno: turno,
            attendance: finalAttendance,
            schoolName: schoolName,
            lapso: selectedLapso,
            createdBy: originalCreatorId || user.userId, 
        };

        const isConfirmed = isSuperAdmin;
        const contentString = JSON.stringify(contentPayload);
        const finalContent = isConfirmed ? `[BOLETA_CONFIRMADA]${contentString}` : contentString;

        const apiPayload = {
            userId: Number(userId),
            certificateType: 'Boleta',
            signatoryName,
            signatoryTitle,
            content: finalContent,
            schoolId: user.schoolId,
            issueDate: new Date().toISOString() 
        };

        try {
            let resultCertId = Number(id);
            if (isEditMode && id) {
                await apiService.updateCertificate(Number(id), apiPayload);
            } else {
                const newCert = await apiService.createCertificate(apiPayload);
                resultCertId = newCert.certificateId;
            }

            if (!isSuperAdmin) {
                const studentName = students.find(s => s.userID === Number(userId))?.userName || "Estudiante";
                const notificationTitle = `[BOLETA_REQUEST][ID:${resultCertId}] Revisión de Boleta`;
                const notificationContent = `El profesor ${user.userName} ha generado/editado una boleta para ${studentName} (${level}). Requiere revisión.\n\nURL: #/boletas?highlight=${resultCertId}`;
                await apiService.sendToRole(user.schoolId, 6, { title: notificationTitle, content: notificationContent });
            }

            navigate('/boletas');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar la boleta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            {isGuideModalOpen && (
                <Modal isOpen={true} onClose={() => setIsGuideModalOpen(false)} title="Guía de Indicadores">
                    <div className="space-y-2">
                        <ul className="text-base text-text-primary list-disc list-inside space-y-2">
                            <li><span className="font-semibold">Consolidado:</span> Aprendizaje logrado</li>
                            <li><span className="font-semibold">En proceso:</span> En vía para lograr el aprendizaje</li>
                            <li><span className="font-semibold">Iniciado:</span> Requiere ayuda para lograr el aprendizaje</li>
                            <li><span className="font-semibold">Con Ayuda:</span> Inasistente</li>
                        </ul>
                    </div>
                    <div className="flex justify-end pt-4 mt-4 border-t">
                        <button type="button" onClick={() => setIsGuideModalOpen(false)} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">
                            Cerrar
                        </button>
                    </div>
                </Modal>
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">{isEditMode ? 'Editar Boleta' : 'Crear Nueva Boleta'}</h1>
                <button 
                    type="button" 
                    onClick={() => setIsGuideModalOpen(true)}
                    className="bg-info text-white py-2 px-4 rounded text-sm hover:bg-info-dark"
                >
                    Guia
                </button>
            </div>


            {error && <p className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</p>}
            {!isSuperAdmin && (
                <div className="bg-warning/10 text-warning-dark p-3 rounded mb-4 text-sm">
                    Nota: Al guardar, esta boleta quedará en estado <strong>Pendiente</strong> y se enviará una notificación a la administración para su revisión y aprobación.
                </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                     <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Buscar Estudiante:</label>
                        <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} disabled={isEditMode} className="mb-2 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md disabled:bg-background" placeholder="Escribe un nombre o cédula..." />
                        <select {...register('userId', { required: 'Debe seleccionar un estudiante', valueAsNumber: true })} disabled={isEditMode} className="block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md disabled:bg-background">
                            <option value="">Seleccione un estudiante...</option>
                            {filteredStudents.map(s => <option key={s.userID} value={s.userID}>{s.userName} (C.I: {s.cedula})</option>)}
                        </select>
                        {errors.userId && <p className="text-danger text-xs mt-1">{errors.userId.message}</p>}
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Lapso Evaluado:</label>
                        <select {...register('lapsoId', { required: 'Debe seleccionar un lapso', valueAsNumber: true })} className="block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md">
                            <option value="">Seleccione un lapso...</option>
                            {lapsos.map(l => <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>)}
                        </select>
                         {errors.lapsoId && <p className="text-danger text-xs mt-1">{errors.lapsoId.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Colegio:</label>
                        <input
                            type="text"
                            value={schoolName}
                            readOnly
                            className="block w-full px-3 py-2 border border-border bg-background text-text-secondary rounded-md cursor-not-allowed focus:outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Nivel / Grado (Seleccione o Confirme):</label>
                    <div className="relative">
                        <select
                            {...register('level', { required: 'El nivel es requerido' })}
                            className="block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                        >
                            <option value="">-- Seleccione el Nivel --</option>
                            {BOLETA_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                        {detailsLoading && (
                            <div className="absolute right-8 top-2">
                                <SpinnerIcon className="text-primary h-5 w-5" />
                            </div>
                        )}
                    </div>

                    {levelMessage && (
                        <div className={`mt-2 p-2 text-xs rounded border ${
                            levelMessage.type === 'success' ? 'bg-success-light border-success text-success-text' : 
                            levelMessage.type === 'warning' ? 'bg-warning/10 border-warning text-warning-dark' : 
                            'bg-danger-light border-danger text-danger-text'
                        }`}>
                            {levelMessage.text}
                        </div>
                    )}
                </div>

                {/* Only show the rest of the form if a valid level is selected */}
                {selectedLevel && (
                    <div className="animate-fade-in-down">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 border-t pt-4 mt-4">
                             <div>
                                <label className="block text-sm font-medium text-text-primary">Turno:</label>
                                <select {...register('turno')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md">
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Días Hábiles</label>
                                <input 
                                    type="number"
                                    {...register('diasHabiles')} 
                                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    placeholder="Total días"
                                />
                                {dateRangeInfo && (
                                    <p className="text-xs text-info mt-1">{dateRangeInfo}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Asistencias (Manual)</label>
                                <input 
                                    type="text"
                                    {...register('manualAsistencias')} 
                                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    placeholder="Ej: 15"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Inasistencias (Manual)</label>
                                <input 
                                    type="text"
                                    {...register('manualInasistencias')} 
                                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    placeholder="Ej: 2"
                                />
                            </div>
                            <div className="col-span-full">
                                <p className="text-xs text-secondary mt-1">Si deja los campos de asistencia vacíos, el usuario podrá llenarlos a mano en la boleta impresa.</p>
                            </div>
                            {!selectedLevel?.includes('Grado') && (
                                <div className="md:col-span-2 lg:col-span-4">
                                    <label className="block text-sm font-medium text-text-primary">Características de la actuación escolar:</label>
                                    <textarea 
                                        {...register('schoolPerformanceFeatures')} 
                                        rows={3} 
                                        maxLength={250}
                                        className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                                        placeholder="Escriba aquí las características generales..."
                                    />
                                    <div className="text-right text-xs text-secondary mt-1">
                                        {schoolPerformanceFeaturesValue.length}/250 caracteres
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedLevel?.includes('Grado') && (
                            <div className="grid grid-cols-1 gap-4 pt-4 mt-4 border-t">
                                {/* Additional Teacher Section */}
                                <div className="bg-background p-4 rounded-md border border-border">
                                    <h3 className="text-sm font-bold text-text-primary mb-2">Profesor Adicional (Opcional)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-text-secondary">Nombre Completo</label>
                                            <input 
                                                {...register('manualTeacherName')} 
                                                className="mt-1 w-full px-3 py-2 border border-border bg-surface rounded text-sm"
                                                placeholder="Ej. María Pérez"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-secondary">Cédula</label>
                                            <div className="flex gap-2">
                                                <select 
                                                    {...register('manualTeacherCedulaPrefix')}
                                                    className="mt-1 w-20 px-2 py-2 border border-border bg-surface rounded text-sm"
                                                >
                                                    <option value="V">V</option>
                                                    <option value="E">E</option>
                                                    <option value="P">P</option>
                                                </select>
                                                <input 
                                                    {...register('manualTeacherCedulaNumber')}
                                                    className="mt-1 w-full px-3 py-2 border border-border bg-surface rounded text-sm"
                                                    placeholder="12345678"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-xs text-secondary mt-1">Este profesor aparecerá junto al profesor principal en la boleta.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-text-primary">Actitudes, Hábitos de Trabajo:</label>
                                    <textarea {...register('actitudesHabitos')} maxLength={250} rows={3} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
                                    <div className="text-right text-xs text-secondary mt-1">
                                        {actitudesHabitosValue.length}/250 caracteres
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary">Recomendaciones:</label>
                                    <textarea {...register('recomendacionesDocente')} maxLength={250} rows={3} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
                                    <div className="text-right text-xs text-secondary mt-1">
                                        {recomendacionesDocenteValue.length}/250 caracteres
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 mt-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Nombre del Firmante</label>
                                <input {...register('signatoryName')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" placeholder="Nombre del docente o director(a)" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Cargo del Firmante (Opcional)</label>
                                <input {...register('signatoryTitle')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" placeholder="Ej. Docente / Director(a)" />
                            </div>
                        </div>

                        {indicators.length > 0 && (
                            <div className="mt-6 border-t pt-6">
                                <h2 className="text-xl font-semibold mb-4 text-text-primary">Indicadores - {selectedLevel}</h2>
                                <DescriptiveGradeSheet indicators={indicators} register={register} watch={watch} level={selectedLevel} />
                            </div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-end space-x-4 pt-8 border-t">
                    <Link to="/boletas" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                    <button type="submit" disabled={loading || detailsLoading || !selectedLevel} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary disabled:cursor-not-allowed">
                        {loading || detailsLoading ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Generar Boleta'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BoletaFormPage;