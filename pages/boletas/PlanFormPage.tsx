import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useParams } from 'react-router-dom';
import { Lapso, BOLETA_LEVELS } from '../../types';
import { useForm } from 'react-hook-form';
import { SpinnerIcon } from '../../components/icons';

type FormInputs = {
    name: string;
    level: string;
    lapsoId: number;
    isActive: boolean;
};

const PlanFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const isEditMode = Boolean(id);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(() => {
        if (user?.schoolId) {
            loadInitialData();
        }
    }, [user]);

    const loadInitialData = async () => {
        try {
            const lapsosData = await apiService.getLapsos(user!.schoolId);
            setLapsos(lapsosData);

            if (isEditMode && id) {
                // Fetch Plan details
                // Note: We need a getPlanById endpoint or fetch from list. 
                // Since apiService.getBoletaPlans returns all for school/lapso, we can use that if we don't have a specific ID endpoint yet.
                // Or assuming we added a getPlan endpoint (which backend showed, let's verify if we added to service).
                // Looking at user request, backend controller has GetPlan(id). I should check if I added it to apiService.
                // I forgot to add getBoletaPlanById to apiService. I will add it shortly. 
                // For now, I'll assumme I'll add it.
                const plan = await apiService.getBoletaPlanById(Number(id)); // Need to implement this in service
                setValue('name', plan.name);
                setValue('level', plan.level);
                setValue('lapsoId', plan.lapsoId);
                setValue('isActive', plan.isActive);
            }
        } catch (e) {
            console.error("Error loading data", e);
        } finally {
            setPageLoading(false);
        }
    };

    const onSubmit = async (data: FormInputs) => {
        setLoading(true);
        try {
            if (isEditMode && id) {
                await apiService.updateBoletaPlan(Number(id), {
                    name: data.name,
                    level: data.level,
                    isActive: data.isActive
                });
            } else {
                await apiService.createBoletaPlan({
                    name: data.name,
                    level: data.level,
                    schoolId: user!.schoolId,
                    lapsoId: Number(data.lapsoId)
                });
            }
            navigate('/boletas/planes');
        } catch (e) {
            console.error("Error saving plan", e);
            alert("Error guardando el plan.");
        } finally {
            setLoading(false);
        }
    };

    if (pageLoading) return <div className="p-8 flex justify-center"><SpinnerIcon /></div>;

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow mt-10">
            <h1 className="text-2xl font-bold mb-6">{isEditMode ? 'Editar Plan' : 'Nuevo Plan de Evaluación'}</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Plan</label>
                    <input
                        {...register('name', { required: 'El nombre es requerido' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        placeholder="Ej. Plan Primer Grado 2024-2025"
                    />
                    {errors.name && <span className="text-red-500 text-sm">{errors.name.message}</span>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Nivel</label>
                    <select
                        {...register('level', { required: 'El nivel es requerido' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="">Seleccione...</option>
                        {BOLETA_LEVELS.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                    {errors.level && <span className="text-red-500 text-sm">{errors.level.message}</span>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Lapso</label>
                    <select
                        {...register('lapsoId', { required: 'El lapso es requerido' })}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        disabled={isEditMode} // Usually better not to change lapso/school on edit to avoid data integrity issues
                    >
                        <option value="">Seleccione...</option>
                        {lapsos.map(l => (
                            <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>
                        ))}
                    </select>
                    {errors.lapsoId && <span className="text-red-500 text-sm">{errors.lapsoId.message}</span>}
                </div>

                <div className="flex items-center">
                    <input
                        type="checkbox"
                        {...register('isActive')}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">Plan Activo</label>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/boletas/planes')}
                        className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
                    >
                        {loading && <SpinnerIcon className="mr-2" />}
                        {isEditMode ? 'Actualizar' : 'Crear'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PlanFormPage;
