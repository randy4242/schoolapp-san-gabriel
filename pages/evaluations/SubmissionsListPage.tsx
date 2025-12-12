
import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, Course, Lapso } from '../../types';
import { EyeIcon } from '../../components/icons';
import VirtualExamResultsModal from '../../components/evaluations/VirtualExamResultsModal';

const SubmissionsListPage: React.FC = () => {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({ lapsoId: '', courseId: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [viewResultsEvaluation, setViewResultsEvaluation] = useState<Evaluation | null>(null);

    const { user } = useAuth();

    const fetchData = async () => {
        if (user?.schoolId && user?.userId) {
            try {
                setLoading(true);
                setError('');
                const [evalData, taughtCoursesData, lapsoData] = await Promise.all([
                    apiService.getEvaluations(user.schoolId, user.userId, filters.lapsoId ? Number(filters.lapsoId) : undefined, filters.courseId ? Number(filters.courseId) : undefined),
                    apiService.getTaughtCourses(user.userId, user.schoolId),
                    apiService.getLapsos(user.schoolId),
                ]);
                
                // Filter only virtual evaluations available for submission view
                const virtualEvals = evalData.filter(e => e.isVirtual);
                setEvaluations(virtualEvals);
                setCourses(taughtCoursesData);
                setLapsos(lapsoData);

            } catch (err: any) {
                setError('No se pudo cargar la lista de entregas.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user, filters.lapsoId, filters.courseId]);

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter(e => {
            const searchMatch = !searchTerm || e.title.toLowerCase().includes(searchTerm.toLowerCase());
            return searchMatch;
        });
    }, [evaluations, searchTerm]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-text-primary mb-6">Entregas de Evaluaciones Virtuales</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-background rounded-lg border">
                <div>
                    <label htmlFor="searchTerm" className="block text-sm font-medium text-text-primary">Buscar</label>
                    <input 
                        id="searchTerm" 
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md"
                        placeholder="Nombre de la evaluación..."
                    />
                </div>
                 <div>
                    <label htmlFor="lapsoFilter" className="block text-sm font-medium text-text-primary">Filtrar por Lapso</label>
                    <select id="lapsoFilter" value={filters.lapsoId} onChange={e => setFilters(f => ({...f, lapsoId: e.target.value}))} className="mt-1 block w-full px-3 py-2 border-border focus:outline-none focus:ring-accent focus:border-accent sm:text-sm rounded-md">
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
            </div>

            {loading && <p>Cargando entregas...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Título</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Tipo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Curso</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase">Lapso</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-secondary uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {filteredEvaluations.map((e) => {
                                const courseName = courses.find(c => c.courseID === e.courseID)?.name || "N/A";
                                let typeLabel = "Desconocido";
                                if (e.virtualType === 1) typeLabel = "Contenido";
                                if (e.virtualType === 2) typeLabel = "Selección Simple";
                                if (e.virtualType === 3) typeLabel = "Tarea";

                                return (
                                <tr key={e.evaluationID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{e.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{typeLabel}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{courseName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">{e.lapso?.nombre || "N/A"}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button 
                                            onClick={() => setViewResultsEvaluation(e)} 
                                            className="bg-info text-text-on-primary px-3 py-1 rounded hover:bg-info-dark transition-colors flex items-center justify-center mx-auto gap-2" 
                                            title="Ver Respuestas de Alumnos"
                                        >
                                            <EyeIcon className="w-4 h-4" /> Ver Respuestas
                                        </button>
                                    </td>
                                </tr>
                            )})}
                            {filteredEvaluations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                                        No se encontraron evaluaciones virtuales.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {viewResultsEvaluation && (
                <VirtualExamResultsModal
                    evaluation={viewResultsEvaluation}
                    onClose={() => setViewResultsEvaluation(null)}
                />
            )}
        </div>
    );
};

export default SubmissionsListPage;
