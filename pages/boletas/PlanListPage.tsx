import React, { useEffect, useState } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { BoletaEvaluationPlan, Lapso } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { SpinnerIcon, PlusIcon, EditIcon, TrashIcon } from '../../components/icons';
import Modal from '../../components/Modal';

const PlanListPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [plans, setPlans] = useState<BoletaEvaluationPlan[]>([]);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLapso, setSelectedLapso] = useState<number | string>('');
    const [error, setError] = useState('');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<number | null>(null);

    useEffect(() => {
        if (user?.schoolId) {
            loadInitialData();
        }
    }, [user]);

    useEffect(() => {
        if (user?.schoolId) {
            loadPlans();
        }
    }, [selectedLapso]);

    const loadInitialData = async () => {
        try {
            const lapsosData = await apiService.getLapsos(user!.schoolId);
            setLapsos(lapsosData);
            if (lapsosData.length > 0) {
                // Default to current lapso if possible, or the first one
                const active = lapsosData.find(l => l.isCurrent);
                setSelectedLapso(active ? active.lapsoID : lapsosData[0].lapsoID);
            }
        } catch (e) {
            console.error("Error loading initial data", e);
            setError("Error cargando lapsos.");
        }
    };

    const loadPlans = async () => {
        setLoading(true);
        try {
            const plansData = await apiService.getBoletaPlans(user!.schoolId, selectedLapso ? Number(selectedLapso) : undefined);
            setPlans(plansData);
        } catch (e) {
            console.error("Error loading plans", e);
            setError("Error cargando planes de evaluación.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await apiService.deleteBoletaPlan(planToDelete);
            setPlanToDelete(null);
            setDeleteModalOpen(false);
            loadPlans();
        } catch (e) {
            console.error("Error deleting plan", e);
            alert("No se pudo eliminar el plan.");
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Planes de Evaluación (Boletas)</h1>
                <Link to="/boletas/planes/nuevo" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
                    <PlusIcon /> Nuevo Plan
                </Link>
            </div>

            {error && <div className="bg-red-100 text-red-700 p-4 rounded mb-4">{error}</div>}

            <div className="mb-6 flex gap-4">
                <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por Lapso</label>
                    <select
                        className="w-full border rounded p-2"
                        value={selectedLapso}
                        onChange={(e) => setSelectedLapso(e.target.value)}
                    >
                        <option value="">Todos</option>
                        {lapsos.map(l => (
                            <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><SpinnerIcon /></div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nivel</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {plans.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay planes creados para este filtro.</td>
                                </tr>
                            ) : (
                                plans.map(plan => (
                                    <tr key={plan.planId}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{plan.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{plan.level}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {plan.isActive ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/boletas/planes/${plan.planId}/indicadores`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                                Indicadores
                                            </Link>
                                            <Link to={`/boletas/planes/editar/${plan.planId}`} className="text-blue-600 hover:text-blue-900 mr-4">
                                                <EditIcon />
                                            </Link>
                                            <button
                                                onClick={() => { setPlanToDelete(plan.planId); setDeleteModalOpen(true); }}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Eliminar Plan">
                <div className="p-4">
                    <p>¿Estás seguro de eliminar este plan? Se perderán todos sus indicadores asociados.</p>
                    <div className="mt-4 flex justify-end gap-2">
                        <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 border rounded">Cancelar</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">Eliminar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PlanListPage;
