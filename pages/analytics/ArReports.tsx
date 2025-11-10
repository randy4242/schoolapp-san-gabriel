import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { ArAgingSummaryResponse, ArAgingByCustomerResponse } from '../../types';
import { exportToCsv } from '../../lib/exportUtils';
import { theme } from '../../styles/theme';
declare var Chart: any;

const ArAgingSummary: React.FC = () => {
    const { user } = useAuth();
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<ArAgingSummaryResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const fetchData = useCallback(() => {
        if(user) {
            setLoading(true);
            setError('');
            apiService.getArAgingSummary(user.schoolId, asOf)
                .then(setData)
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
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
                    type: 'pie',
                    data: {
                        labels: ['0-30 días', '31-60 días', '61-90 días', '90+ días'],
                        datasets: [{
                            data: [data.bucket_0_30, data.bucket_31_60, data.bucket_61_90, data.bucket_90p],
                            backgroundColor: [theme.colors.success.DEFAULT, theme.colors.info.DEFAULT, theme.colors.warning.DEFAULT, theme.colors.danger.DEFAULT]
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
        return () => { if (chartRef.current) chartRef.current.destroy(); chartRef.current = null; };
    }, [data]);
    
    if (loading) return <p>Cargando resumen...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded">{error}</p>;

    return (
        <div className="space-y-4">
             <div className="flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                 <label>Fecha de Corte:</label>
                <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="p-2 border rounded"/>
                <button onClick={() => window.print()} className="bg-info text-white py-2 px-4 rounded text-sm">Imprimir / PDF</button>
            </div>
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-lg shadow-md border h-80">
                         <canvas ref={chartCanvasRef}></canvas>
                    </div>
                     <div className="bg-surface p-4 rounded-lg shadow-md border space-y-2">
                        <div className="flex justify-between text-lg"><span className="font-bold">Total Deuda:</span><span>{(data.total ?? 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-success-text">0-30 días:</span><span>{(data.bucket_0_30 ?? 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-info-text">31-60 días:</span><span>{(data.bucket_31_60 ?? 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-warning-dark">61-90 días:</span><span>{(data.bucket_61_90 ?? 0).toFixed(2)}</span></div>
                        <div className="flex justify-between"><span className="text-danger-text">90+ días:</span><span>{(data.bucket_90p ?? 0).toFixed(2)}</span></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ArByCustomer: React.FC = () => {
    const { user } = useAuth();
    const [asOf, setAsOf] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<ArAgingByCustomerResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchData = useCallback(() => {
        if(user) {
            setLoading(true);
            setError('');
            apiService.getArAgingByCustomer(user.schoolId, asOf)
                .then(res => setData(res.sort((a,b) => (b.total ?? 0) - (a.total ?? 0))))
                .catch(err => setError(err.message))
                .finally(() => setLoading(false));
        }
    }, [user, asOf]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <p>Cargando detalle...</p>;
    if (error) return <p className="text-danger bg-danger-light p-3 rounded">{error}</p>;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                <label>Fecha de Corte:</label>
                <input type="date" value={asOf} onChange={e => setAsOf(e.target.value)} className="p-2 border rounded"/>
                <button onClick={() => exportToCsv(`ar_by_customer_${asOf}.csv`, data || [])} className="bg-success text-white py-2 px-4 rounded text-sm">Exportar a Excel</button>
            </div>
            {data && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y">
                        <thead><tr>{['Cliente', '0-30', '31-60', '61-90', '90+', 'Total'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>)}</tr></thead>
                        <tbody>
                            {data.map(row => (
                                <tr key={row.customerName}>
                                    <td className="px-4 py-2">{row.customerName}</td>
                                    <td className="px-4 py-2 text-right">{(row.bucket_0_30 ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">{(row.bucket_31_60 ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">{(row.bucket_61_90 ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right">{(row.bucket_90p ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2 text-right font-bold">{(row.total ?? 0).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};


const ArReports: React.FC = () => {
    const [activeView, setActiveView] = useState<'summary' | 'byCustomer'>('summary');

    return (
        <div className="space-y-4">
            <div className="flex border-b">
                <button onClick={() => setActiveView('summary')} className={`py-2 px-4 ${activeView === 'summary' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Resumen (Aging)</button>
                <button onClick={() => setActiveView('byCustomer')} className={`py-2 px-4 ${activeView === 'byCustomer' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`}>Detalle por Cliente</button>
            </div>
            {activeView === 'summary' && <ArAgingSummary />}
            {activeView === 'byCustomer' && <ArByCustomer />}
        </div>
    );
};

export default ArReports;