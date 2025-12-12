
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { TakeExamEvaluation, AnswerPayload } from '../../types';
import Modal from '../../components/Modal';
import { ClipboardCheckIcon } from '../../components/icons';

const TakeExamPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const { user } = useAuth();
    
    const [exam, setExam] = useState<TakeExamEvaluation | null>(null);
    const [answers, setAnswers] = useState<Record<number, AnswerPayload>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isAlreadyTaken, setIsAlreadyTaken] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    useEffect(() => {
        const fetchExamAndStatus = async () => {
            if (user && evaluationId && user.schoolId) {
                setLoading(true);
                try {
                    const evalIdNum = Number(evaluationId);

                    // 1. Get the Exam content
                    const examPromise = apiService.getVirtualExam(evalIdNum, user.schoolId);
                    
                    // 2. Get Evaluation Details to find the Lapso ID
                    const detailsPromise = apiService.getEvaluationById(evalIdNum, user.schoolId);

                    const [examData, evalDetails] = await Promise.all([examPromise, detailsPromise]);
                    setExam(examData);

                    // 3. Check if grade exists for this student in this Lapso
                    if (evalDetails.lapso) {
                        try {
                            const gradesData = await apiService.getStudentGradesByLapso(
                                user.userId, 
                                user.userName, 
                                evalDetails.lapso.lapsoID, 
                                user.schoolId
                            );
                            
                            // Flatten groups to search for the evaluation title
                            const allGrades = gradesData.groups.flatMap(g => g.items);
                            const hasGrade = allGrades.some(g => g.evaluacion === evalDetails.title);
                            
                            if (hasGrade) {
                                setIsAlreadyTaken(true);
                            }
                        } catch (gradeError) {
                            console.error("Error checking grades", gradeError);
                            // Do not block if grade check fails, let backend handle submission block if it exists
                        }
                    }

                } catch (err: any) {
                    setError(err.message || 'Error al cargar el examen. Es posible que ya lo hayas presentado o que no esté disponible.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchExamAndStatus();
    }, [evaluationId, user]);

    const handleAnswerChange = (questionId: number, answerText: string | null, selectedOptionId: number | null) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                questionID: questionId,
                answerText: answerText,
                selectedOptionID: selectedOptionId
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !evaluationId || Object.keys(answers).length !== exam?.questions.length) {
            setError("Debes responder todas las preguntas antes de enviar.");
            return;
        }
        setShowConfirmModal(true);
    };

    const performSubmission = async () => {
        if (!user || !evaluationId) return;
        
        setShowConfirmModal(false);
        setSubmitting(true);
        setError('');
        try {
            await apiService.submitVirtualExam(Number(evaluationId), user.schoolId, { answers: Object.values(answers) });
            setIsSubmitted(true);
        } catch (err: any) {
            setError(err.message || "Error al enviar el examen. Inténtalo de nuevo.");
        } finally {
            setSubmitting(false);
        }
    };
    
    if (loading) return <div className="text-center p-8 text-text-secondary">Cargando examen...</div>;

    // View: Already Submitted (Frontend Check)
    if (isAlreadyTaken) {
        return (
            <div className="max-w-2xl mx-auto mt-10">
                <div className="bg-surface p-8 rounded-lg shadow-xl text-center border border-border">
                    <div className="flex justify-center mb-4">
                        <div className="bg-success-light p-4 rounded-full">
                            <ClipboardCheckIcon className="w-12 h-12 text-success-text" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-primary mb-2">Examen Ya Presentado</h1>
                    <p className="text-text-secondary mb-6">
                        Ya existe un registro de calificación o entrega para la evaluación <strong>"{exam?.title}"</strong>. No es posible presentarla nuevamente.
                    </p>
                    <Link to="/virtual/evaluations" className="inline-block bg-primary text-text-on-primary py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                        Volver a Mis Evaluaciones
                    </Link>
                </div>
            </div>
        );
    }

    // View: Just Submitted
    if (isSubmitted) {
        return (
            <div className="max-w-3xl mx-auto text-center bg-surface p-8 rounded-lg shadow-xl mt-10 border border-success">
                <div className="flex justify-center mb-4">
                    <svg className="w-16 h-16 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <h1 className="text-2xl font-bold text-success-text">¡Examen Enviado!</h1>
                <p className="mt-4 text-text-secondary">Tus respuestas han sido enviadas correctamente. Tu profesor las calificará pronto.</p>
                <Link to="/virtual/evaluations" className="mt-6 inline-block bg-primary text-text-on-primary py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                    Volver a Mis Evaluaciones
                </Link>
            </div>
        );
    }
    
    // View: Error
    if (error && !showConfirmModal) return (
        <div className="max-w-3xl mx-auto text-center bg-surface p-8 rounded-lg shadow-xl mt-10">
            <h1 className="text-2xl font-bold text-danger-text">Error</h1>
            <p className="mt-4 text-text-secondary">{error}</p>
            <Link to="/virtual/evaluations" className="mt-6 inline-block bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80">
                Volver a Mis Evaluaciones
            </Link>
        </div>
    );
    
    if (!exam) return <p className="text-center p-8">No se encontró el examen.</p>;

    // View: Taking Exam
    return (
        <div className="max-w-3xl mx-auto pb-12">
            <div className="bg-surface p-6 rounded-lg shadow-md mb-6 border-l-4 border-primary">
                <h1 className="text-3xl font-bold text-primary">{exam.title}</h1>
                <p className="mt-2 text-text-secondary">{exam.description}</p>
                <div className="mt-4 flex gap-4 text-sm text-text-tertiary">
                    <span>• {exam.questions.length} Preguntas</span>
                    <span>• Evaluación Virtual</span>
                </div>
            </div>
            
            {error && <div className="bg-danger-light text-danger p-4 rounded mb-4 border border-danger">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
                {exam.questions.map((q, index) => (
                    <div key={q.questionID} className="bg-surface p-6 rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-semibold text-lg text-text-primary">
                                <span className="text-secondary mr-2">{index + 1}.</span>
                                {q.questionText}
                            </h3>
                            <span className="text-xs font-semibold bg-gray-100 text-text-secondary px-2 py-1 rounded">
                                {q.points} pts
                            </span>
                        </div>
                        
                        {q.questionType === 1 && ( // Open content
                             <textarea
                                 rows={5}
                                 className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-accent/50 focus:border-accent bg-background"
                                 placeholder="Escribe tu respuesta aquí..."
                                 onChange={(e) => handleAnswerChange(q.questionID, e.target.value, null)}
                                 required
                             />
                        )}

                        {q.questionType === 2 && ( // Multiple choice
                            <div className="space-y-3 pl-2">
                                {q.options?.map(opt => (
                                    <label key={opt.optionID} className="flex items-center p-3 rounded-lg border border-transparent hover:bg-background cursor-pointer transition-colors group">
                                        <div className="flex items-center h-5">
                                            <input
                                                type="radio"
                                                name={`question-${q.questionID}`}
                                                value={opt.optionID}
                                                className="h-5 w-5 text-primary focus:ring-accent border-gray-300"
                                                onChange={() => handleAnswerChange(q.questionID, null, opt.optionID)}
                                                required
                                            />
                                        </div>
                                        <span className="ml-3 text-sm text-text-primary group-hover:text-primary">{opt.optionText}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                        
                        {q.questionType === 3 && ( // Task
                            <div className="space-y-2">
                                <p className="text-sm text-info-dark bg-info-light/20 p-2 rounded mb-2">
                                    Desarrolla el contenido de la tarea a continuación.
                                </p>
                                <textarea
                                    rows={10}
                                    className="w-full p-3 border border-border rounded-md focus:ring-2 focus:ring-accent/50 focus:border-accent bg-background"
                                    placeholder="Escribe el desarrollo de tu tarea..."
                                    onChange={(e) => handleAnswerChange(q.questionID, e.target.value, null)}
                                    required
                                />
                            </div>
                        )}
                    </div>
                ))}
                
                <div className="flex justify-end pt-6">
                    <button type="submit" disabled={submitting} className="bg-primary text-text-on-primary font-bold py-3 px-8 rounded-lg shadow-lg hover:bg-opacity-90 disabled:bg-secondary transition-transform transform hover:-translate-y-1">
                        {submitting ? 'Enviando...' : 'Enviar Examen'}
                    </button>
                </div>
            </form>

            {showConfirmModal && (
                <Modal isOpen={true} onClose={() => setShowConfirmModal(false)} title="Confirmar Envío">
                    <div className="space-y-4">
                        <p className="text-text-primary text-lg">¿Estás seguro de que quieres enviar tus respuestas?</p>
                        <p className="text-sm text-text-secondary bg-warning/10 p-2 rounded border-l-4 border-warning">
                            Una vez enviado, no podrás modificar tus respuestas ni volver a presentar este examen.
                        </p>
                        <div className="flex justify-end gap-3 pt-4">
                            <button 
                                onClick={() => setShowConfirmModal(false)} 
                                className="px-4 py-2 rounded bg-background text-text-primary hover:bg-border transition-colors border border-border"
                            >
                                Revisar respuestas
                            </button>
                            <button 
                                onClick={performSubmission} 
                                className="px-6 py-2 rounded bg-primary text-text-on-primary hover:bg-opacity-90 transition-colors font-bold shadow-md"
                            >
                                Sí, Enviar Todo
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TakeExamPage;