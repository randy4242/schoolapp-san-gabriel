
import React, { useEffect, useState, useCallback } from 'react';
import { EvaluationQnA } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../Modal';
import { ChatAltIcon, SpinnerIcon } from '../icons';

interface EvaluationQnAModalProps {
    evaluationId: number;
    evaluationTitle: string;
    onClose: () => void;
}

const EvaluationQnAModal: React.FC<EvaluationQnAModalProps> = ({ evaluationId, evaluationTitle, onClose }) => {
    const { user } = useAuth();
    const [questions, setQuestions] = useState<EvaluationQnA[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Student state
    const [newQuestionText, setNewQuestionText] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    // Teacher state
    const [answeringId, setAnsweringId] = useState<number | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [isAnswering, setIsAnswering] = useState(false);

    const isStudent = user?.roleId === 1;
    const isTeacherOrAdmin = !isStudent;

    const fetchQuestions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiService.getEvaluationQnA(evaluationId);
            // Sort: Unanswered first, then by date descending
            setQuestions(data.sort((a, b) => {
                if (!a.answerText && b.answerText) return -1;
                if (a.answerText && !b.answerText) return 1;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }));
        } catch (err) {
            setError('Error al cargar las preguntas.');
        } finally {
            setLoading(false);
        }
    }, [evaluationId]);

    useEffect(() => {
        fetchQuestions();
    }, [fetchQuestions]);

    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQuestionText.trim()) return;
        setIsAsking(true);
        try {
            await apiService.createEvaluationQnA(evaluationId, newQuestionText);
            setNewQuestionText('');
            fetchQuestions();
        } catch (err: any) {
            alert('Error al enviar la pregunta.');
        } finally {
            setIsAsking(false);
        }
    };

    const handleAnswerSubmit = async (qnaId: number) => {
        if (!answerText.trim()) return;
        setIsAnswering(true);
        try {
            await apiService.answerEvaluationQuestion(evaluationId, qnaId, answerText);
            setAnsweringId(null);
            setAnswerText('');
            fetchQuestions();
        } catch (err: any) {
            alert('Error al enviar la respuesta.');
        } finally {
            setIsAnswering(false);
        }
    };

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute:'2-digit' });

    return (
        <Modal isOpen={true} onClose={onClose} title={`Foro de Dudas: ${evaluationTitle}`}>
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                {loading && <div className="flex justify-center py-4"><SpinnerIcon className="text-primary w-8 h-8"/></div>}
                {error && <p className="text-danger bg-danger-light p-2 rounded">{error}</p>}
                
                {!loading && questions.length === 0 && (
                    <div className="text-center py-8 text-text-secondary bg-background rounded-lg border border-border-dashed">
                        <ChatAltIcon className="w-12 h-12 mx-auto mb-2 text-text-tertiary"/>
                        <p>Aún no hay preguntas para esta evaluación.</p>
                        {isStudent && <p>¡Sé el primero en preguntar!</p>}
                    </div>
                )}

                <div className="space-y-4">
                    {questions.map(q => (
                        <div key={q.qnaID} className="bg-surface border border-border rounded-lg shadow-sm overflow-hidden">
                            {/* Question Header */}
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-sm text-primary">Estudiante #{q.askedByUserId}</span>
                                        <span className="text-xs text-text-tertiary">{formatDate(q.createdAt)}</span>
                                    </div>
                                    <div>
                                        {q.answerText ? (
                                            <span className="bg-success-light text-success-text text-xs font-bold px-2 py-1 rounded-full">Respondido</span>
                                        ) : (
                                            <span className="bg-warning/20 text-warning-dark text-xs font-bold px-2 py-1 rounded-full">Pendiente</span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-text-primary text-base font-medium">{q.questionText}</p>
                            </div>

                            {/* Answer Section */}
                            {q.answerText && (
                                <div className="bg-background p-4 border-t border-border relative">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-success"></div>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-sm text-success-text">Respuesta del Profesor</span>
                                        {q.answeredAt && <span className="text-xs text-text-tertiary">{formatDate(q.answeredAt)}</span>}
                                    </div>
                                    <p className="text-text-secondary text-sm whitespace-pre-wrap">{q.answerText}</p>
                                </div>
                            )}

                            {/* Teacher Action Area */}
                            {!q.answerText && isTeacherOrAdmin && (
                                <div className="bg-background p-3 border-t border-border">
                                    {answeringId === q.qnaID ? (
                                        <div className="animate-fade-in">
                                            <textarea 
                                                className="w-full p-2 border border-border rounded-md text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                                                rows={3}
                                                placeholder="Escribe la respuesta..."
                                                value={answerText}
                                                onChange={e => setAnswerText(e.target.value)}
                                            ></textarea>
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={() => { setAnsweringId(null); setAnswerText(''); }} className="text-xs py-1 px-3 text-text-secondary hover:text-text-primary">Cancelar</button>
                                                <button 
                                                    onClick={() => handleAnswerSubmit(q.qnaID)} 
                                                    disabled={isAnswering || !answerText.trim()}
                                                    className="bg-primary text-text-on-primary text-xs font-bold py-1 px-3 rounded hover:bg-opacity-90 disabled:opacity-50"
                                                >
                                                    {isAnswering ? 'Enviando...' : 'Enviar Respuesta'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button onClick={() => setAnsweringId(q.qnaID)} className="text-sm text-info font-medium hover:underline flex items-center gap-1">
                                            <ChatAltIcon className="w-4 h-4"/> Responder
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Student Create Question Form */}
            {isStudent && (
                <div className="mt-6 pt-4 border-t border-border">
                    <h4 className="font-bold text-sm mb-2">Hacer una pregunta</h4>
                    <form onSubmit={handleCreateQuestion}>
                        <textarea
                            className="w-full p-3 border border-border rounded-md bg-background focus:bg-surface focus:ring-2 focus:ring-accent/50 transition-colors"
                            rows={3}
                            placeholder="¿Tienes alguna duda sobre esta evaluación? Escríbela aquí..."
                            value={newQuestionText}
                            onChange={e => setNewQuestionText(e.target.value)}
                            required
                        ></textarea>
                        <div className="flex justify-end mt-2">
                            <button 
                                type="submit" 
                                disabled={isAsking || !newQuestionText.trim()} 
                                className="bg-accent text-text-on-accent py-2 px-4 rounded font-semibold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
                            >
                                {isAsking ? 'Enviando...' : 'Enviar Pregunta'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default EvaluationQnAModal;