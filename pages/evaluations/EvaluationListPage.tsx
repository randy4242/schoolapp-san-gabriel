
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, Course, Lapso, AuthenticatedUser, Classroom, User } from '../../types';
import { ClipboardCheckIcon, UnlockIcon, BlockIcon } from '../../components/icons';
import Modal from '../../components/Modal';

function countBusinessDays(startDate: Date, today: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    curDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(today.getTime());
    todayStart.setHours(0, 0, 0, 0);
    if (todayStart < curDate) return 0;
    while (curDate <= todayStart) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count > 0 ? count - 1 : 0;
}

function isEvaluationEditable(evaluation: Evaluation, user: AuthenticatedUser | null): boolean {
    if (!evaluation || !user) return false;
    if (user.roleId === 6) return true;
    if (evaluation.description?.includes('@@OVERRIDE:')) return true;
    const today = new Date();
    const evaluationDate = new Date(evaluation.date);
    if (evaluationDate > today) return true; 
    const creationDate = new Date(evaluation.createdAt);
    const businessDaysPassed = countBusinessDays(creationDate, today);
    return businessDaysPassed <= 3;
}

function isLockedForTeacher(evaluation: Evaluation): boolean {
    const hasOverride = evaluation.description?.includes('@@OVERRIDE:');
    if (hasOverride) return false;
    const today = new Date();
    const evaluationDate = new Date(evaluation.date);
    if (evaluationDate > today) return false;
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
                setError('No se pudo cargar la información de evaluaciones.');
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
        if (searchQuery) { setSearchTerm(searchQuery); setIdFilter(null); }
        if (evalIdQuery) { setIdFilter(evalIdQuery); setSearchTerm(''); }
    }, [location.search]);
    
    useEffect(() => {
        fetchData();
    }, [user, filters.lapsoId, filters.courseId]);

    const userMap = useMemo(() => new Map(users.map(u => [u.userID, u.userName])), [users]);

    const professorClassrooms: Classroom[] = useMemo(() => {
        const evaluationClassroomIds = new Set(
            evaluations.map(e => e.classroomID).filter((id): id is number => id != null && id > 0)
        );
        return classrooms.filter(c => evaluationClassroomIds.has(c.classroomID));
    }, [evaluations, classrooms]);

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(e => {
            if (idFilter) return e.evaluationID === parseInt(idFilter, 10);
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
            if (!acc[groupName]) acc[groupName] = [];
            acc[groupName].push(evaluation);
            return acc;
        }, {} as Record<string, Evaluation[]>);
        return Object.fromEntries(Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)));
    }, [filteredEvaluations, classrooms]);
    
    const getEvaluationParts = (description: string | null | undefined): { text: string, percent: string, override: string, isNonEvaluable: boolean } => {
        if (!description) return { text: '—', percent: '—', override: '', isNonEvaluable: false };
    
        let currentDesc = description;
        let override = '';
        let isNonEvaluable = false;

        if (currentDesc.includes('| No evaluado |')) {
            isNonEvaluable = true;
            currentDesc = currentDesc.replace('| No evaluado |', '').trim();
        }

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
                 return { text: parts.join('@').trim(), percent: `${percent}%`, override, isNonEvaluable };
            }
        }
        return { text: currentDesc.trim(), percent: '—', override, isNonEvaluable };
    };

    const handleDelete = async (evaluationId: number) => {
        if (window.confirm('¿Estás seguro de eliminar esta evaluación?')) {
            try {
                if (user?.schoolId) {
                    await apiService.deleteEvaluation(evaluationId, user.schoolId);
                    setEvaluations(prev => prev.filter(e => e.evaluationID !== evaluationId));
                }
            } catch (err) { setError('Error al eliminar la evaluación.'); }
        }
    };
    
    const confirmGrantOverride = async () => {
        if (!evaluationToUnlock || !user || user.roleId !== 6) return;
        const { text, percent, isNonEvaluable } = getEvaluationParts(evaluationToUnlock.description);
        const percentValue = percent.replace('%', '');
        let cleanDescription = text === '—' ? '' : text;
        if (isNonEvaluable) cleanDescription += ' | No evaluado |';
        if (percentValue !== '—' && percentValue !== '') cleanDescription = `${cleanDescription}@${percentValue}`;
        const newDescription = `${cleanDescription} @@OVERRIDE:${user.userId}:${Date.now()}`;
        try {
            await apiService.updateEvaluation(evaluationToUnlock.evaluationID, { ...evaluationToUnlock, description: newDescription });
            fetchData();
        } catch (err: any) { setError(err.message || 'Error al desbloquear.'); } finally { setEvaluationToUnlock(null); }
    };

    const confirmLockEvaluation = async () => {
        if (!evaluationToLock || !user || user.roleId !== 6) return;
        const newDescription = evaluationToLock.description?.replace(/@@OVERRIDE:.*$/, '').trim() ?? '';
        try {
            await apiService.updateEvaluation(evaluationToLock.evaluationID, { ...evaluationToLock, description: newDescription });
            fetchData();
        } catch (err: any) { setError(err.message || 'Error al bloquear.'); } finally { setEvaluationToLock(null); }
    };

    const handleSendUnlockRequest = async () => {
        if (!user || !user.schoolId || !requestingUnlockFor) return;
        setIsSendingRequest(true);
        try {
            const title = `[UNLOCK_REQUEST][EVAL_ID:${requestingUnlockFor.evaluationID}] Solicitud de Edición`;
            let content = `El profesor ${user.userName} solicita permiso para editar '${requestingUnlockFor.title}'.`;
            if (unlockComment.trim()) content += `\n\nMotivo: ${unlockComment.trim()}`;
            await apiService.sendToRole(user.schoolId, 6, { title, content });
            alert("Solicitud enviada.");
        } finally { setIsSendingRequest(false); setRequestingUnlockFor(null); setUnlockComment(''); }
    };

    const handleAssignGrades = (evaluation: Evaluation) => {
        const isDescriptiveSchool = user?.schoolId && [5, 6, 7, 8, 9].includes(user.schoolId);
        const courseName = evaluation.course?.name?.toLowerCase() || '';
        const isDescriptiveCourse = courseName.includes('nivel') || courseName.includes('sala');
        if (isDescriptiveSchool && isDescriptiveCourse) navigate(`/evaluations/assign-descriptive/${evaluation.evaluationID}`);
        else navigate(`/evaluations/assign/${evaluation.evaluationID}`);
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-background rounded-lg border">
                <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setIdFilter(null); }} className="p-2 border rounded" placeholder="Buscar título..."/>
                <select value={filters.lapsoId} onChange={e => setFilters(f => ({...f, lapsoId: e.target.value}))} className="p-2 border rounded">
                    <option value="">Todos los Lapsos</option>
                    {lapsos.map(l => <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>)}
                </select>
                <select value={filters.courseId} onChange={e => setFilters(f => ({...f, courseId: e.target.value}))} className="p-2 border rounded">
                    <option value="">Todos los Cursos</option>
                    {courses.map(c => <option key={c.courseID} value={c.courseID}>{c.name}</option>)}
                </select>
                <div className="relative" ref={classroomDropdownRef}>
                    <button onClick={() => setIsClassroomDropdownOpen(!isClassroomDropdownOpen)} className="w-full p-2 border rounded bg-surface text-left truncate">
                        {selectedClassroomIds.size === 0 ? 'Todos los Salones' : `${selectedClassroomIds.size} salones`}
                    </button>
                    {isClassroomDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-surface shadow-lg border rounded max-h-60 overflow-auto">
                            {professorClassrooms.map(c => (
                                <label key={c.classroomID} className="flex items-center px-3 py-2 text-sm hover:bg-background cursor-pointer">
                                    <input type="checkbox" checked={selectedClassroomIds.has(c.classroomID)} onChange={() => { const n = new Set(selectedClassroomIds); if(n.has(c.classroomID)) n.delete(c.classroomID); else n.add(c.classroomID); setSelectedClassroomIds(n); }} className="mr-2"/>
                                    {c.name}
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {loading ? <p>Cargando...</p> : (
                <div className="space-y-8">
                {Object.entries(groupedEvaluations).map(([classroomName, evalsInGroup]) => (
                    <div key={classroomName} className="bg-surface shadow-md rounded-lg overflow-hidden border border-border">
                        <h3 className="px-6 py-3 bg-header text-lg font-semibold text-text-on-primary">{classroomName}</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-background">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Título</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Descripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">%</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {evalsInGroup.map((e) => {
                                        const { text, percent, isNonEvaluable } = getEvaluationParts(e.description);
                                        const editable = isEvaluationEditable(e, user);
                                        const isSuperAdmin = user?.roleId === 6;
                                        const lockedForTeacher = isLockedForTeacher(e);
                                        return (
                                        <tr key={e.evaluationID} className={`hover:bg-background ${!editable && !isSuperAdmin ? 'bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    {isSuperAdmin && lockedForTeacher && <BlockIcon className="text-danger mr-2 flex-shrink-0 w-4 h-4" title="Bloqueada" />}
                                                    <span className="font-medium">{e.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    {isNonEvaluable && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                                                            No evaluable
                                                        </span>
                                                    )}
                                                    <span className="text-sm text-text-secondary">{text}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">{percent}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(e.date).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex items-center space-x-2">
                                                    {!isNonEvaluable && (
                                                        <button onClick={() => handleAssignGrades(e)} className="text-success hover:text-success-text p-1" title="Asignar Notas">
                                                            <ClipboardCheckIcon />
                                                        </button>
                                                    )}
                                                    {editable ? (
                                                        <button onClick={() => navigate(`/evaluations/edit/${e.evaluationID}`)} className="p-1 text-warning hover:text-warning-dark" title="Editar">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                                        </button>
                                                    ) : !isSuperAdmin && (
                                                        <button onClick={() => setRequestingUnlockFor(e)} className="text-[10px] uppercase font-bold py-1 px-2 rounded bg-info text-white hover:bg-info-dark">Solicitar</button>
                                                    )}
                                                    {isSuperAdmin && e.description?.includes('@@OVERRIDE:') && <button onClick={() => setEvaluationToLock(e)} className="text-danger p-1"><BlockIcon /></button>}
                                                    {isSuperAdmin && lockedForTeacher && <button onClick={() => setEvaluationToUnlock(e)} className="text-accent p-1"><UnlockIcon /></button>}
                                                    <button onClick={() => handleDelete(e.evaluationID)} disabled={!editable} className={`p-1 ${!editable ? 'text-gray-300' : 'text-danger hover:text-danger-text'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
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
            
            {evaluationToUnlock && <Modal isOpen={true} onClose={() => setEvaluationToUnlock(null)} title="Desbloquear"><p>¿Desbloquear "{evaluationToUnlock.title}"?</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setEvaluationToUnlock(null)} className="px-4 py-2">No</button><button onClick={confirmGrantOverride} className="bg-accent text-white px-4 py-2 rounded">Sí</button></div></Modal>}
            {evaluationToLock && <Modal isOpen={true} onClose={() => setEvaluationToLock(null)} title="Bloquear"><p>¿Bloquear "{evaluationToLock.title}"?</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => setEvaluationToLock(null)} className="px-4 py-2">No</button><button onClick={confirmLockEvaluation} className="bg-danger text-white px-4 py-2 rounded">Sí</button></div></Modal>}
        </div>
    );
};

export default EvaluationListPage;
