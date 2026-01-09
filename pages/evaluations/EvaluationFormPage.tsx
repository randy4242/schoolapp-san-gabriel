
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, Evaluation, AuthenticatedUser, Lapso } from '../../types';

type FormInputs = {
    title: string;
    descriptionText: string;
    descriptionPercent: number;
    date: string;
    courseID: number;
    isVirtual: boolean;
    virtualType?: number | null;
    isNonEvaluable: boolean;
};

const NON_EVALUABLE_TAG = "| No evaluado |";

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
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [originalEvaluation, setOriginalEvaluation] = useState<Evaluation | null>(null);
    const [isLocked, setIsLocked] = useState(false);

    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            isNonEvaluable: false
        }
    });
    
    const isVirtual = watch('isVirtual');
    const descriptionText = watch('descriptionText') || '';
    const isNonEvaluable = watch('isNonEvaluable');

    // Filter for specific schools
    const isSpecialSchool = useMemo(() => {
        return user?.schoolId && user.schoolId >= 5 && user.schoolId <= 9;
    }, [user?.schoolId]);

    // Check if user manually typed the forbidden tag
    const hasManualTag = useMemo(() => {
        return descriptionText.includes(NON_EVALUABLE_TAG);
    }, [descriptionText]);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.schoolId && user.userId) {
                setLoading(true);
                try {
                    const [courses, lapsosData] = await Promise.all([
                        apiService.getTaughtCourses(user.userId, user.schoolId),
                        apiService.getLapsos(user.schoolId)
                    ]);
                    setTaughtCourses(courses);
                    setLapsos(lapsosData);

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

                        // Detect Non-Evaluable Tag
                        if (isSpecialSchool && currentDesc.includes(NON_EVALUABLE_TAG)) {
                            setValue('isNonEvaluable', true);
                            currentDesc = currentDesc.replace(NON_EVALUABLE_TAG, '').trim();
                        }

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
                    setError('No se pudo cargar la información necesaria.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [id, isEditMode, user, setValue, isSpecialSchool]);

    const onSubmit = async (data: FormInputs) => {
        if (!user?.schoolId || !user.userId) {
            setError("No se ha podido identificar al usuario o al colegio.");
            return;
        }

        if (hasManualTag) {
            setError(`No puedes escribir "${NON_EVALUABLE_TAG}" manualmente. Por favor, usa la casilla de verificación.`);
            return;
        }
        
        if (isEditMode && !originalEvaluation) {
            setError("No se ha podido cargar la información original de la evaluación.");
            return;
        }

        setError('');
        setLoading(true);

        let finalDescription = data.descriptionText || '';
        
        // Add Non-Evaluable Tag if checked
        if (isSpecialSchool && data.isNonEvaluable) {
            finalDescription = `${finalDescription} ${NON_EVALUABLE_TAG}`.trim();
        }

        if (data.descriptionPercent !== undefined && data.descriptionPercent !== null && !isNaN(data.descriptionPercent)) {
            finalDescription = `${finalDescription}@${data.descriptionPercent}`;
        }
            
        const hadOverride = originalEvaluation?.description?.includes('@@OVERRIDE:');

        if (user.roleId === 6 && hadOverride) {
            const overrideMatch = originalEvaluation!.description.match(/@@OVERRIDE:.*$/);
            if (overrideMatch) {
                finalDescription = `${finalDescription} ${overrideMatch[0]}`;
            }
        }

        try {
            if (isEditMode) {
                const payload: Partial<Evaluation> = {
                    title: data.title,
                    description: finalDescription,
                    date: data.date,
                    courseID: data.courseID,
                    userID: originalEvaluation!.userID,
                    schoolID: originalEvaluation!.schoolID,
                    isVirtual: data.isVirtual,
                    virtualType: data.isVirtual ? data.virtualType : null,
                };
                await apiService.updateEvaluation(parseInt(id!), payload);
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
            setError(err.message || 'Ocurrió un error al guardar la evaluación.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar Evaluación' : 'Crear Evaluación'}</h1>
            
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
            
            {loading && isEditMode ? <p>Cargando datos...</p> : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {isLocked && (
                        <div className="bg-warning/20 text-warning-dark p-3 rounded mb-4 text-sm">
                            <b>Edición bloqueada:</b> Han pasado más de 3 días hábiles desde la creación.
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Título</label>
                        <input {...register('title', { required: 'El título es requerido' })} disabled={isLocked} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background" />
                        {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Descripción</label>
                        <textarea {...register('descriptionText')} disabled={isLocked} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background"></textarea>
                        {hasManualTag && (
                            <p className="text-danger text-xs mt-1 font-bold animate-pulse">
                                Advertencia: No escribas "{NON_EVALUABLE_TAG}" manualmente. Usa el checkbox de abajo.
                            </p>
                        )}
                    </div>

                    {isSpecialSchool && (
                        <div className="flex items-center p-3 bg-info-light/20 border border-info-light rounded-md">
                            <input 
                                type="checkbox" 
                                {...register('isNonEvaluable')} 
                                id="isNonEvaluable"
                                disabled={isLocked}
                                className="h-4 w-4 rounded border-border text-primary focus:ring-accent disabled:bg-gray-200"
                            />
                            <label htmlFor="isNonEvaluable" className="ml-2 block text-sm font-bold text-info-dark">
                                Esta evaluación no es evaluable (Solo visualización)
                            </label>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Porcentaje (%)</label>
                        <input type="number" {...register('descriptionPercent', { valueAsNumber: true, min: { value: 0, message: 'El valor mínimo es 0' }, max: { value: 100, message: 'El valor máximo es 100' } })} disabled={isLocked || isNonEvaluable} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background" />
                        {errors.descriptionPercent && <p className="text-danger text-xs mt-1">{errors.descriptionPercent.message}</p>}
                        {isNonEvaluable && <p className="text-info text-[10px] mt-1 italic">Las evaluaciones no evaluables no suelen requerir porcentaje.</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Fecha</label>
                        <input type="date" {...register('date', { required: 'La fecha es requerida' })} disabled={isLocked} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background" />
                        {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Curso</label>
                        <select {...register('courseID', { valueAsNumber: true, required: 'Debe seleccionar un curso' })} disabled={isLocked} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background">
                            <option value="">Seleccione un curso</option>
                            {taughtCourses.map(course => <option key={course.courseID} value={course.courseID}>{course.name}</option>)}
                        </select>
                        {errors.courseID && <p className="text-danger text-xs mt-1">{errors.courseID.message}</p>}
                    </div>

                    <div className="flex items-center">
                        <input 
                            type="checkbox" 
                            {...register('isVirtual')} 
                            id="isVirtual"
                            disabled={isLocked}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-accent disabled:bg-gray-200"
                        />
                        <label htmlFor="isVirtual" className="ml-2 block text-sm font-medium text-text-primary">
                            Requiere Aula Virtual
                        </label>
                    </div>

                    {isVirtual && (
                        <div className="animate-fade-in-down p-4 bg-background border border-border rounded-md">
                            <label className="block text-sm font-medium text-text-primary">Tipo de Evaluación Virtual</label>
                            <select
                                {...register('virtualType', {
                                    valueAsNumber: true,
                                    validate: value => !isVirtual || (value != null && value > 0) || 'Debe seleccionar un tipo de evaluación virtual'
                                })}
                                disabled={isLocked}
                                className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent disabled:bg-background"
                            >
                                <option value="">-- Seleccione un tipo --</option>
                                <option value="1">Examen con contenido</option>
                                <option value="2">Examen de selección</option>
                                <option value="3">Tarea</option>
                            </select>
                            {errors.virtualType && <p className="text-danger text-xs mt-1">{errors.virtualType.message}</p>}
                        </div>
                    )}

                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to="/evaluations" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                        <button type="submit" disabled={loading || isLocked || hasManualTag} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary disabled:cursor-not-allowed transition-all">
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EvaluationFormPage;
