
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { Evaluation, Course } from '../../types';
import { ClipboardCheckIcon, ChevronDownIcon, ChatAltIcon, EyeIcon } from '../../components/icons';
import { Link } from 'react-router-dom';
import EvaluationQnAModal from '../../components/evaluations/EvaluationQnAModal';
import EvaluationDetailsModal from '../../components/evaluations/EvaluationDetailsModal';

interface GroupedEvaluations {
    [courseName: string]: Evaluation[];
}

const MyEvaluationsPage: React.FC = () => {
    const { user } = useAuth();
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openCourse, setOpenCourse] = useState<string | null>(null);
    const [qnaEvaluation, setQnaEvaluation] = useState<Evaluation | null>(null);
    const [detailsEvaluation, setDetailsEvaluation] = useState<Evaluation | null>(null);

    useEffect(() => {
        const fetchEvaluations = async () => {
            if (!user) return;
            setLoading(true);
            setError('');
            try {
                // Fetch all evaluations for the user and all courses for the school to map names
                const [evalsData, coursesData] = await Promise.all([
                    apiService.getEvaluations(user.schoolId, user.userId),
                    apiService.getCourses(user.schoolId)
                ]);
                setEvaluations(evalsData);
                setCourses(coursesData);
            } catch (err) {
                setError('No se pudieron cargar las evaluaciones.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvaluations();
    }, [user]);

    const groupedEvaluations: GroupedEvaluations = useMemo(() => {
        const courseMap = new Map<number, string>(courses.map(c => [c.courseID, c.name]));
        return evaluations.reduce<GroupedEvaluations>((acc, evaluation) => {
            const courseName = courseMap.get(evaluation.courseID) || 'Curso Desconocido';
            if (!acc[courseName]) {
                acc[courseName] = [];
            }
            acc[courseName].push(evaluation);
            return acc;
        }, {});
    }, [evaluations, courses]);

    const toggleCourse = (courseName: string) => {
        setOpenCourse(prev => (prev === courseName ? null : courseName));
    };

    if (loading) return <p>Cargando evaluaciones...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded">{error}</p>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-primary mb-6">Mis Evaluaciones</h1>
            {Object.keys(groupedEvaluations).length > 0 ? (
                <div className="space-y-4">
                    {Object.entries(groupedEvaluations).map(([courseName, evals]) => (
                        <div key={courseName} className="border border-border rounded-lg overflow-hidden">
                            <button
                                onClick={() => toggleCourse(courseName)}
                                className="w-full flex justify-between items-center p-4 bg-background hover:bg-border transition-colors"
                            >
                                <h3 className="text-lg font-semibold text-primary">{courseName}</h3>
                                <div className="flex items-center">
                                    <span className="bg-primary text-text-on-primary text-xs font-bold mr-2 px-2 py-1 rounded-full">{evals.length}</span>
                                    <ChevronDownIcon className={`transition-transform duration-200 ${openCourse === courseName ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            {openCourse === courseName && (
                                <div className="p-4 border-t border-border">
                                    <ul className="space-y-3">
                                        {evals.map(ev => (
                                            <li key={ev.evaluationID} className="bg-surface p-3 rounded-md shadow-sm border border-border-dark">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-semibold text-text-primary">{ev.title}</p>
                                                        <p className="text-sm text-text-secondary mt-1 line-clamp-2">{ev.description}</p>
                                                    </div>
                                                    <div className="text-right ml-4 flex-shrink-0 flex flex-col items-end gap-2">
                                                        <p className="text-sm text-text-secondary whitespace-nowrap">{new Date(ev.date).toLocaleDateString('es-ES')}</p>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => setDetailsEvaluation(ev)}
                                                                className="text-secondary hover:text-primary p-1 rounded hover:bg-secondary/10 transition-colors"
                                                                title="Ver Detalle"
                                                            >
                                                                <EyeIcon />
                                                            </button>
                                                            <button 
                                                                onClick={() => setQnaEvaluation(ev)} 
                                                                className="text-info hover:text-info-dark p-1 rounded hover:bg-info-light/20 transition-colors" 
                                                                title="Preguntas y Respuestas"
                                                            >
                                                                <ChatAltIcon />
                                                            </button>
                                                            {ev.isVirtual && (
                                                                <Link to={`/virtual/exams/${ev.evaluationID}/take`} className="inline-block bg-primary text-text-on-primary text-sm py-1 px-3 rounded hover:bg-opacity-80">
                                                                    Presentar
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                    <ClipboardCheckIcon />
                    <p className="text-text-secondary mt-2">No tienes evaluaciones asignadas.</p>
                </div>
            )}
            
            {qnaEvaluation && (
                <EvaluationQnAModal
                    evaluationId={qnaEvaluation.evaluationID}
                    evaluationTitle={qnaEvaluation.title}
                    onClose={() => setQnaEvaluation(null)}
                />
            )}

            {detailsEvaluation && (
                <EvaluationDetailsModal
                    evaluation={detailsEvaluation}
                    onClose={() => setDetailsEvaluation(null)}
                />
            )}
        </div>
    );
};

export default MyEvaluationsPage;