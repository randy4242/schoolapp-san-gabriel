
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, Course, Lapso, AuthenticatedUser, Classroom, User } from '../../types';
import { ClipboardCheckIcon, UnlockIcon, BlockIcon } from '../../components/icons';
import Modal from '../../components/Modal';

/**
 * Counts business days (Mon-Fri) passed since a start date.
 */
function countBusinessDays(startDate: Date, today: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    curDate.setHours(0, 0, 0, 0); // Start of the day

    const todayStart = new Date(today.getTime());
    todayStart.setHours(0, 0, 0, 0);

    if (todayStart < curDate) return 0;

    while (curDate <= todayStart) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 0 = Sunday, 6 = Saturday
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    // Subtract 1 to not count the creation day itself.
    return count > 0 ? count - 1 : 0;
}

function isEvaluationEditable(evaluation: Evaluation, user: AuthenticatedUser | null): boolean {
    if (!evaluation || !user) return false;
    
    // Super Admins (role 6 per user request) can always edit.
    if (user.roleId === 6) {
        return true;
    }

    // Check for an override string.
    if (evaluation.description?.includes('@@OVERRIDE:')) {
        return true;
    }

    const today = new Date();
    
    // Future evaluations are always editable
    const evaluationDate = new Date(evaluation.date);
    if (evaluationDate > today) return true; 

    // For past/today evaluations, check if within the 3 business day window from creation.
    const creationDate = new Date(evaluation.createdAt);
    const businessDaysPassed = countBusinessDays(creationDate, today);

    return businessDaysPassed <= 3;
}

function isLockedForTeacher(evaluation: Evaluation): boolean {
    const hasOverride = evaluation.description?.includes('@@OVERRIDE:');
    if (hasOverride) {
        return false;
    }

    const today = new Date();
    
    // Future evaluations are never locked
    const evaluationDate = new Date(evaluation.date);
    if (evaluationDate > today) return false;

    // For past/today evaluations, check if it's beyond 3 business days from creation
    const creationDate = new Date(evaluation.createdAt);
    const businessDaysPassed = countBusinessDays(creationDate, today);

    return businessDaysPassed > 3;
}

