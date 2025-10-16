import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';

type FormInputs = {
    nombre: string;
    fechaInicio: string;
    fechaFin: string;
};

const LapsoFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditMode = Boolean(id);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

    // Helper to format date for input type="date"
    const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    useEffect(() => {
        if (isEditMode && user?.schoolId) {
            setLoading(true);
            apiService.getLapsoById(parseInt(id!), user.schoolId)
                .then(data => {
                    setValue('nombre', data.nombre);
                    setValue('fechaInicio', formatDateForInput(data.fechaInicio));
                    setValue('fechaFin', formatDateForInput(data.fechaFin));
                })
                .catch(err => setError('No se pudo cargar el lapso.'))
                .finally(() => setLoading(false));
        }
    }, [id, isEditMode, setValue, user?.schoolId]);

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }
        
        setError('');
        setLoading(true);
        
        try {
            if (isEditMode) {
                // FIX: The `schoolID` property is not part of the `Lapso` type and should not be in the update payload.
                // It is passed as a separate parameter to the `updateLapso` method.
                await apiService.updateLapso(parseInt(id!), user.schoolId, {
                    ...data,
                    lapsoID: parseInt(id!)
                });
            } else {
                await apiService.createLapso({
                    ...data,
                    schoolID: user.schoolId,
                });
            }
            navigate('/lapsos');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar el lapso.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">{isEditMode ? 'Editar Lapso' : 'Crear Lapso'}</h1>
            
            {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
            
            {loading && isEditMode ? <p>Cargando datos...</p> : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Nombre</label>
                        <input {...register('nombre', { required: 'El nombre es requerido' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.nombre && <p className="text-danger text-xs mt-1">{errors.nombre.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Fecha de Inicio</label>
                        <input type="date" {...register('fechaInicio', { required: 'La fecha de inicio es requerida' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.fechaInicio && <p className="text-danger text-xs mt-1">{errors.fechaInicio.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary">Fecha de Fin</label>
                        <input type="date" {...register('fechaFin', { required: 'La fecha de fin es requerida' })} className="mt-1 block w-full px-3 py-2 bg-login-inputBg text-text-on-primary border border-login-inputBorder rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
                        {errors.fechaFin && <p className="text-danger text-xs mt-1">{errors.fechaFin.message}</p>}
                    </div>

                    <div className="flex justify-end space-x-4 pt-4">
                        <Link to="/lapsos" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
                        <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
                            {loading ? 'Guardando...' : 'Guardar'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default LapsoFormPage;