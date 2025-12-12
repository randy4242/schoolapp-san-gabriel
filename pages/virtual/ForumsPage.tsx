
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Evaluation, Course } from '../../types';
import { ChatAltIcon } from '../../components/icons';
import EvaluationQnAModal from '../../components/evaluations/EvaluationQnAModal';

const ForumsPage: React.FC = () => {
    const { user, hasPermission } = useAuth();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]); // For name mapping
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // 1. Fetch Evaluations
                const evalsData = await apiService.getEvaluations(user.schoolId, user.userId);
                setEvaluations(evalsData);

                // 2. Fetch Courses for mapping names (logic from MyCoursesPage/MyEvaluationsPage)
                const isStudent = hasPermission([1, 3, 11]);
                const isTeacher = hasPermission([2, 8, 9, 10]);
                const isAdmin = hasPermission([6, 7]);
                
                let coursesList: Course[] = [];

                if (isStudent) {
                     const enrollments = await apiService.getEnrollmentsForUser(user.userId, user.schoolId);
                     const coursePromises = enrollments.map(e => apiService.getCourseById(e.courseID, user.schoolId));
                     coursesList = await Promise.all(coursePromises);
                } else if (isTeacher) {
                    coursesList = await apiService.getTaughtCourses(user.userId, user.schoolId);
                } else if (isAdmin) {
                     coursesList = await apiService.getCourses(user.schoolId);
                }
                setCourses(coursesList);
            } catch (err) {
                console.error(err);
                setError('No se pudieron cargar los datos.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, hasPermission]);

    const courseMap = useMemo(() => {
        return new Map(courses.map(c => [c.courseID, c.name]));
    }, [courses]);

    const getCleanDescription = (desc: string | undefined) => {
        if (!desc) return 'Espacio de discusión para la evaluación.';
        return desc.replace(/@@OVERRIDE:.*$/, '').split('@')[0].trim() || 'Espacio de discusión.';
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary mb-6">Foros de Evaluación</h1>
            <p className="text-text-secondary mb-6">Participa en las discusiones y aclara dudas sobre tus evaluaciones.</p>

            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded mb-4">{error}</p>}
            
            {!loading && !error && (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {evaluations.map(evalItem => {
                        const courseName = evalItem.course?.name || courseMap.get(evalItem.courseID) || 'Curso';
                        return (
                            <div key={evalItem.evaluationID} className="bg-surface p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer border border-transparent hover:border-primary/20 group">
                                <div className="flex items-center mb-4">
                                    <div className="bg-info-light text-info-dark p-3 rounded-full mr-4 group-hover:bg-info group-hover:text-white transition-colors">
                                        <ChatAltIcon className="w-6 h-6" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <h3 className="text-lg font-semibold text-primary group-hover:text-info-dark transition-colors truncate" title={evalItem.title}>{evalItem.title}</h3>
                                        <p className="text-xs text-text-secondary truncate" title={courseName}>{courseName}</p>
                                    </div>
                                </div>
                                <p className="text-text-secondary text-sm mb-4 line-clamp-2 min-h-[2.5em]">
                                    {getCleanDescription(evalItem.description)}
                                </p>
                                <div className="flex justify-between items-center mt-auto pt-2 border-t border-border-dashed">
                                    <span className="text-xs text-text-tertiary">{new Date(evalItem.date).toLocaleDateString()}</span>
                                    <button 
                                        onClick={() => setSelectedEvaluation(evalItem)}
                                        className="text-primary font-medium hover:underline text-sm flex items-center"
                                    >
                                        Entrar al Foro 
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {evaluations.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-surface rounded-lg border border-dashed border-border">
                            <ChatAltIcon className="w-12 h-12 mx-auto text-text-tertiary mb-3" />
                            <p className="text-text-secondary">No tienes evaluaciones asignadas para participar en foros.</p>
                        </div>
                    )}
                </div>
            )}

            {selectedEvaluation && (
                <EvaluationQnAModal
                    evaluationId={selectedEvaluation.evaluationID}
                    evaluationTitle={selectedEvaluation.title}
                    onClose={() => setSelectedEvaluation(null)}
                />
            )}
        </div>
    );
};

export default ForumsPage;