const EvaluationListPage: React.FC = () => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [evaluationToUnlock, setEvaluationToUnlock] = useState<Evaluation | null>(null);
    const [evaluationToLock, setEvaluationToLock] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ lapsoId: '', courseId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [idFilter, setIdFilter] = useState<string | null>(null);
    const [selectedClassroomIds, setSelectedClassroomIds] = useState<Set<number>>(new Set());
    const [isClassroomDropdownOpen, setIsClassroomDropdownOpen] = useState(false);
    const classroomDropdownRef = useRef<HTMLDivElement>(null);
    const [requestingUnlockFor, setRequestingUnlockFor] = useState<Evaluation | null>(null);
    const [unlockComment, setUnlockComment] = useState('');
    const [isSendingRequest, setIsSendingRequest] = useState(false);


    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const canManage = useMemo(() => hasPermission([6, 2, 9, 10]), [hasPermission]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (classroomDropdownRef.current && !classroomDropdownRef.current.contains(event.target as Node)) {
                setIsClassroomDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchData = async () => {
        if (user?.schoolId && user?.userId) {
            try {
                setLoading(true);
                setError('');
                const [evalData, taughtCoursesData, lapsoData, allClassroomsData, usersData] = await Promise.all([
                    apiService.getEvaluations(user.schoolId, user.userId, filters.lapsoId ? Number(filters.lapsoId) : undefined, filters.courseId ? Number(filters.courseId) : undefined),
                    apiService.getTaughtCourses(user.userId, user.schoolId),
                    apiService.getLapsos(user.schoolId),
                    apiService.getClassrooms(user.schoolId),
                    apiService.getUsers(user.schoolId)
                ]);
                
                setEvaluations(evalData);
                setCourses(taughtCoursesData);
                setLapsos(lapsoData);
                setClassrooms(allClassroomsData);
                setUsers(usersData);

            } catch (err: any) {
                if (err.message && err.message.includes('validation errors occurred')) {
                    setError(err.message);
                } else {
                    setError('No se pudo cargar la información de evaluaciones.');
                }
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const searchQuery = params.get('search');
        const evalIdQuery = params.get('evalId');
        if (searchQuery) {
            setSearchTerm(searchQuery);
            setIdFilter(null);
        }
        if (evalIdQuery) {
            setIdFilter(evalIdQuery);
            setSearchTerm('');
        }
    }, [location.search]);
    
    useEffect(() => {
        fetchData();
    }, [user, filters.lapsoId, filters.courseId]);

    const userMap = useMemo(() => new Map(users.map(u => [u.userID, u.userName])), [users]);

    // FIX: Explicitly typed the return of useMemo to be Classroom[] to solve 'map' does not exist on type 'unknown' error.
    const professorClassrooms: Classroom[] = useMemo(() => {
        const evaluationClassroomIds = new Set(
            evaluations
                .map(e => e.classroomID)
                .filter((id): id is number => id != null && id > 0)
        );

        return classrooms.filter(c => evaluationClassroomIds.has(c.classroomID));
    }, [evaluations, classrooms]);


    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(e => {
            if (idFilter) {
                return e.evaluationID === parseInt(idFilter, 10);
            }
            const classroomMatch = selectedClassroomIds.size === 0 || (e.classroomID != null && selectedClassroomIds.has(e.classroomID));
            const searchMatch = !searchTerm || e.title.toLowerCase().includes(searchTerm.toLowerCase());
            return classroomMatch && searchMatch;
        });
    }, [evaluations, selectedClassroomIds, searchTerm, idFilter]);

    const groupedEvaluations: Record<string, Evaluation[]> = useMemo(() => {
        const classroomIdToNameMap = new Map<number, string>(classrooms.map(c => [c.classroomID, c.name]));
        classroomIdToNameMap.set(0, "Sin Salón Asignado");

        const groups = filteredEvaluations.reduce((acc, evaluation) => {
            const classroomId = evaluation.classroomID ?? 0;
            const groupName = classroomIdToNameMap.get(classroomId) || `Salón Desconocido #${classroomId}`;
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(evaluation);
            return acc;
        }, {} as Record<string, Evaluation[]>);
        
        const sortedEntries = Object.entries(groups).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
        
        return Object.fromEntries(sortedEntries) as Record<string, Evaluation[]>;
    }, [filteredEvaluations, classrooms]);
    
    const getEvaluationParts = (description: string | null | undefined): { text: string, percent: string, override: string } => {
        if (!description) return { text: '—', percent: '—', override: '' };
    
        let currentDesc = description;
        let override = '';

        const overrideMatch = currentDesc.match(/@@OVERRIDE:.*$/);
        if (overrideMatch) {
            override = overrideMatch[0];
            currentDesc = currentDesc.replace(override, '').trim();
        }

        const parts = currentDesc.split('@');
        if (parts.length > 1) {
            const potentialPercent = parts[parts.length - 1];
            if (!isNaN(parseFloat(potentialPercent))) {
                 const percent = parts.pop();
                 return { text: parts.join('@'), percent: `${percent}%`, override };
            }
        }
        return { text: currentDesc, percent: '—', override };
    };

    const handleDelete = async (evaluationId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta evaluación? Esta acción no se puede deshacer.')) {
            try {
                if (user?.schoolId) {
                    await apiService.deleteEvaluation(evaluationId, user.schoolId);
                    setEvaluations(prev => prev.filter(e => e.evaluationID !== evaluationId));
                }
            } catch (err) {
                setError('Error al eliminar la evaluación.');
                console.error(err);
            }
        }
    };
    
    const promptGrantOverride = (evaluation: Evaluation) => {
        setEvaluationToUnlock(evaluation);
    };

    const confirmGrantOverride = async () => {
        if (!evaluationToUnlock || !user || user.roleId !== 6) {
            setError("Acción no permitida.");
            setEvaluationToUnlock(null);
            return;
        }

        const { text, percent } = getEvaluationParts(evaluationToUnlock.description);
        const percentValue = percent.replace('%', '');
        let cleanDescription = text === '—' ? '' : text;
        if (percentValue !== '—' && percentValue !== '') {
            cleanDescription = `${cleanDescription}@${percentValue}`;
        }
        
        const overrideString = `@@OVERRIDE:${user.userId}:${Date.now()}`;
        const newDescription = `${cleanDescription}${cleanDescription ? ' ' : ''}${overrideString}`;
        
        try {
            const payload: Partial<Evaluation> = { ...evaluationToUnlock, description: newDescription };
            await apiService.updateEvaluation(evaluationToUnlock.evaluationID, payload);
            
            const notificationPayload = {
                title: `Evaluación Desbloqueada: ${evaluationToUnlock.title}`,
                content: `La evaluación "${evaluationToUnlock.title}" ha sido desbloqueada para su edición por un administrador. Ahora puede modificarla.\n\nURL: #/evaluations/edit/${evaluationToUnlock.evaluationID}`,
                userID: evaluationToUnlock.userID,
                schoolID: user.schoolId,
            };
            await apiService.sendNotification(notificationPayload);

            fetchData(); // Refresh list
        } catch (err: any) {
            setError(err.message || 'Error al conceder el permiso de edición.');
        } finally {
            setEvaluationToUnlock(null); // Close modal on success or error
        }
    };
    
    const promptLockEvaluation = (evaluation: Evaluation) => {
        setEvaluationToLock(evaluation);
    };

    const confirmLockEvaluation = async () => {
        if (!evaluationToLock || !user || user.roleId !== 6) {
            setError("Acción no permitida.");
            setEvaluationToLock(null);
            return;
        }

        const newDescription = evaluationToLock.description?.replace(/@@OVERRIDE:.*$/, '').trim() ?? '';
        
        try {
            const payload: Partial<Evaluation> = { ...evaluationToLock, description: newDescription };
            await apiService.updateEvaluation(evaluationToLock.evaluationID, payload);
            fetchData(); // Refresh list
        } catch (err: any) {
            setError(err.message || 'Error al bloquear la evaluación.');
        } finally {
            setEvaluationToLock(null);
        }
    };

    const handleSendUnlockRequest = async () => {
        if (!user || !user.schoolId || !requestingUnlockFor) return;
        setIsSendingRequest(true);
        try {
            const courseName = courses.find(c => c.courseID === requestingUnlockFor.courseID)?.name || "desconocido";
            const title = `[UNLOCK_REQUEST][EVAL_ID:${requestingUnlockFor.evaluationID}][USER_ID:${user.userId}][EVAL_NAME:${requestingUnlockFor.title}] Solicitud de Edición`;
            let content = `El profesor ${user.userName} ha solicitado permiso para editar la evaluación '${requestingUnlockFor.title}' del curso '${courseName}'.`;
    
            if (unlockComment.trim()) {
                content += `\n\nMotivo: ${unlockComment.trim()}`;
            }
    
            content += `\n\nURL: #/evaluations/edit/${requestingUnlockFor.evaluationID}`;
            
            // Role ID 6 is Super Admin
            await apiService.sendToRole(user.schoolId, 6, { title, content });
            alert("Solicitud enviada a los Super Admins. Recibirás una notificación si tu solicitud es aprobada.");
    
        } catch (err) {
            alert("Error al enviar la solicitud. Por favor, intente de nuevo.");
        } finally {
            setIsSendingRequest(false);
            setRequestingUnlockFor(null);
            setUnlockComment('');
        }
    };


    const handleClassroomSelection = (classroomId: number) => {
        const newSet = new Set(selectedClassroomIds);
        if (newSet.has(classroomId)) {
            newSet.delete(classroomId);
        } else {
            newSet.add(classroomId);
        }
        setSelectedClassroomIds(newSet);
    };

    const handleAssignGrades = (evaluation: Evaluation) => {
        const isDescriptiveSchool = user?.schoolId && [5, 6, 7, 8, 9].includes(user.schoolId);
        const courseName = evaluation.course?.name?.toLowerCase() || '';
        const isDescriptiveCourse = courseName.includes('nivel') || courseName.includes('sala');

        if (isDescriptiveSchool && isDescriptiveCourse) {
            navigate(`/evaluations/assign-descriptive/${evaluation.evaluationID}`);
        } else {
            navigate(`/evaluations/assign/${evaluation.evaluationID}`);
        }
    };
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Lista de Evaluaciones</h1>
                {canManage && (
                    <Link to="/evaluations/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                        Crear Evaluación
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-background rounded-lg border">
                <div>
                    <label htmlFor="searchTerm" className="block text-sm font-medium text-text-primary">Buscar por Título</label>
                    <input 
                        id="searchTerm" 
                        type="text"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setIdFilter(null); }}
                        className="mt-1 block w-full px-3 py-2 border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                        placeholder="Nombre de la evaluación..."
                    />
                </div>
                 <div>
                    <label htmlFor="lapsoFilter" className="block text-sm font-medium text-text-primary">Filtrar por Lapso</label>
                    <select id="lapsoFilter" value={filters.lapsoId} onChange={e => setFilters(f => ({...f, lapsoId: e.target.value, courseId: ''}))} className="mt-1 block w-full px-3 py-2 border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
                        <option value="">Todos los Lapsos</option>
                        {lapsos.map(lapso => <option key={lapso.lapsoID} value={lapso.lapsoID}>{lapso.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="courseFilter" className="block text-sm font-medium text-text-primary">Filtrar por Curso</label>
                    <select id="courseFilter" value={filters.courseId} onChange={e => setFilters(f => ({...f, courseId: e.target.value}))} className="mt-1 block w-full px-3 py-2 border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
                        <option value="">Todos los Cursos</option>
                        {courses.map(course => <option key={course.courseID} value={course.courseID}>{course.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary">Filtrar por Salón</label>
                    <div className="relative" ref={classroomDropdownRef}>
                        <button type="button" onClick={() => setIsClassroomDropdownOpen(!isClassroomDropdownOpen)} className="mt-1 block w-full pl-3 pr-10 py-2 text-left bg-surface border-border border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-accent">
                            <span className="block truncate">
                                {selectedClassroomIds.size === 0 ? 'Todos los Salones' : `${selectedClassroomIds.size} salones seleccionados`}
                            </span>
                        </button>
                        {isClassroomDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-surface shadow-lg border rounded-md max-h-60 overflow-auto">
                                {professorClassrooms.map(classroom => (
                                    <label key={classroom.classroomID} className="flex items-center px-3 py-2 text-sm hover:bg-background cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={selectedClassroomIds.has(classroom.classroomID)}
                                            onChange={() => handleClassroomSelection(classroom.classroomID)}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-accent"
                                        />
                                        <span className="ml-3 text-text-primary">{classroom.name}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {loading && <p>Cargando evaluaciones...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && Object.keys(groupedEvaluations).length > 0 && (
                <div className="space-y-8">
                {Object.entries(groupedEvaluations).map(([classroomName, evalsInGroup]) => (
                    <div key={classroomName} className="bg-surface shadow-md rounded-lg overflow-hidden">
                        <h3 className="px-6 py-3 bg-header text-lg font-semibold text-text-on-primary">{classroomName}</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Título</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Descripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">%</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Lapso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {evalsInGroup.map((e) => {
                                        const { text, percent } = getEvaluationParts(e.description);
                                        const courseName = courses.find(c => c.courseID === e.courseID)?.name || "N/A";
                                        const editable = isEvaluationEditable(e, user);
                                        const isSuperAdmin = user?.roleId === 6;
                                        const hasOverride = e.description?.includes('@@OVERRIDE:');
                                        const lockedForTeacher = isLockedForTeacher(e);

                                        const isDescriptiveSchool = user?.schoolId && [5, 6, 7, 8, 9].includes(user.schoolId);
                                        const evalCourseName = e.course?.name?.toLowerCase() || '';
                                        const isDescriptiveCourse = evalCourseName.includes('nivel') || evalCourseName.includes('sala');
                                        const isDescriptive = isDescriptiveSchool && isDescriptiveCourse;

                                        return (
                                        <tr key={e.evaluationID} className={`hover:bg-background ${!editable && !isSuperAdmin ? 'bg-gray-100' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {isSuperAdmin && lockedForTeacher && <BlockIcon className="text-danger mr-2 flex-shrink-0" title="Bloqueada para edición" />}
                                                    {e.title}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">{text}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{percent}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{courseName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{e.lapso?.nombre || "N/A"}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => handleAssignGrades(e)} className="text-success hover:text-success-text p-1" title={isDescriptive ? "Llenar Planilla Descriptiva" : "Asignar Notas"}>
                                                        <ClipboardCheckIcon />
                                                    </button>
                                                    
                                                    {editable ? (
                                                        <button onClick={() => navigate(`/evaluations/edit/${e.evaluationID}`)} className="p-1 text-warning hover:text-warning-dark" title="Editar">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        </button>
                                                    ) : !isSuperAdmin && (
                                                        <button onClick={() => setRequestingUnlockFor(e)} className="text-xs py-1 px-2 rounded bg-info text-white hover:bg-info-dark" title="Solicitar permiso de edición">
                                                            Solicitar Desbloqueo
                                                        </button>
                                                    )}

                                                    {isSuperAdmin && hasOverride && (
                                                        <button onClick={() => promptLockEvaluation(e)} className="text-danger hover:text-danger-text p-1" title="Bloquear edición manual">
                                                            <BlockIcon />
                                                        </button>
                                                    )}
                                                    {isSuperAdmin && lockedForTeacher && (
                                                        <button onClick={() => promptGrantOverride(e)} className="text-accent hover:text-accent/80 p-1" title="Permitir edición"><UnlockIcon /></button>
                                                    )}
                                                    <button onClick={() => handleDelete(e.evaluationID)} disabled={!editable} className={`p-1 ${!editable ? 'text-gray-400 cursor-not-allowed' : 'text-danger hover:text-danger-text'}`} title={!editable ? "La eliminación está bloqueada" : "Eliminar"}>
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
                </div>
            )}
            {!loading && !error && Object.keys(groupedEvaluations).length === 0 && (
                 <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                    <p className="text-secondary">No se encontraron evaluaciones que coincidan con los filtros.</p>
                </div>
            )}
            
            {evaluationToUnlock && (
                <Modal isOpen={true} onClose={() => setEvaluationToUnlock(null)} title="Confirmar Desbloqueo">
                    <div>
                        <p>¿Estás seguro de que quieres desbloquear la edición de la evaluación "<strong>{evaluationToUnlock.title}</strong>" para el profesor <strong>{userMap.get(evaluationToUnlock.userID)}</strong>?</p>
                        <p className="text-sm text-secondary mt-2">Esta acción permitirá la edición por tiempo indefinido hasta que se vuelva a bloquear manualmente. Se enviará una notificación al profesor.</p>
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
                        <button onClick={() => setEvaluationToUnlock(null)} className="py-2 px-4 rounded bg-background">Cancelar</button>
                        <button onClick={confirmGrantOverride} className="py-2 px-4 rounded bg-accent text-text-on-accent">Sí, Desbloquear</button>
                    </div>
                </Modal>
            )}
            
            {evaluationToLock && (
                 <Modal isOpen={true} onClose={() => setEvaluationToLock(null)} title="Confirmar Bloqueo">
                    <div>
                        <p>¿Estás seguro de que quieres volver a bloquear la evaluación "<strong>{evaluationToLock.title}</strong>"?</p>
                         <p className="text-sm text-secondary mt-2">Esto revocará el permiso de edición manual que se había concedido.</p>
                    </div>
                     <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
                        <button onClick={() => setEvaluationToLock(null)} className="py-2 px-4 rounded bg-background">Cancelar</button>
                        <button onClick={confirmLockEvaluation} className="py-2 px-4 rounded bg-danger text-text-on-primary">Sí, Bloquear</button>
                    </div>
                </Modal>
            )}

            {requestingUnlockFor && (
                <Modal isOpen={true} onClose={() => setRequestingUnlockFor(null)} title="Solicitar Edición">
                     <div>
                        <p>Se enviará una solicitud a un Super Admin para desbloquear la evaluación "<strong>{requestingUnlockFor.title}</strong>".</p>
                        <p className="text-sm text-secondary mt-2">Puedes añadir un motivo para tu solicitud.</p>
                        <textarea value={unlockComment} onChange={(e) => setUnlockComment(e.target.value)} className="w-full p-2 mt-2 border rounded" placeholder="Motivo (opcional)..." />
                    </div>
                     <div className="flex justify-end space-x-2 pt-4 mt-4 border-t">
                        <button onClick={() => setRequestingUnlockFor(null)} disabled={isSendingRequest} className="py-2 px-4 rounded bg-background">Cancelar</button>
                        <button onClick={handleSendUnlockRequest} disabled={isSendingRequest} className="py-2 px-4 rounded bg-primary text-text-on-accent disabled:bg-secondary">
                           {isSendingRequest ? 'Enviando...' : 'Enviar Solicitud'}
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default EvaluationListPage;
