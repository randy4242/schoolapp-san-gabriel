import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course } from '../../types';

type FormInputs = {
    title: string;
    descriptionText: string;
    descriptionPercent: number;
    date: string;
    courseID: number;
};

const EvaluationFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditMode = Boolean(id);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [taughtCourses, setTaughtCourses] = useState<Course[]>([]);

    const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<FormInputs>();

    useEffect(() => {
        const fetchData = async () => {
            if (user?.schoolId && user.userId) {
                setLoading(true);
                try {
                    const courses = await apiService.getTaughtCourses(user.userId, user.schoolId);
                    setTaughtCourses(courses);

                    if (isEditMode) {
                        const evalData = await apiService.getEvaluationById(parseInt(id!), user.schoolId);
                        setValue('title', evalData.title);
                        setValue('date', evalData.date.split('T')[0]); // Format date for input
                        setValue('courseID', evalData.courseID);
                        
                        // Parse description
                        const descParts = evalData.description.split('@');
                        if(descParts.length > 1) {
                            const percent = descParts.pop();
                            setValue('descriptionText', descParts.join('@'));
                            setValue('descriptionPercent', Number(percent));
                        } else {
                            setValue('descriptionText', evalData.description);
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
    }, [id, isEditMode, setValue, user]);

    const onSubmit = async (data: FormInputs) => {
        if (!user?.schoolId || !user.userId) {
            setError("No se ha podido identificar al usuario o al colegio.");
            return;
        }
        
        setError('');
        setLoading(true);

        const description = `${data.descriptionText}@${data.descriptionPercent}`;

        try {
            if (isEditMode) {
                await apiService.updateEvaluation(parseInt(id!), {
                    title: data.title,
                    description,
                    date: data.date,
                    courseID: data.courseID,
                });
            } else {
                await apiService.createEvaluation({
                    title: data.title,
                    description,
                    date: data.date,
                    courseID: data.courseID,
                    userID: user.userId,
                    schoolID: user.schoolId,
                });
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
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Título</label>
                        <input {...register('title', { required: 'El título es requerido' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.title && <p className="text-danger text-xs mt-1">{errors.title.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Descripción</label>
                        <textarea {...register('descriptionText')} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Porcentaje (%)</label>
                        <input type="number" {...register('descriptionPercent', { required: 'El porcentaje es requerido', valueAsNumber: true, min: 0, max: 100 })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.descriptionPercent && <p className="text-danger text-xs mt-1">{errors.descriptionPercent.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Fecha</label>
                        <input type="date" {...register('date', { required: 'La fecha es requerida' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.date && <p className="text-danger text-xs mt-1">{errors.date.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Curso</label>
                        <select {...register('courseID', { valueAsNumber: true, required: 'Debe seleccionar un curso' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                            <option value="">Seleccione un curso</option>
                            {taughtCourses.map(course => <option key={course.courseID} value={course.courseID}>{course.name}</option>)}
                        </select>
                        {errors.courseID && <p className="text-danger text-xs mt-1">{errors.courseID.message}</p>}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to="/evaluations" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                        <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default EvaluationFormPage;