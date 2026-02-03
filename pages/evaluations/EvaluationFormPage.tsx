
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Evaluation, AuthenticatedUser } from '../../types';

type FormInputs = {
    title: string;
    descriptionText: string;
    descriptionPercent: number;
    date: string;
    courseID: number;
    isVirtual: boolean;
    virtualType?: number | null;
};

function countBusinessDays(startDate: Date, today: Date): number {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    curDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(today.getTime());
    todayStart.setHours(0, 0, 0, 0);
    if (todayStart < curDate) return 0;
    while (curDate <= todayStart) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    return count > 0 ? count - 1 : 0;
}

function isEvaluationEditable(evaluation: Evaluation, user: AuthenticatedUser | null): boolean {
    if (!evaluation || !user) return false;
    if (user.roleId === 6) return true;
    if (evaluation.description?.includes('@@OVERRIDE:')) return true;
    const today = new Date();
    const evaluationDate = new Date(evaluation.date);
    if (evaluationDate > today) return true;
    const creationDate = new Date(evaluation.createdAt);
    const businessDaysPassed = countBusinessDays(creationDate, today);
    return businessDaysPassed <= 3;
}

const EvaluationFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditMode = Boolean(id);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [taughtCourses, setTaughtCourses] = useState<Course[]>([]);
    const [originalEvaluation, setOriginalEvaluation] = useState<Evaluation | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            isVirtual: false,
            descriptionPercent: 0,
            date: new Date().toISOString().split('T')[0]
        }
    });
    
    const isVirtual = watch('isVirtual');

    useEffect(() => {
        const fetchData = async () => {
            if (user?.schoolId && user.userId) {
                setLoading(true);
                try {
                    const courses = await apiService.getTaughtCourses(user.userId, user.schoolId);
                    setTaughtCourses(courses);

                    if (isEditMode) {
                        const evalData = await apiService.getEvaluationById(parseInt(id!), user.schoolId);
                        setOriginalEvaluation(evalData);

                        if (!isEvaluationEditable(evalData, user)) {
                            setIsLocked(true);
                        }

                        setValue('title', evalData.title);
                        setValue('date', evalData.date.split('T')[0]);
                        setValue('courseID', evalData.courseID);
                        setValue('isVirtual', evalData.isVirtual || false);
                        setValue('virtualType', evalData.virtualType ?? null);
                        
                        let currentDesc = evalData.description || '';
                        const overrideMatch = currentDesc.match(/@@OVERRIDE:.*$/);
                        const cleanDescription = overrideMatch ? currentDesc.replace(overrideMatch[0], '').trim() : currentDesc;
                        
                        const descParts = cleanDescription.split('@');
                        if(descParts.length > 1) {
                            const potentialPercent = descParts[descParts.length - 1];
                            if (!isNaN(parseFloat(potentialPercent))) {
                                const percent = descParts.pop();
                                setValue('descriptionText', descParts.join('@').trim());
                                setValue('descriptionPercent', Number(percent));
                            } else {
                                setValue('descriptionText', cleanDescription.trim());
                            }
                        } else {
                            setValue('descriptionText', cleanDescription.trim());
                        }
                    }
                } catch (err) {
                    setError('No se pudo cargar la información.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [id, isEditMode, user, setValue]);

    const onSubmit = async (data: FormInputs) => {
        if (!user?.schoolId || !user.userId) return;
        setError('');
        setLoading(true);

        let finalDescription = data.descriptionText || '';
        if (data.descriptionPercent !== undefined && !isNaN(data.descriptionPercent)) {
            finalDescription = `${finalDescription}@${data.descriptionPercent}`;
        }
            
        const hadOverride = originalEvaluation?.description?.includes('@@OVERRIDE:');
        if (user.roleId === 6 && hadOverride) {
            const overrideMatch = originalEvaluation!.description.match(/@@OVERRIDE:.*$/);
            if (overrideMatch) finalDescription = `${finalDescription} ${overrideMatch[0]}`;
        }

        try {
            if (isEditMode) {
                await apiService.updateEvaluation(parseInt(id!), {
                    title: data.title,
                    description: finalDescription,
                    date: data.date,
                    courseID: data.courseID,
                    isVirtual: data.isVirtual,
                    virtualType: data.isVirtual ? data.virtualType : null,
                });
            } else {
                await apiService.createEvaluation({
                    title: data.title,
                    description: finalDescription,
                    date: data.date,
                    courseID: data.courseID,
                    userID: user.userId,
                    schoolID: user.schoolId,
                    isVirtual: data.isVirtual,
                    virtualType: data.isVirtual ? data.virtualType : null,
                } as any);
            }
            navigate('/evaluations');
        } catch (err: any) {
            setError(err.message || 'Error al guardar.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background";

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md border border-border">
            <h1 className="text-2xl font-bold text-primary mb-6">
                {isEditMode ? 'Editar' : 'Crear'} Evaluación Calificable
            </h1>
            
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
            
            {loading && isEditMode ? <p>Cargando datos...</p> : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {isLocked && (
                        <div className="bg-warning/10 text-warning-dark p-3 rounded mb-4 text-sm border-l-4 border-warning">
                            <b>Edición bloqueada:</b> Han pasado más de 3 días hábiles. Solo lectura.
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Curso / Materia</label>
                        <select {...register('courseID', { valueAsNumber: true, required: 'Debe seleccionar un curso' })} disabled={isLocked || isEditMode} className={inputClass}>
                            <option value="">-- Seleccione el curso --</option>
                            {taughtCourses.map(course => <option key={course.courseID} value={course.courseID}>{course.name}</option>)}
                        </select>
                        {errors.courseID && <p className="text-danger text-xs mt-1">{errors.courseID.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Título de la Actividad</label>
                        <input {...register('title', { required: 'El título es requerido' })} disabled={isLocked} className={inputClass} placeholder="Ej: Examen de Lógica..." />
                        {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Fecha</label>
                            <input type="date" {...register('date', { required: 'La fecha es requerida' })} disabled={isLocked} className={inputClass} />
                            {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Ponderación (%)</label>
                            <input type="number" {...register('descriptionPercent', { valueAsNumber: true, min: 0, max: 100 })} disabled={isLocked} className={inputClass} placeholder="0-100" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary uppercase tracking-wider">Instrucciones</label>
                        <textarea {...register('descriptionText')} disabled={isLocked} rows={4} className={inputClass} placeholder="Instrucciones para el estudiante..."></textarea>
                    </div>

                    <div className="flex items-center p-3 bg-background rounded-lg border border-border">
                        <input type="checkbox" {...register('isVirtual')} id="isVirtual" disabled={isLocked} className="h-5 w-5 rounded border-border text-primary focus:ring-accent" />
                        <label htmlFor="isVirtual" className="ml-3 block text-sm font-bold text-primary cursor-pointer">Habilitar entrega en Aula Virtual</label>
                    </div>

                    {isVirtual && (
                        <div className="p-4 bg-primary/5 border border-primary/20 rounded-md animate-fade-in">
                            <label className="block text-sm font-bold text-primary mb-2">Tipo de Actividad Virtual</label>
                            <select {...register('virtualType', { valueAsNumber: true, validate: value => !isVirtual || (value != null && value > 0) || 'Seleccione un tipo' })} disabled={isLocked} className={inputClass}>
                                <option value="">-- Seleccione un tipo --</option>
                                <option value="1">Examen con contenido</option>
                                <option value="2">Cuestionario de selección</option>
                                <option value="3">Buzón de Tarea</option>
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-6 border-t border-border">
                        <button type="button" onClick={() => navigate('/evaluations')} className="bg-background text-text-primary py-2 px-6 rounded hover:bg-border transition-colors font-semibold">Cancelar</button>
                        <button type="submit" disabled={loading || isLocked} className="bg-primary text-white py-2 px-8 rounded hover:opacity-90 disabled:bg-secondary font-bold shadow-md transition-all">
                            {loading ? 'Procesando...' : isEditMode ? 'Guardar Cambios' : 'Crear Evaluación'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EvaluationFormPage;
