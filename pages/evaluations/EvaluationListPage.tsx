import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, Course, Lapso } from '../../types';
import { ClipboardCheckIcon } from '../../components/icons';

const EvaluationListPage: React.FC = () => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ lapsoId: '', courseId: '' });

    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();

    const canManage = useMemo(() => hasPermission([6, 2, 9, 10]), [hasPermission]);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.schoolId && user?.userId) {
                try {
                    setLoading(true);
                    const [evalData, courseData, lapsoData] = await Promise.all([
                        apiService.getEvaluations(user.schoolId, user.userId, filters.lapsoId ? Number(filters.lapsoId) : undefined, filters.courseId ? Number(filters.courseId) : undefined),
                        apiService.getCourses(user.schoolId),
                        apiService.getLapsos(user.schoolId)
                    ]);
                    setEvaluations(evalData);
                    setCourses(courseData);
                    setLapsos(lapsoData);
                    setError('');
                } catch (err) {
                    setError('No se pudo cargar la información de evaluaciones.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user, filters]);
    
    const getEvaluationParts = (description: string | null | undefined): { text: string, percent: string } => {
        if (!description) return { text: '—', percent: '—' };
        const parts = description.split('@');
        if (parts.length > 1) {
            const percent = parts.pop();
            return { text: parts.join('@'), percent: `${percent}%` };
        }
        return { text: description, percent: '—' };
    };

    const handleDelete = async (evaluationId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta evaluación?')) {
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
                    <label htmlFor="lapsoFilter" className="block text-sm font-medium text-text-primary">Filtrar por Lapso</label>
                    <select id="lapsoFilter" value={filters.lapsoId} onChange={e => setFilters(f => ({...f, lapsoId: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-login-inputBg text-text-on-primary border-login-inputBorder focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
                        <option value="">Todos los Lapsos</option>
                        {lapsos.map(lapso => <option key={lapso.lapsoID} value={lapso.lapsoID}>{lapso.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="courseFilter" className="block text-sm font-medium text-text-primary">Filtrar por Curso</label>
                    <select id="courseFilter" value={filters.courseId} onChange={e => setFilters(f => ({...f, courseId: e.target.value}))} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-login-inputBg text-text-on-primary border-login-inputBorder focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
                        <option value="">Todos los Cursos</option>
                        {courses.map(course => <option key={course.courseID} value={course.courseID}>{course.name}</option>)}
                    </select>
                </div>
            </div>

            {loading && <p>Cargando evaluaciones...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">% Eval.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Curso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Lapso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {evaluations.map((e) => {
                                const { text, percent } = getEvaluationParts(e.description);
                                const courseName = courses.find(c => c.courseID === e.courseID)?.name || "N/A";
                                return (
                                <tr key={e.evaluationID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{e.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{text}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{percent}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{e.lapso?.nombre || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => navigate(`/evaluations/assign/${e.evaluationID}`)} className="text-success hover:text-success-text p-1 rounded-md hover:bg-success-light" title="Asignar Notas">
                                                <ClipboardCheckIcon />
                                            </button>
                                            <button onClick={() => navigate(`/evaluations/edit/${e.evaluationID}`)} className="text-warning hover:text-warning-dark p-1 rounded-md hover:bg-warning/10" title="Editar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                                            </button>
                                            <button onClick={() => handleDelete(e.evaluationID)} className="text-danger hover:text-danger-text p-1 rounded-md hover:bg-danger-light" title="Eliminar">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            )}
             {!loading && evaluations.length === 0 && (
                <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                    <p className="text-secondary">No se encontraron evaluaciones con los filtros actuales.</p>
                </div>
             )}
        </div>
    );
};

export default EvaluationListPage;