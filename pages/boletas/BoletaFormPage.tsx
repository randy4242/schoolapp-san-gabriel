
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User, IndicatorSection, StudentAttendanceStats, Lapso } from '../../types';
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
    actitudesHabitos?: string;
    recomendacionesDocente?: string;
    lapsoId: number;
    [key: string]: any;
};

const determineBoletaLevel = (classroomName: string | undefined | null): string | null => {
    if (!classroomName) return null;
    const name = classroomName.toLowerCase();

    // Preschool levels
    if (/(nivel\s*1|primer\s*nivel|1er\s*nivel|sala\s*1)/.test(name)) return "Sala 1";
    if (/(nivel\s*2|segundo\s*nivel|2do\s*nivel|sala\s*2)/.test(name)) return "Sala 2";
    if (/(nivel\s*3|tercer\s*nivel|3er\s*nivel|sala\s*3)/.test(name)) return "Sala 3";

    // Primary levels
    if (/(primer\s*grado|1er\s*grado)/.test(name)) return "Primer Grado";
    if (/(segundo\s*grado|2do\s*grado)/.test(name)) return "Segundo Grado";
    if (/(tercer\s*grado|3er\s*grado)/.test(name)) return "Tercer Grado";
    if (/(cuarto\s*grado|4to\s*grado)/.test(name)) return "Cuarto Grado";
    if (/(quinto\s*grado|5to\s*grado)/.test(name)) return "Quinto Grado";
    if (/(sexto\s*grado|6to\s*grado)/.test(name)) return "Sexto Grado";
    
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
    
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            signatoryName: user?.userName || "",
            signatoryTitle: "",
            level: "",
            schoolPerformanceFeatures: "",
            turno: "Mañana",
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
    
    const selectedUserId = watch('userId');
    const selectedLevel = watch('level');
    const selectedLapsoId = watch('lapsoId');

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
                if (lapsosData.length > 0 && !isEditMode) {
                    const currentLapso = findCurrentLapso(lapsosData);
                    setValue('lapsoId', currentLapso ? currentLapso.lapsoID : lapsosData[0].lapsoID);
                }
            }).catch(() => setError("No se pudo cargar la data inicial."))
            .finally(() => setLoading(false));
        }
    }, [user]);
    
    const findCurrentLapso = (lapsosList: Lapso[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return lapsosList.find(lapso => {
            const startDate = new Date(lapso.fechaInicio);
            const endDate = new Date(lapso.fechaFin);
            return today >= startDate && today <= endDate;
        });
    }

    useEffect(() => {
        if (lapsos.length > 0 && selectedLapsoId && !isEditMode) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const selectedLapso = lapsos.find(l => l.lapsoID === Number(selectedLapsoId));

            if (selectedLapso) {
                const startDate = new Date(selectedLapso.fechaInicio);
                const endDate = new Date(selectedLapso.fechaFin);
                
                const calculateWorkingDays = (start: Date, end: Date): number => {
                    let count = 0;
                    const curDate = new Date(start.getTime());
                    while (curDate <= end) {
                        const dayOfWeek = curDate.getDay();
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) { 
                            count++;
                        }
                        curDate.setDate(curDate.getDate() + 1);
                    }
                    return count;
                };

                const effectiveStartDate = today < startDate ? startDate : today;
                const remainingDays = calculateWorkingDays(effectiveStartDate, endDate);
                setValue('diasHabiles', remainingDays);
            } else {
                setValue('diasHabiles', 0);
            }
        }
    }, [lapsos, setValue, isEditMode, selectedLapsoId]);

    // Effect to fetch student classroom details and attendance, and auto-select level
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
                    const [details, stats] = await Promise.all([
                        apiService.getUserDetails(selectedUserId, user.schoolId),
                        apiService.getStudentAttendanceStats(selectedUserId, '', user.schoolId, selectedLapsoId ? Number(selectedLapsoId) : undefined)
                    ]);

                    setAttendanceStats(stats.overall);

                    // Use optional chaining here to prevent crash if details is null
                    const classroomName = details?.classroom?.name;
                    const detectedLevel = determineBoletaLevel(classroomName);

                    if (detectedLevel) {
                        if (!isEditMode) setValue('level', detectedLevel);
                        setLevelMessage({
                            type: 'success',
                            text: `Estudiante en "${classroomName}". Asignada boleta: ${detectedLevel}.`
                        });
                    } else {
                        if (classroomName) {
                            setLevelMessage({
                                type: 'warning',
                                text: `El salón "${classroomName}" no corresponde a un nivel de inicial o primaria compatible.`
                            });
                        } else {
                             setLevelMessage({
                                type: 'error',
                                text: `El estudiante no tiene un salón asignado. No se puede generar la boleta.`
                            });
                        }
                    }
                } catch (err) {
                    console.error(err);
                    setLevelMessage({ type: 'error', text: "Error al verificar el salón o la asistencia del estudiante." });
                } finally {
                    setDetailsLoading(false);
                }
            } else {
                setLevelMessage(null);
                setAttendanceStats(null);
                if (!isEditMode) {
                    setValue('level', '');
                }
            }
        };

        fetchStudentData();
    }, [selectedUserId, user?.schoolId, setValue, isEditMode, selectedLapsoId]);

    // Effect for pre-filling form in edit mode
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
                    
                    // Save original creator for filtering later if needed
                    setOriginalCreatorId(typedContent.createdBy || boletaData.userId); 

                    setValue('userId', boletaData.userId);
                    setValue('level', typedContent.level || '');
                    setValue('lapsoId', typedContent.lapso?.lapsoID || lapsos[0].lapsoID);
                    setValue('signatoryName', boletaData.signatoryName || user?.userName || '');
                    setValue('signatoryTitle', boletaData.signatoryTitle || '');
                    setValue('schoolPerformanceFeatures', typedContent.data?.schoolPerformanceFeatures || '');
                    setValue('turno', typedContent.turno || 'Mañana');
                    if (typedContent.data) {
                        for (const key in typedContent.data) {
                            setValue(key, typedContent.data[key]);
                        }
                    }
                    if (typedContent.attendance) {
                        setAttendanceStats(typedContent.attendance);
                        setValue('diasHabiles', typedContent.data?.diasHabiles ?? typedContent.attendance.total);
                    }
                })
                .catch(() => setError("No se pudo cargar la boleta para editar."))
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, user, setValue, students, lapsos]);

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
            setError("No se puede generar la boleta: El estudiante no pertenece a un Nivel válido.");
            return;
        }

        setLoading(true);
        setError('');
        
        const { userId, level, signatoryName, signatoryTitle, turno, diasHabiles, lapsoId, ...gradesData } = data;
        
        const selectedLapso = lapsos.find(l => l.lapsoID === Number(lapsoId));
        
        const finalAttendance = {
            ...attendanceStats,
            total: (diasHabiles !== null && diasHabiles !== undefined && String(diasHabiles).trim() !== '') ? Number(diasHabiles) : attendanceStats?.total,
        };
         
        const contentPayload = {
            level: level,
            data: {...gradesData, diasHabiles: finalAttendance.total},
            turno: turno,
            attendance: finalAttendance,
            schoolName: schoolName,
            lapso: selectedLapso,
            createdBy: originalCreatorId || user.userId, // Preserve creator or set current
        };

        // If Super Admin creates/edits, it's automatically confirmed.
        // If Teacher creates/edits, it is NOT confirmed (Pending).
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
            issueDate: new Date().toISOString() // Ensure issueDate is present for updates
        };

        try {
            let resultCertId = Number(id);
            if (isEditMode && id) {
                await apiService.updateCertificate(Number(id), apiPayload);
            } else {
                const newCert = await apiService.createCertificate(apiPayload);
                resultCertId = newCert.certificateId;
            }

            // If it's a teacher (not super admin), send notification to Admins
            if (!isSuperAdmin) {
                const studentName = students.find(s => s.userID === Number(userId))?.userName || "Estudiante";
                const notificationTitle = `[BOLETA_REQUEST][ID:${resultCertId}] Revisión de Boleta`;
                // Redirect to LIST page highlighting this item
                const notificationContent = `El profesor ${user.userName} ha generado/editado una boleta para ${studentName} (${level}). Requiere revisión.\n\nURL: #/boletas?highlight=${resultCertId}`;
                
                // Send to Role 6 (Admin)
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
                            <li><span className="font-semibold">Sin Evidencias:</span> Inasistente</li>
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
                    <label className="block text-sm font-medium text-text-primary mb-1">Nivel / Grado (Automático):</label>
                    <div className="relative">
                        <input
                            type="text"
                            {...register('level', { required: 'El nivel es requerido' })}
                            readOnly
                            className="block w-full px-3 py-2 border border-border bg-background text-text-secondary rounded-md cursor-not-allowed focus:outline-none"
                            placeholder="Esperando selección de estudiante..."
                        />
                        {detailsLoading && (
                            <div className="absolute right-2 top-2">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
                             <div>
                                <label className="block text-sm font-medium text-text-primary">Turno:</label>
                                <select {...register('turno')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md">
                                    <option value="Mañana">Mañana</option>
                                    <option value="Tarde">Tarde</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-primary">Días Hábiles del Lapso</label>
                                <input 
                                    type="number"
                                    {...register('diasHabiles')} 
                                    readOnly
                                    className="mt-1 block w-full px-3 py-2 border border-border rounded-md focus:outline-none bg-background text-text-secondary cursor-not-allowed"
                                    placeholder="Calculando..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-primary">Características de la actuación escolar:</label>
                                <textarea 
                                    {...register('schoolPerformanceFeatures')} 
                                    rows={3} 
                                    className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50"
                                    placeholder="Escriba aquí las características generales..."
                                />
                            </div>
                        </div>

                        {selectedLevel?.includes('Grado') && (
                            <div className="grid grid-cols-1 gap-4 pt-4 mt-4 border-t">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary">Actitudes, Hábitos de Trabajo:</label>
                                    <textarea {...register('actitudesHabitos')} rows={3} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary">Recomendaciones:</label>
                                    <textarea {...register('recomendacionesDocente')} rows={3} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
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

                        {/* Dynamic Indicator Sheet */}
                        {indicators.length > 0 && (
                            <div className="mt-6 border-t pt-6">
                                <h2 className="text-xl font-semibold mb-4 text-text-primary">Indicadores - {selectedLevel}</h2>
                                <DescriptiveGradeSheet indicators={indicators} register={register} />
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
