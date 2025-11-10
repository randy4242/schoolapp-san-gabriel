import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { PaginatedInvoices } from '../../types';
import { ClipboardListIcon } from '../../components/icons';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

const InvoicesListPage: React.FC = () => {
    const [data, setData] = useState<PaginatedInvoices | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const [filters, setFilters] = useState({
        status: '',
        from: '',
        to: '',
        q: '',
        page: 1,
        pageSize: 20
    });

    const debouncedSearchTerm = useDebounce(filters.q, 500);

    const fetchInvoices = useCallback(async () => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getInvoices(user.schoolId, { ...filters, q: debouncedSearchTerm })
                .then(setData)
                .catch(err => setError('No se pudieron cargar las facturas.'))
                .finally(() => setLoading(false));
        }
    }, [user, filters.status, filters.from, filters.to, filters.page, filters.pageSize, debouncedSearchTerm]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({ ...prev, page: newPage }));
    };
    
    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES');
    
    const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary flex items-center">
                    <ClipboardListIcon />
                    <span className="ml-2">Cuentas Generales (Facturas)</span>
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-background rounded-lg border">
                 <input
                    name="q"
                    type="text"
                    placeholder="Buscar..."
                    value={filters.q}
                    onChange={handleFilterChange}
                    className="w-full p-2 border border-border rounded"
                />
                 <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 border border-border rounded">
                    <option value="">Todos los estados</option>
                    <option value="Issued">Emitida</option>
                    <option value="Paid">Pagada</option>
                    <option value="Annulled">Anulada</option>
                    <option value="Draft">Borrador</option>
                </select>
                <input name="from" type="date" value={filters.from} onChange={handleFilterChange} className="w-full p-2 border border-border rounded" />
                <input name="to" type="date" value={filters.to} onChange={handleFilterChange} className="w-full p-2 border border-border rounded" />
            </div>

            {loading && <p>Cargando...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {!loading && data && (
                <>
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                             <thead className="bg-header">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">N° Factura</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-text-on-primary uppercase">Total</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-text-on-primary uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {data.items.map(inv => (
                                    <tr key={inv.invoiceID} className="hover:bg-background">
                                        <td className="px-4 py-2 whitespace-nowrap">{inv.numeroFactura}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{inv.clienteNombre}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{formatDate(inv.fechaEmision)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{inv.status}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-right font-semibold">{inv.totalGeneral.toFixed(2)}</td>
                                        <td className="px-4 py-2 whitespace-nowrap text-center">
                                            <Link to={`/invoices/print/${inv.invoiceID}`} className="text-info hover:text-info-dark font-medium">Ver</Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-text-secondary">Página {data.page} de {totalPages}. Total: {data.total} facturas.</span>
                        <div className="space-x-2">
                             <button onClick={() => handlePageChange(data.page - 1)} disabled={data.page <= 1} className="py-1 px-3 border rounded disabled:opacity-50">Anterior</button>
                             <button onClick={() => handlePageChange(data.page + 1)} disabled={data.page >= totalPages} className="py-1 px-3 border rounded disabled:opacity-50">Siguiente</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default InvoicesListPage;
