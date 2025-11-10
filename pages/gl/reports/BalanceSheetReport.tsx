import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/apiService';
import { BalanceSheet } from '../../../types';
import { theme } from '../../../styles/theme';
declare var Chart: any;

const BalanceSheetReport: React.FC = () => {
    const { user } = useAuth();
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<BalanceSheet | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchData = useCallback(() => {
        if (!user) return;
        setLoading(true);
        setError('');
        apiService.getBalanceSheet(user.schoolId, asOf)
            .then(setData)
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [user, asOf]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (chartCanvasRef.current && data) {
            if (chartRef.current) chartRef.current.destroy();
            const ctx = chartCanvasRef.current.getContext('2d');
            if (ctx) {
                chartRef.current = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Activos', 'Pasivos', 'Patrimonio'],
                        datasets: [{
                            data: [data.assets, data.liabilities, data.equity],
                            backgroundColor: [theme.colors.info.DEFAULT, theme.colors.danger.DEFAULT, theme.colors.success.DEFAULT]
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                });
            }
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); chartRef.current = null; };
    }, [data]);

    const format = (n: number) => (n ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const balanceCheck = data ? data.assets - (data.liabilities + data.equity) : 0;
    
    return (
        <div className="space-y-4">
            <style>{`@media print { body * { visibility: hidden; } #print-section, #print-section * { visibility: visible; } #print-section { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none; } }`}</style>
            <div className="no-print flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                 <label>Fecha de Corte:</label>
                <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="p-2 border rounded"/>
                <button onClick={fetchData} className="bg-primary text-white py-2 px-4 rounded">Buscar</button>
                <button onClick={() => window.print()} className="bg-info text-white py-2 px-4 rounded">Imprimir / PDF</button>
            </div>

            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}

            {data && (
                <div id="print-section">
                    <h2 className="text-xl font-bold mb-4">Balance General al {asOf}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 text-center">
                        <KPICard title="Total Activos" value={format(data.assets)} color="blue" />
                        <KPICard title="Total Pasivos" value={format(data.liabilities)} color="red" />
                        <KPICard title="Total Patrimonio" value={format(data.equity)} color="green" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-surface p-4 rounded-lg shadow-md border space-y-2">
                             <h3 className="font-bold text-lg">Verificación de Balance</h3>
                             <div className="flex justify-between items-center"><span>Total Activos:</span> <span className="font-mono">{format(data.assets)}</span></div>
                             <div className="flex justify-between items-center"><span>Total Pasivos + Patrimonio:</span> <span className="font-mono">{format(data.liabilities + data.equity)}</span></div>
                             <div className={`flex justify-between items-center border-t pt-2 mt-2 font-bold ${Math.abs(balanceCheck) > 0.01 ? 'text-danger-text bg-danger-light p-2 rounded' : 'text-success-text'}`}>
                                <span>Descuadre:</span>
                                <span>{format(balanceCheck)}</span>
                            </div>
                        </div>
                        <div className="bg-surface p-4 rounded-lg shadow-md border h-80">
                            <canvas ref={chartCanvasRef}></canvas>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const KPICard: React.FC<{ title: string; value: string; color: 'blue' | 'red' | 'green' }> = ({ title, value, color }) => {
    const colors = {
        blue: 'bg-blue-100 text-blue-800',
        red: 'bg-red-100 text-red-800',
        green: 'bg-green-100 text-green-800'
    };
    return (
        <div className={`p-4 rounded ${colors[color]}`}>
            <div className="text-sm">{title}</div>
            <div className="text-3xl font-extrabold">{value}</div>
        </div>
    );
};

export default BalanceSheetReport;
