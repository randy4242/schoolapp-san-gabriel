import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, User, Grade } from '../../types';
import DescriptiveGradeFormModal from './DescriptiveGradeFormModal';

const AssignDescriptiveGradesPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [students, setStudents] = useState<User[]>([]);
    const [grades, setGrades] = useState<Grade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [modalOpenForStudent, setModalOpenForStudent] = useState<User | null>(null);

    const fetchData = useCallback(async () => {
        if (!evaluationId || !user?.schoolId) return;
        setLoading(true);
        setError('');
        try {
            const evalId = parseInt(evaluationId);
            const [evalData, studentData, gradeData] = await Promise.all([
                apiService.getEvaluationById(evalId, user.schoolId),
                apiService.getStudentsForEvaluation(evalId),
                apiService.getGradesForEvaluation(evalId, user.schoolId).catch(err => {
                    // Gracefully handle not found error, which is expected for new evaluations
                    console.warn("Could not fetch grades, assuming none exist yet:", err);
                    return [];
                })
            ]);
            setEvaluation(evalData);
            setStudents(studentData.sort((a, b) => a.userName.localeCompare(b.userName)));
            setGrades(gradeData);
        } catch (err) {
            setError('No se pudo cargar la información de la evaluación o los estudiantes.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [evaluationId, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const gradeMap: Map<number, Grade> = new Map(grades.map(g => [g.userID, g]));

    if (loading) return <p>Cargando información...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded-md">{error}</p>;
    if (!evaluation) return <p>Evaluación no encontrada.</p>

    return (
        <div className="bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Asignar Nota Descriptiva</h1>
            <h2 className="text-lg text-secondary mb-6">
                Evaluación: <span className="font-semibold text-info-dark">{evaluation.title}</span><br />
                Curso: <span className="font-semibold text-info-dark">{evaluation.course?.name}</span>
            </h2>

            <div className="overflow-x-auto border border-border rounded-lg">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-header">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estudiante</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estado</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-text-on-primary uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-surface divide-y divide-border">
                        {students.map(student => {
                            const grade = gradeMap.get(student.userID);
                            const hasGrade = !!grade?.gradeText?.startsWith('[DESCRIPTIVA]');
                            return (
                                <tr key={student.userID} className="hover:bg-background">
                                    <td className="px-4 py-2 whitespace-nowrap font-medium">{student.userName}</td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                        {hasGrade ? 
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success-text">Completada</span> : 
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-warning/20 text-warning-dark">Pendiente</span>
                                        }
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-center">
                                        {hasGrade ? (
                                            <div className="flex justify-center items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        if (grade && evaluation) {
                                                            navigate('/report-viewer', {
                                                                state: {
                                                                    reportType: 'descriptive-grade',
                                                                    student,
                                                                    evaluation,
                                                                    grade
                                                                }
                                                            });
                                                        }
                                                    }}
                                                    className="bg-info text-white py-1 px-3 rounded text-sm hover:bg-opacity-80"
                                                >
                                                    Ver Planilla
                                                </button>
                                                <button
                                                    onClick={() => setModalOpenForStudent(student)}
                                                    className="bg-warning text-black py-1 px-3 rounded text-sm hover:bg-opacity-80"
                                                >
                                                    Editar Planilla
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setModalOpenForStudent(student)}
                                                className="bg-primary text-text-on-primary py-1 px-3 rounded text-sm hover:bg-opacity-80"
                                            >
                                                Llenar Planilla
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="mt-6">
                <Link to="/evaluations" className="text-info hover:underline">&larr; Volver a Evaluaciones</Link>
            </div>

            {modalOpenForStudent && (
                <DescriptiveGradeFormModal
                    student={modalOpenForStudent}
                    evaluation={evaluation}
                    existingGrade={gradeMap.get(modalOpenForStudent.userID) || null}
                    onClose={() => setModalOpenForStudent(null)}
                    onSaveSuccess={() => {
                        setModalOpenForStudent(null);
                        fetchData(); // Refresh grade statuses
                    }}
                />
            )}
        </div>
    );
};

export default AssignDescriptiveGradesPage;
