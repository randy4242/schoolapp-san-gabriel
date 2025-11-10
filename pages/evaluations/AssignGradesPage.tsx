import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Evaluation, User, Grade } from '../../types';

type FormValues = {
  grades: {
    userID: number;
    userName: string;
    gradeValue: string; // Use string for input flexibility
    gradeText: string;
    comments: string;
    hasGrade: boolean;
  }[];
};

const AssignGradesPage: React.FC = () => {
    const { evaluationId } = useParams<{ evaluationId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [gradeMode, setGradeMode] = useState<'numeric' | 'text' | 'both'>('both');

    const { control, handleSubmit } = useForm<FormValues>({
        defaultValues: {
            grades: []
        }
    });

    const { fields, replace } = useFieldArray({
        control,
        name: "grades"
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!evaluationId || !user?.schoolId) return;
            try {
                setLoading(true);
                const evalId = parseInt(evaluationId);
                const [evalData, studentData, gradeData] = await Promise.all([
                    apiService.getEvaluationById(evalId, user.schoolId),
                    apiService.getStudentsForEvaluation(evalId),
                    apiService.getGradesForEvaluation(evalId, user.schoolId)
                ]);

                setEvaluation(evalData);
                
                let classroomName = '';

                // Use the classroomID directly from the evaluation data, which is most reliable.
                if (evalData.classroomID) {
                    try {
                        const classroomData = await apiService.getClassroomById(evalData.classroomID, user.schoolId);
                        classroomName = classroomData.name.toLowerCase();
                    } catch (e) {
                        console.warn("Could not fetch classroom name from evalData.classroomID", e);
                    }
                } else {
                    // Fallback logic if classroomID is not on the evaluation for some reason
                    if (studentData.length > 0) {
                        try {
                            const studentDetails = await apiService.getUserDetails(studentData[0].userID, user.schoolId);
                            if (studentDetails.classroom) {
                                classroomName = studentDetails.classroom.name.toLowerCase();
                            }
                        } catch(e) {
                             console.warn("Could not determine classroom for evaluation from student, defaulting to both grade types.", e);
                        }
                    }
                }
                
                // Set grade mode based on classroom name
                if (classroomName.includes('año')) {
                    setGradeMode('numeric');
                } else if (classroomName.includes('grado')) {
                    setGradeMode('text');
                } else {
                    setGradeMode('both');
                }
                
                // Sort students alphabetically by name
                studentData.sort((a, b) => a.userName.localeCompare(b.userName));

                // The API is configured to return camelCase, create a map for efficient lookup.
                const gradeMap = new Map(gradeData.map(g => [g.userID, g]));

                const studentGradeData = studentData.map(student => {
                    const existingGrade = gradeMap.get(student.userID);
                    return {
                        userID: student.userID,
                        userName: student.userName,
                        gradeValue: existingGrade?.gradeValue?.toString() ?? '',
                        gradeText: existingGrade?.gradeText ?? '',
                        comments: existingGrade?.comments ?? '',
                        hasGrade: !!existingGrade,
                    };
                });
                
                replace(studentGradeData);

            } catch (err) {
                setError('No se pudo cargar la información para asignar notas.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [evaluationId, user, replace]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, fieldName: 'gradeValue' | 'gradeText' | 'comments') => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const nextIndex = currentIndex + 1;
            if (nextIndex < fields.length) {
                const nextFieldName = `grades.${nextIndex}.${fieldName}`;
                const nextInput = document.getElementsByName(nextFieldName)[0] as HTMLInputElement;
                if (nextInput) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        }
    };

    const onSubmit = async (data: FormValues) => {
        if (!evaluationId || !user?.schoolId || !evaluation) {
            setError('Error de configuración o evaluación no encontrada.');
            return;
        }

        setSaving(true);
        setError('');

        const promises = data.grades.map(grade => {
            // Only send if there's something to save
            if (grade.gradeValue || grade.gradeText || grade.comments) {
                return apiService.assignGrade({
                    userID: grade.userID,
                    evaluationID: parseInt(evaluationId),
                    courseID: evaluation.courseID,
                    schoolID: user.schoolId,
                    gradeValue: grade.gradeValue ? parseFloat(grade.gradeValue) : null,
                    gradeText: grade.gradeText || null,
                    comments: grade.comments || null
                });
            }
            return Promise.resolve();
        });

        try {
            await Promise.all(promises);
            navigate('/evaluations');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar las notas.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>Cargando estudiantes y notas...</p>;
    if (error) return <p className="text-danger">{error}</p>;

    return (
        <div className="bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-2">Asignar Notas</h1>
            <h2 className="text-lg text-secondary mb-6">Evaluación: <span className="font-semibold text-info-dark">{evaluation?.title}</span></h2>
            
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estudiante</th>
                                {(gradeMode === 'numeric' || gradeMode === 'both') && <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider w-32">Nota Num.</th>}
                                {(gradeMode === 'text' || gradeMode === 'both') && <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider w-32">Nota Txt.</th>}
                                <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Comentarios</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {fields.map((field, index) => (
                                <tr key={field.id} className={field.hasGrade ? 'bg-success-light/30' : ''}>
                                    <td className="px-4 py-2 whitespace-nowrap font-medium">
                                        {field.userName}
                                        {field.hasGrade && <span className="ml-2 text-xs font-semibold bg-success text-text-on-primary px-2 py-0.5 rounded-full">Cargada</span>}
                                    </td>
                                    
                                    {(gradeMode === 'numeric' || gradeMode === 'both') && (
                                        <td className="px-4 py-2">
                                            <Controller
                                                name={`grades.${index}.gradeValue`}
                                                control={control}
                                                render={({ field }) => <input type="number" step="0.01" {...field} onKeyDown={(e) => handleKeyDown(e, index, 'gradeValue')} className="w-full p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-accent" />}
                                            />
                                        </td>
                                    )}

                                    {(gradeMode === 'text' || gradeMode === 'both') && (
                                        <td className="px-4 py-2">
                                            <Controller
                                                name={`grades.${index}.gradeText`}
                                                control={control}
                                                render={({ field }) => <input {...field} onKeyDown={(e) => handleKeyDown(e, index, 'gradeText')} className="w-full p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-accent" />}
                                            />
                                        </td>
                                    )}
                                    
                                    <td className="px-4 py-2">
                                         <Controller
                                            name={`grades.${index}.comments`}
                                            control={control}
                                            render={({ field }) => <input {...field} onKeyDown={(e) => handleKeyDown(e, index, 'comments')} className="w-full p-2 bg-surface text-text-primary border border-border rounded-md shadow-sm text-sm focus:outline-none focus:ring-1 focus:ring-accent" />}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end space-x-4 pt-6 mt-4 border-t">
                    <Link to="/evaluations" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                    <button type="submit" disabled={saving} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                        {saving ? 'Guardando...' : 'Guardar Notas'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssignGradesPage;