import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/apiService';
import { IncomeStatement } from '../../../types';
import { theme } from '../../../styles/theme';
declare var Chart: any;

const IncomeStatementReport: React.FC = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });
    const [data, setData] = useState<IncomeStatement | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchData = useCallback(() => {
        if (!user || !filters.from || !filters.to) return;
        setLoading(true);
        setError('');
        apiService.getIncomeStatement(user.schoolId, filters.from, filters.to)
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
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
                        labels: ['Resultados'],
                        datasets: [
                            { label: 'Ingresos', data: [data.revenue], backgroundColor: theme.colors.success.DEFAULT },
                            { label: 'Costos (COGS)', data: [data.cogs], backgroundColor: theme.colors.warning.DEFAULT },
                            { label: 'Gastos', data: [data.expenses], backgroundColor: theme.colors.danger.DEFAULT }
                        ]
                    },
                    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
                });
            }
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); chartRef.current = null; };
    }, [data]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const format = (n: number) => (n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
        <div className="space-y-4">
            <style>{`@media print { body * { visibility: hidden; } #print-section, #print-section * { visibility: visible; } #print-section { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
            <div className="no-print flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                <input type="date" name="from" value={filters.from} onChange={handleFilterChange} className="p-2 border rounded"/>
                <input type="date" name="to" value={filters.to} onChange={handleFilterChange} className="p-2 border rounded"/>
                <button onClick={fetchData} className="bg-primary text-white py-2 px-4 rounded">Buscar</button>
                <button onClick={() => window.print()} className="bg-info text-white py-2 px-4 rounded">Imprimir / PDF</button>
            </div>

            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {data && (
                <div id="print-section">
                    <h2 className="text-xl font-bold mb-4">Estado de Resultados ({filters.from} al {filters.to})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 text-center">
                        <KPICard title="Ingresos" value={format(data.revenue)} />
                        <KPICard title="Costos (COGS)" value={format(data.cogs)} />
                        <KPICard title="Utilidad Bruta" value={format(data.grossProfit)} isBold={true}/>
                        <KPICard title="Gastos" value={format(data.expenses)} />
                        <KPICard title="Utilidad Neta" value={format(data.netIncome)} isBold={true} color={data.netIncome >= 0 ? 'green' : 'red'}/>
                    </div>
                    <div className="bg-surface p-4 rounded-lg shadow-md border h-80">
                        <canvas ref={chartCanvasRef}></canvas>
                    </div>
                </div>
            )}
        </div>
    );
};

const KPICard: React.FC<{ title: string; value: string; isBold?: boolean; color?: 'green' | 'red' }> = ({ title, value, isBold, color }) => {
    let valueColor = 'text-gray-800';
    if (color === 'green') valueColor = 'text-green-600';
    if (color === 'red') valueColor = 'text-red-600';
    return (
        <div className="p-4 bg-gray-100 rounded">
            <div className="text-sm">{title}</div>
            <div className={`text-2xl ${isBold ? 'font-extrabold' : 'font-bold'} ${valueColor}`}>{value}</div>
        </div>
    );
}

export default IncomeStatementReport;
