
import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../Modal';
import { StudentSubmission, Evaluation, ExamSubmissionDetail, QuestionAnswerDetail } from '../../types';
import { SpinnerIcon, LockClosedIcon, PencilAltIcon } from '../icons';

interface VirtualExamResultsModalProps {
    evaluation: Evaluation;
    onClose: () => void;
}

const VirtualExamResultsModal: React.FC<VirtualExamResultsModalProps> = ({ evaluation, onClose }) => {
    const { user } = useAuth();
    const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<StudentSubmission | null>(null);
    const [detailedSubmission, setDetailedSubmission] = useState<ExamSubmissionDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    
    // Grading state
    const [gradeValue, setGradeValue] = useState<string>('');
    const [gradeComment, setGradeComment] = useState<string>('');
    const [isSavingGrade, setIsSavingGrade] = useState(false);
    
    // Safety lock state: true if editing is allowed
    const [isEditingGrade, setIsEditingGrade] = useState(false);

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getVirtualExamSubmissions(evaluation.evaluationID, user.schoolId)
                .then((data: any[]) => {
                    // Normalización de datos
                    const normalizedSubmissions: StudentSubmission[] = data.map(item => {
                        const studentID =
                            item.studentID ??
                            item.StudentID ??
                            item.userID ??
                            item.UserID;

                    return {
                            submissionID: item.submissionID ?? item.SubmissionID,
                            studentID,
                            studentName: item.studentName ?? item.StudentName,
                            submittedAt: item.submittedAt ?? item.SubmittedAt,
                            grade: item.grade !== undefined ? item.grade : item.Grade,
                            answers: [] // Detalle se trae al hacer click
                        };
                });

                    setSubmissions(normalizedSubmissions);
                })
                .catch(err => {
                    console.error("Error loading submissions", err);
                    setError('Error al cargar la lista de estudiantes.');
                })
                .finally(() => setLoading(false));
        }
    }, [evaluation.evaluationID, user]);

    useEffect(() => {
        if (selectedStudent && user?.schoolId) {
            setGradeValue(selectedStudent.grade?.toString() || '');
            setGradeComment('');
            setLoadingDetail(true);
            setDetailedSubmission(null);
            
            // Check if grade already exists to lock the inputs
            const hasGrade = selectedStudent.grade !== null && selectedStudent.grade !== undefined;
            setIsEditingGrade(!hasGrade); // Lock if grade exists, unlock if new

            apiService.getExamSubmissionDetail(evaluation.evaluationID, selectedStudent.studentID, user.schoolId)
                .then(detail => {
                    setDetailedSubmission(detail);
                })
                .catch(err => {
                    console.error("Error fetching detail", err);
                })
                .finally(() => setLoadingDetail(false));
        }
    }, [selectedStudent, evaluation.evaluationID, user]);

    const handleAssignGrade = async () => {
        if (!selectedStudent || !user?.schoolId) return;
        setIsSavingGrade(true);
        try {
            await apiService.assignGrade({
                userID: selectedStudent.studentID,
                evaluationID: evaluation.evaluationID,
                courseID: evaluation.courseID,
                schoolID: user.schoolId,
                gradeValue: parseFloat(gradeValue),
                gradeText: null,
                comments: gradeComment || null,
            });
            // Actualizar estado local
            setSubmissions(prev => prev.map(s => 
                s.studentID === selectedStudent.studentID 
                ? { ...s, grade: parseFloat(gradeValue) } 
                : s
            ));
            
            // Lock after successful save
            setIsEditingGrade(false);
            
            alert('Nota guardada correctamente.');
        } catch (err: any) {
            alert('Error al guardar la nota: ' + err.message);
        } finally {
            setIsSavingGrade(false);
        }
    };

    const renderAnswer = (ans: QuestionAnswerDetail, index: number) => {
        const isMultipleChoice = ans.questionType === 2;
        let containerClass = "mb-4 bg-surface p-4 rounded border shadow-sm ";
        let answerStatusClass = "mt-2 p-2 rounded text-sm font-medium ";
        
        if (isMultipleChoice) {
            if (ans.isCorrect) {
                containerClass += "border-success-light";
                answerStatusClass += "bg-success-light text-success-text border border-success-text/20";
            } else {
                containerClass += "border-danger-light";
                answerStatusClass += "bg-danger-light text-danger-text border border-danger-text/20";
            }
        } else {
            containerClass += "border-border";
            answerStatusClass += "bg-background text-text-primary border border-border";
        }

        return (
            <div key={index} className={containerClass}>
                <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-text-primary text-sm pr-2">
                        <span className="text-secondary mr-1">{index + 1}.</span> 
                        {ans.questionText}
                    </h4>
                    <span className="text-xs bg-gray-100 text-text-secondary px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                        {ans.points} pts
                    </span>
                </div>
                
                <div className="text-sm">
                    <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-1">Respuesta del estudiante:</p>
                    <div className={answerStatusClass}>
                        {ans.answerText || ans.selectedOptionText || <span className="italic text-text-tertiary">(Sin respuesta)</span>}
                    </div>
                </div>
                
                {isMultipleChoice && (
                    <div className="mt-3 text-xs border-t border-border pt-2">
                        <p className="font-bold text-text-secondary mb-1">Opciones:</p>
                        <ul className="list-disc list-inside text-text-secondary ml-1">
                            {ans.options?.map(opt => (
                                <li key={opt.optionID} className={opt.optionText === ans.selectedOptionText ? "font-bold text-primary" : ""}>
                                    {opt.optionText} {opt.optionText === ans.selectedOptionText && "(Seleccionada)"}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {isMultipleChoice && !ans.isCorrect && (
                    <div className="mt-2 text-xs text-danger font-semibold flex items-center">
                        <span className="mr-1">❌</span> Respuesta Incorrecta
                    </div>
                )}
                {isMultipleChoice && ans.isCorrect && (
                    <div className="mt-2 text-xs text-success font-semibold flex items-center">
                        <span className="mr-1">✅</span> Respuesta Correcta
                    </div>
                )}
            </div>
        );
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Resultados: ${evaluation.title}`}>
            <div className="flex flex-col md:flex-row h-[75vh]">
                {/* Panel Izquierdo: Lista de Estudiantes */}
                <div className="w-full md:w-1/3 border-r border-border pr-0 md:pr-4 overflow-y-auto mb-4 md:mb-0 bg-background/30 p-2 rounded-l-lg">
                    <h3 className="font-bold text-lg mb-3 sticky top-0 bg-surface py-2 px-2 border-b border-border z-10 flex justify-between items-center">
                        <span>Estudiantes</span>
                        <span className="text-xs font-normal bg-secondary text-text-on-primary px-2 py-0.5 rounded-full">{submissions.length}</span>
                    </h3>
                    
                    {loading && <div className="flex justify-center py-8"><SpinnerIcon className="text-primary w-8 h-8"/></div>}
                    {error && <p className="text-danger text-sm p-2">{error}</p>}
                    
                    {!loading && submissions.length === 0 && (
                        <p className="text-secondary text-sm p-4 text-center">Nadie ha enviado el examen todavía.</p>
                    )}

                    <ul className="space-y-1">
                        {submissions.map(sub => (
                            <li 
                                key={sub.studentID}
                                onClick={() => setSelectedStudent(sub)}
                                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedStudent?.studentID === sub.studentID ? 'bg-primary text-text-on-primary border-primary shadow-md transform scale-[1.02]' : 'bg-surface hover:bg-white border-transparent hover:border-border text-text-primary'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="font-medium text-sm">{sub.studentName}</p>
                                        <p className={`text-xs ${selectedStudent?.studentID === sub.studentID ? 'text-text-on-primary/80' : 'text-text-tertiary'}`}>
                                            {new Date(sub.submittedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    {sub.grade !== null && sub.grade !== undefined && (
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${selectedStudent?.studentID === sub.studentID ? 'bg-white text-primary' : 'bg-success-light text-success-text'}`}>
                                            {sub.grade}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Panel Derecho: Detalles del Examen */}
                <div className="w-full md:w-2/3 pl-0 md:pl-4 overflow-y-auto flex flex-col bg-surface rounded-r-lg">
                    {selectedStudent ? (
                        <>
                            <div className="mb-6 pb-4 border-b border-border sticky top-0 bg-surface z-10 pt-2">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-bold text-xl text-primary flex items-center gap-2">
                                        <span className="bg-primary/10 p-2 rounded-full text-primary">👤</span>
                                        {selectedStudent.studentName}
                                    </h3>
                                    
                                    {/* Edit / Lock Controls */}
                                    {!isEditingGrade && selectedStudent.grade !== null ? (
                                        <button 
                                            onClick={() => setIsEditingGrade(true)}
                                            className="text-xs flex items-center gap-1 text-secondary bg-background border border-border px-2 py-1 rounded hover:bg-border transition-colors"
                                            title="Habilitar edición de nota"
                                        >
                                            <LockClosedIcon className="w-3 h-3"/> Nota Asignada
                                        </button>
                                    ) : selectedStudent.grade !== null && (
                                        <span className="text-xs flex items-center gap-1 text-warning-dark bg-warning/10 px-2 py-1 rounded border border-warning/20">
                                            <PencilAltIcon className="w-3 h-3"/> Editando
                                        </span>
                                    )}
                                </div>

                                <div className={`bg-background p-3 rounded-lg border mt-2 flex flex-wrap items-end gap-4 transition-colors ${!isEditingGrade ? 'opacity-70 grayscale-[0.5] border-border pointer-events-none' : 'border-accent/30'}`}>
                                    <div>
                                        <label className="block text-xs font-bold text-text-secondary mb-1">Calificación</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            className="border border-border rounded p-1.5 w-24 text-center font-bold text-lg focus:ring-2 focus:ring-accent focus:outline-none"
                                            value={gradeValue}
                                            onChange={(e) => setGradeValue(e.target.value)}
                                            disabled={!isEditingGrade}
                                        />
                                    </div>
                                    <div className="flex-grow">
                                        <label className="block text-xs font-bold text-text-secondary mb-1">Comentario (Opcional)</label>
                                        <input 
                                            type="text" 
                                            className="border border-border rounded p-2 w-full text-sm focus:ring-2 focus:ring-accent focus:outline-none"
                                            value={gradeComment}
                                            onChange={(e) => setGradeComment(e.target.value)}
                                            placeholder="Excelente trabajo..."
                                            disabled={!isEditingGrade}
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAssignGrade}
                                        disabled={isSavingGrade || !isEditingGrade}
                                        className="bg-primary text-text-on-primary py-2 px-6 rounded hover:bg-opacity-90 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSavingGrade ? 'Guardando...' : 'Calificar'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex-grow px-2">
                                {loadingDetail ? (
                                    <div className="flex justify-center py-12"><SpinnerIcon className="text-primary w-8 h-8"/></div>
                                ) : detailedSubmission && detailedSubmission.questions.length > 0 ? (
                                    detailedSubmission.questions.map((ans, idx) => renderAnswer(ans, idx))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-secondary border-2 border-dashed border-border rounded-lg bg-background/50">
                                        <p>No se encontraron respuestas detalladas para este estudiante.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-secondary bg-background/30 rounded-lg m-4 border-2 border-dashed border-border">
                            <span className="text-4xl mb-4">👈</span>
                            <p className="text-lg">Selecciona un estudiante de la lista</p>
                            <p className="text-sm opacity-70">para ver sus respuestas y calificar.</p>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end pt-4 mt-4 border-t">
                <button onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors border border-border">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default VirtualExamResultsModal;
