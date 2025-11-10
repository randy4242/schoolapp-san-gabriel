import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Teacher } from '../../types';

type FormInputs = {
    name: string;
    description: string;
    dayOfWeek: number;
    userID: number | null;
};

const ExtracurricularFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditMode = Boolean(id);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [teachers, setTeachers] = useState<Teacher[]>([]);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getTeachers(user.schoolId)
                .then(setTeachers)
                .catch(() => setError('No se pudieron cargar los profesores.'));

            if (isEditMode) {
                apiService.getExtracurricularById(parseInt(id!), user.schoolId)
                    .then(activityData => {
                        setValue('name', activityData.name);
                        setValue('description', activityData.description);
                        setValue('dayOfWeek', activityData.dayOfWeek);
                        setValue('userID', activityData.userID);
                    })
                    .catch(() => setError('No se pudo cargar la actividad.'))
                    .finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        }
    }, [id, isEditMode, setValue, user?.schoolId]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }

        setError('');
        setLoading(true);
        
        const payload = {
            ...data,
            schoolID: user.schoolId,
            userID: data.userID ? Number(data.userID) : null
        };

        try {
            if (isEditMode) {
                await apiService.updateExtracurricular(parseInt(id!), user.schoolId, payload);
            } else {
                await apiService.createExtracurricular(payload);
            }
            navigate('/extracurriculars');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar la actividad.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar Actividad' : 'Crear Actividad'} Extracurricular</h1>

            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}

            {loading && isEditMode ? <p>Cargando datos...</p> : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Nombre</label>
                        <input {...register('name', { required: 'El nombre es obligatorio' })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Descripción</label>
                        <textarea {...register('description', { required: 'La descripción es obligatoria' })} rows={3} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"></textarea>
                        {errors.description && <p className="text-danger text-xs mt-1">{errors.description.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Día de la semana</label>
                        <select {...register('dayOfWeek', { required: 'Debe seleccionar un día', valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                            <option value="">-- Seleccione un día --</option>
                            <option value="1">Lunes</option>
                            <option value="2">Martes</option>
                            <option value="3">Miércoles</option>
                            <option value="4">Jueves</option>
                            <option value="5">Viernes</option>
                        </select>
                        {errors.dayOfWeek && <p className="text-danger text-xs mt-1">{errors.dayOfWeek.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Profesor asignado</label>
                        <select {...register('userID', { setValueAs: v => v ? parseInt(v) : null })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                            <option value="">-- No asignar --</option>
                            {teachers.map(teacher => <option key={teacher.userID} value={teacher.userID}>{teacher.userName}</option>)}
                        </select>
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to="/extracurriculars" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                        <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default ExtracurricularFormPage;