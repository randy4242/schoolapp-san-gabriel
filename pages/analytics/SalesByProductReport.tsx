import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { SalesByProductResponse } from '../../types';
import { exportToCsv } from '../../lib/exportUtils';
import { theme } from '../../styles/theme';
declare var Chart: any;

const SalesByProductReport: React.FC = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0],
        top: 10
    });
    const [data, setData] = useState<SalesByProductResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchData = useCallback(async () => {
        if (!user || !filters.from || !filters.to) return;
        setLoading(true);
        setError('');
        try {
            const response = await apiService.getSalesByProductReport(user.schoolId, filters.from, filters.to, filters.top);
            setData(response);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el reporte de ventas.');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [user, filters]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    useEffect(() => {
        if (chartCanvasRef.current && data) {
            if (chartRef.current) chartRef.current.destroy();
            const ctx = chartCanvasRef.current.getContext('2d');
            if (ctx) {
                chartRef.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(d => d.productName),
                        datasets: [{
                            label: 'Total de Ventas',
                            data: data.map(d => d.totalSales),
                            backgroundColor: theme.colors.primary,
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true } }
                    }
                });
            }
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); chartRef.current = null; };
    }, [data]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleExportCsv = () => {
        if (data) exportToCsv(`sales_by_product_${filters.from}_${filters.to}.csv`, data);
    };
    
    const handlePrint = () => window.print();

    return (
        <div className="space-y-4">
             <style>{`@media print { body * { visibility: hidden; } #print-section, #print-section * { visibility: visible; } #print-section { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
             <div className="no-print flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="p-2 border rounded"/>
                <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="p-2 border rounded"/>
                <select name="top" value={filters.top} onChange={handleFilterChange} className="p-2 border rounded">
                    {[5, 10, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                </select>
                <button onClick={handleExportCsv} className="bg-success text-white py-2 px-4 rounded">Exportar a Excel</button>
                <button onClick={handlePrint} className="bg-info text-white py-2 px-4 rounded">Imprimir / PDF</button>
            </div>

            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}

            {data && (
                <div id="print-section">
                    <h2 className="text-xl font-bold mb-4">Ventas por Producto ({filters.from} al {filters.to})</h2>
                    <div className="bg-surface p-4 rounded-lg shadow-md border mb-6 h-96">
                        <canvas ref={chartCanvasRef}></canvas>
                    </div>
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y">
                            <thead>
                                <tr>
                                    {['Producto', 'Cantidad Vendida', 'Total de Ventas', 'Margen'].map(h => 
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(row => (
                                    <tr key={row.productName}>
                                        <td className="px-4 py-2">{row.productName}</td>
                                        <td className="px-4 py-2 text-center">{row.quantitySold}</td>
                                        <td className="px-4 py-2 text-right">{(row.totalSales ?? 0).toFixed(2)}</td>
                                        <td className="px-4 py-2 text-right">{(row.margin ?? 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesByProductReport;