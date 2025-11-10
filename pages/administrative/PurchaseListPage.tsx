import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PaginatedPurchases } from '../../types';
import { ShoppingCartIcon } from '../../components/icons';
import PurchaseDetailModal from './PurchaseDetailModal';

const PurchaseListPage: React.FC = () => {
    const [data, setData] = useState<PaginatedPurchases | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [page, setPage] = useState(1);
    const [viewingPurchaseId, setViewingPurchaseId] = useState<number | null>(null);

    const fetchPurchases = useCallback(async () => {
        if (user?.schoolId) {
            setLoading(true);
            setError('');
            apiService.getPurchases(user.schoolId, { page })
                .then(setData)
                .catch(err => setError('No se pudieron cargar las compras.'))
                .finally(() => setLoading(false));
        }
    }, [user, page]);

    useEffect(() => {
        fetchPurchases();
    }, [fetchPurchases]);

    const handleAnnul = async (purchaseId: number) => {
        if (window.confirm('¿Está seguro de anular esta compra? Esta acción no se puede deshacer.')) {
            if (user?.schoolId) {
                try {
                    await apiService.annulPurchase(purchaseId, user.schoolId);
                    fetchPurchases();
                } catch (err: any) {
                    setError(err.message || 'Error al anular la compra.');
                }
            }
        }
    };
    
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');
    
    const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center">
                    <ShoppingCartIcon />
                    <span className="ml-2">Gestión de Compras</span>
                </h1>
                <Link to="/purchases/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80">
                    Registrar Compra
                </Link>
            </div>

            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {loading ? <p>Cargando...</p> : data && (
                <>
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-header">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">ID</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Proveedor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-on-primary uppercase">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-text-on-primary uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {data.items.map(p => (
                                    <tr key={p.purchaseID} className="hover:bg-background">
                                        <td className="px-4 py-2 whitespace-nowrap">{p.purchaseID}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{p.supplierName}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(p.fecha)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.status === 'Annulled' ? 'bg-danger-light text-danger-text' : 'bg-success-light text-success-text'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right font-semibold">{p.totalGeneral.toFixed(2)} {p.moneda}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center space-x-2">
                                            <button onClick={() => setViewingPurchaseId(p.purchaseID)} className="text-info hover:text-info-dark font-medium">Ver</button>
                                            {p.status !== 'Annulled' && (
                                                <button onClick={() => handleAnnul(p.purchaseID)} className="text-danger hover:text-danger-text font-medium">Anular</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-text-secondary">Página {data.page} de {totalPages}. Total: {data.total} compras.</span>
                        <div className="space-x-2">
                             <button onClick={() => setPage(p => p - 1)} disabled={data.page <= 1} className="py-1 px-3 border rounded disabled:opacity-50">Anterior</button>
                             <button onClick={() => setPage(p => p + 1)} disabled={data.page >= totalPages} className="py-1 px-3 border rounded disabled:opacity-50">Siguiente</button>
                        </div>
                    </div>
                </>
            )}
            {viewingPurchaseId && (
                <PurchaseDetailModal
                    purchaseId={viewingPurchaseId}
                    onClose={() => setViewingPurchaseId(null)}
                />
            )}
        </div>
    );
};

export default PurchaseListPage;
