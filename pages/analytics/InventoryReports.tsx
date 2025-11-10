import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { InventorySnapshotResponse, InventoryKardexResponse, Product } from '../../types';
import { exportToCsv } from '../../lib/exportUtils';

const InventorySnapshot: React.FC = () => {
    const { user } = useAuth();
    const [data, setData] = useState<InventorySnapshotResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            apiService.getInventorySnapshot(user.schoolId)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [user]);

    const totals = useMemo(() => {
        if (!data) return { totalCost: 0, totalSale: 0 };
        return data.reduce((acc, item) => {
            acc.totalCost += item.totalCostValue ?? 0;
            acc.totalSale += item.totalSaleValue ?? 0;
            return acc;
        }, { totalCost: 0, totalSale: 0 });
    }, [data]);
    
    if (loading) return <p>Cargando snapshot...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded">{error}</p>;

    return (
        <div className="space-y-4">
             <div className="flex justify-end gap-2">
                <button onClick={() => exportToCsv('inventory_snapshot.csv', data || [])} className="bg-success text-white py-2 px-4 rounded text-sm">Exportar a Excel</button>
                <button onClick={() => window.print()} className="bg-info text-white py-2 px-4 rounded text-sm">Imprimir / PDF</button>
            </div>
            <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y">
                    {/* ... table header ... */}
                    <thead>
                        <tr>
                            {['Producto', 'SKU', 'Cantidad', 'Costo Unit.', 'Precio Venta', 'Valor Costo', 'Valor Venta'].map(h =>
                                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {data?.map(item => (
                            <tr key={item.sku}>
                                <td className="px-4 py-2">{item.productName}</td>
                                <td className="px-4 py-2">{item.sku}</td>
                                <td className="px-4 py-2 text-center">{item.quantity}</td>
                                <td className="px-4 py-2 text-right">{(item.unitCost ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right">{(item.salePrice ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right">{(item.totalCostValue ?? 0).toFixed(2)}</td>
                                <td className="px-4 py-2 text-right">{(item.totalSaleValue ?? 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                     <tfoot className="font-bold border-t-2">
                        <tr>
                            <td colSpan={5} className="px-4 py-2 text-right">Totales:</td>
                            <td className="px-4 py-2 text-right">{(totals.totalCost ?? 0).toFixed(2)}</td>
                            <td className="px-4 py-2 text-right">{(totals.totalSale ?? 0).toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const InventoryKardex: React.FC = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [filters, setFilters] = useState({
        productId: '',
        from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<InventoryKardexResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if(user) apiService.getProductsWithAudiences(user.schoolId).then(p => setProducts(p.map(pd => pd.product)));
    }, [user]);

    const fetchData = useCallback(() => {
        if (user && filters.productId && filters.from && filters.to) {
            setLoading(true);
            setError('');
            apiService.getInventoryKardex(user.schoolId, Number(filters.productId), filters.from, filters.to)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [user, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    return (
        <div className="space-y-4">
             <div className="flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                <select name="productId" value={filters.productId} onChange={e => setFilters(p => ({...p, productId: e.target.value}))} className="p-2 border rounded">
                    <option value="">Seleccione un producto</option>
                    {products.map(p => <option key={p.productID} value={p.productID}>{p.name}</option>)}
                </select>
                <input type="date" name="from" value={filters.from} onChange={e => setFilters(p => ({...p, from: e.target.value}))} className="p-2 border rounded"/>
                <input type="date" name="to" value={filters.to} onChange={e => setFilters(p => ({...p, to: e.target.value}))} className="p-2 border rounded"/>
                 <button onClick={() => exportToCsv(`kardex_${filters.productId}.csv`, data || [])} className="bg-success text-white py-2 px-4 rounded text-sm">Exportar a Excel</button>
            </div>
            {loading && <p>Cargando kardex...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            {data && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead>
                            <tr>
                                {['Fecha', 'Tipo', 'Cantidad', 'Documento', 'Saldo'].map(h =>
                                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, i) => (
                                <tr key={i}>
                                    <td className="px-4 py-2">{new Date(item.date).toLocaleString()}</td>
                                    <td className="px-4 py-2">{item.movementType}</td>
                                    <td className="px-4 py-2 text-right">{item.quantity}</td>
                                    <td className="px-4 py-2">{item.relatedDocument}</td>
                                    <td className="px-4 py-2 text-right font-bold">{item.resultingBalance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const InventoryReports: React.FC = () => {
    const [activeView, setActiveView] = useState<'snapshot' | 'kardex'>('snapshot');

    return (
        <div className="space-y-4">
            <div className="flex border-b">
                <button onClick={() => setActiveView('snapshot')} className={`py-2 px-4 ${activeView === 'snapshot' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Snapshot</button>
                <button onClick={() => setActiveView('kardex')} className={`py-2 px-4 ${activeView === 'kardex' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Kardex por Producto</button>
            </div>
            {activeView === 'snapshot' && <InventorySnapshot />}
            {activeView === 'kardex' && <InventoryKardex />}
        </div>
    );
};

export default InventoryReports;