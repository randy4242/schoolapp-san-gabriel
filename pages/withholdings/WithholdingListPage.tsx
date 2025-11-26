import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { WithholdingListItem, WithholdingType } from '../../types';
import { PercentageIcon } from '../../components/icons';
import Modal from '../../components/Modal';
import WithholdingDetailModal from './WithholdingDetailModal';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const WithholdingListPage: React.FC = () => {
    const [data, setData] = useState<WithholdingListItem[]>([]);
    const [types, setTypes] = useState<WithholdingType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const [filters, setFilters] = useState({
        year: new Date().getFullYear(),
        month: 0,
        type: '',
        subjectRif: ''
    });

    const [viewingId, setViewingId] = useState<number | null>(null);
    const [annullingId, setAnnullingId] = useState<number | null>(null);

    const debouncedRif = useDebounce(filters.subjectRif, 500);

    const fetchData = useCallback(async () => {
        if (user?.schoolId) {
            setLoading(true);
            setError('');
            try {
                const [typesData, withholdingsData] = await Promise.all([
                    apiService.getWithholdingTypes(),
                    apiService.getWithholdings({
                        schoolId: user.schoolId,
                        year: filters.year,
                        month: filters.month > 0 ? filters.month : undefined,
                        type: filters.type || undefined,
                        subjectRif: debouncedRif || undefined
                    })
                ]);
                setTypes(typesData);
                const typeMap = new Map(typesData.map(t => [t.withholdingTypeID, t.name]));
                setData(withholdingsData.map(w => ({...w, typeName: typeMap.get(w.withholdingTypeID) })));
            } catch (err: any) {
                setError(err.message || 'Error al cargar las retenciones.');
            } finally {
                setLoading(false);
            }
        }
    }, [user, filters.year, filters.month, filters.type, debouncedRif]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAnnul = async () => {
        if (!annullingId) return;
        try {
            await apiService.annulWithholding(annullingId);
            setAnnullingId(null);
            fetchData(); // Refresh list
        } catch (err: any) {
            setError(err.message || 'Error al anular la retención.');
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('es-ES');
    const formatMoney = (n: number) => n.toLocaleString('es-VE', { minimumFractionDigits: 2 });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center"><PercentageIcon /><span className="ml-2">Retenciones</span></h1>
                <Link to="/withholdings/create" className="bg-primary text-white py-2 px-4 rounded hover:bg-opacity-80">Generar Retención</Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-background rounded-lg border">
                <input name="subjectRif" type="text" placeholder="Buscar por RIF..." value={filters.subjectRif} onChange={handleFilterChange} className="w-full p-2 border rounded" />
                <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full p-2 border rounded">
                    <option value="">Todos los Tipos</option>
                    {types.map(t => <option key={t.withholdingTypeID} value={t.name}>{t.name}</option>)}
                </select>
                <select name="year" value={filters.year} onChange={handleFilterChange} className="w-full p-2 border rounded">
                    {[...Array(5)].map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                </select>
                <select name="month" value={filters.month} onChange={handleFilterChange} className="w-full p-2 border rounded">
                    <option value="0">Todos los Meses</option>
                    {[...Array(12)].map((_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>)}
                </select>
            </div>

            {loading ? <p>Cargando...</p> : error ? <p className="text-danger bg-danger-light p-3 rounded">{error}</p> : (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead className="bg-header text-white">
                            <tr>
                                {['ID', 'Fecha', 'Tipo', 'Proveedor', 'Base', 'Retenido', 'Estado', 'Acciones'].map(h => 
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map(w => (
                                <tr key={w.withholdingID} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">{w.withholdingID}</td>
                                    <td className="px-4 py-2">{formatDate(w.issueDate)}</td>
                                    <td className="px-4 py-2">{w.typeName}</td>
                                    <td className="px-4 py-2">{w.subjectName} ({w.subjectRifCedula})</td>
                                    <td className="px-4 py-2 text-right">{formatMoney(w.totalBase)}</td>
                                    <td className="px-4 py-2 text-right font-bold">{formatMoney(w.totalWithheld)}</td>
                                    <td className="px-4 py-2"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${w.status === 'Annulled' ? 'bg-danger-light text-danger-text' : 'bg-success-light text-success-text'}`}>{w.status}</span></td>
                                    <td className="px-4 py-2 space-x-2 whitespace-nowrap">
                                        <button onClick={() => setViewingId(w.withholdingID)} className="text-info hover:underline text-sm">Ver</button>
                                        {w.status === 'Active' && <button onClick={() => setAnnullingId(w.withholdingID)} className="text-danger hover:underline text-sm">Anular</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {viewingId && <WithholdingDetailModal withholdingId={viewingId} onClose={() => setViewingId(null)} />}
            
            <Modal isOpen={!!annullingId} onClose={() => setAnnullingId(null)} title="Confirmar Anulación">
                <p>¿Está seguro de anular la retención #{annullingId}? Esta acción no se puede deshacer.</p>
                <div className="flex justify-end gap-4 mt-4">
                    <button onClick={() => setAnnullingId(null)} className="bg-gray-200 py-2 px-4 rounded">Cancelar</button>
                    <button onClick={handleAnnul} className="bg-danger text-white py-2 px-4 rounded">Anular</button>
                </div>
            </Modal>
        </div>
    );
};

export default WithholdingListPage;
