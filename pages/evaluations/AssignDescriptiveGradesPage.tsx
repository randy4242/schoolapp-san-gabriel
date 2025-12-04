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
            
            // 1. Fetch Evaluation first to get context (like classroomID)
            const evalData = await apiService.getEvaluationById(evalId, user.schoolId);
            setEvaluation(evalData);

            // Robustness: Resolve Classroom ID
            // If evaluation doesn't have it, try to get it from the Course
            let targetClassroomId = evalData.classroomID;
            if (!targetClassroomId && evalData.courseID) {
                try {
                    const courseData = await apiService.getCourseById(evalData.courseID, user.schoolId);
                    if (courseData.classroomID) {
                        targetClassroomId = courseData.classroomID;
                    }
                } catch (e) {
                    console.warn("Could not fetch course details for fallback classroom ID");
                }
            }

            // 2. Fetch Students with Fallback mechanism
            let studentData: User[] = [];
            try {
                studentData = await apiService.getStudentsForEvaluation(evalId);
            } catch (err: any) {
                // Ignore 404 from primary fetch if we have a fallback
                console.warn("Primary student fetch failed, trying fallback...", err.message);
                
                if (targetClassroomId) {
                    try {
                        studentData = await apiService.getStudentsByClassroom(targetClassroomId, user.schoolId);
                    } catch (fallbackErr: any) {
                        // Handle "No students found" as empty list, not fatal error
                        if (fallbackErr.message && (fallbackErr.message.includes("No se encontraron") || fallbackErr.message.includes("Not Found"))) {
                            studentData = [];
                        } else {
                            throw new Error(fallbackErr.message || "No se pudieron cargar los estudiantes del salón.");
                        }
                    }
                } else {
                    // If primary failed and we have no classroom ID to fallback to:
                    if (err.message && (err.message.includes("No se encontraron") || err.message.includes("Not Found"))) {
                        studentData = [];
                    } else {
                        throw err;
                    }
                }
            }

            // 3. Fetch Grades (tolerant to 404/empty)
            const gradeData = await apiService.getGradesForEvaluation(evalId, user.schoolId).catch(err => {
                console.warn("Could not fetch grades, assuming none exist yet:", err);
                return [];
            });

            setStudents(studentData.sort((a, b) => a.userName.localeCompare(b.userName)));
            setGrades(gradeData);

        } catch (err: any) {
            setError(err.message || 'No se pudo cargar la información de la evaluación o los estudiantes.');
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
    if (!evaluation) return <p>Evaluación no encontrada.</p>;

    return (
        <div className="bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Asignar Nota Descriptiva</h1>
            <h2 className="text-lg text-secondary mb-6">
                Evaluación: <span className="font-semibold text-info-dark">{evaluation.title}</span><br />
                Curso: <span className="font-semibold text-info-dark">{evaluation.course?.name}</span>
            </h2>

            {students.length === 0 ? (
                <div className="bg-warning/20 text-warning-dark p-4 rounded-md mb-6">
                    No se encontraron estudiantes asociados a esta evaluación o al salón del curso. 
                    Por favor, verifique que el curso tenga un salón asignado y que el salón tenga estudiantes.
                </div>
            ) : (
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
            )}

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