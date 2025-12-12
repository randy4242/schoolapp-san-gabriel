
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { Evaluation, Question } from '../../types';
import { PlusIcon } from '../../components/icons';
import QuestionFormModal from './QuestionFormModal';
import { useAuth } from '../../hooks/useAuth';

const ExamBuilderPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);

    const fetchAll = useCallback(async () => {
        if (!evaluationId) return;
        setLoading(true);
        setError('');
        try {
            const questionsData = await apiService.getEvaluationQuestions(Number(evaluationId));
            setQuestions(questionsData.sort((a, b) => a.orderIndex - b.orderIndex));
        } catch (err: any) {
            setError(err.message || 'Error al cargar los datos del examen.');
        } finally {
            setLoading(false);
        }
    }, [evaluationId]);
    
    const { user } = useAuth(); 

    useEffect(() => {
        if (user?.schoolId && evaluationId) {
             apiService.getEvaluationById(Number(evaluationId), user.schoolId)
                .then(setEvaluation)
                .catch(console.error);
        }
        fetchAll();
    }, [fetchAll, user, evaluationId]);

    const openCreateModal = () => {
        setQuestionToEdit(null);
        setIsModalOpen(true);
    };

    const openEditModal = (question: Question) => {
        setQuestionToEdit(question);
        setIsModalOpen(true);
    };
    
    const handleDeleteQuestion = async (questionId: number) => {
        if (evaluationId && window.confirm('¿Estás seguro de eliminar esta pregunta y todas sus opciones?')) {
            try {
                await apiService.deleteEvaluationQuestion(Number(evaluationId), questionId);
                fetchAll();
            } catch (err: any) {
                setError(err.message);
            }
        }
    };

    if (loading) return <p>Cargando constructor de examen...</p>;

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-text-primary mb-2">Constructor de Examen</h1>
            <h2 className="text-xl text-secondary mb-6">{evaluation?.title}</h2>
            
            {error && <div className="bg-danger-light text-danger p-3 rounded mb-4">{error}</div>}

            <div className="flex justify-between items-center mb-4">
                <Link to="/evaluations" className="text-info hover:underline">&larr; Volver a Evaluaciones</Link>
                <button 
                    onClick={openCreateModal}
                    className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 flex items-center"
                >
                    <PlusIcon className="mr-2" /> Crear Pregunta
                </button>
            </div>

            <div className="space-y-4">
                {questions.map(q => (
                    <div key={q.questionID} className="bg-surface p-4 rounded-lg shadow-md border">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm text-text-secondary">Puntos: {q.points} | Orden: {q.orderIndex} | Tipo: {q.questionType === 1 ? 'Abierta' : 'Selección Múltiple'}</p>
                                <p className="font-semibold mt-1">{q.questionText}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => openEditModal(q)} className="text-warning hover:text-warning-dark text-sm">Editar</button>
                                <button onClick={() => handleDeleteQuestion(q.questionID)} className="text-danger hover:text-danger-text text-sm">Eliminar</button>
                            </div>
                        </div>
                    </div>
                ))}
                {questions.length === 0 && <p className="text-center text-secondary py-8">Este examen aún no tiene preguntas. ¡Comienza a crearlas!</p>}
            </div>

            {isModalOpen && evaluationId && (
                <QuestionFormModal
                    evaluationId={Number(evaluationId)}
                    questionToEdit={questionToEdit}
                    onClose={() => setIsModalOpen(false)}
                    onSave={() => { setIsModalOpen(false); fetchAll(); }}
                />
            )}
        </div>
    );
};

export default ExamBuilderPage;