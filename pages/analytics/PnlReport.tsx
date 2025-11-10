import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { PnlReportResponse } from '../../types';
import { exportToCsv } from '../../lib/exportUtils';
import { theme } from '../../styles/theme';
declare var Chart: any;

const PnlReport: React.FC = () => {
    const { user } = useAuth();
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState<PnlReportResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const response = await apiService.getPnlReport(user.schoolId, year);
            setData(response);
        } catch (err: any) {
            setError(err.message || 'Error al cargar el reporte de P&L.');
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [user, year]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (chartCanvasRef.current && data) {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            const ctx = chartCanvasRef.current.getContext('2d');
            if (ctx) {
                 const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
                 chartRef.current = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.map(d => monthNames[d.month - 1]),
                        datasets: [{
                            label: 'Utilidad Neta',
                            data: data.map(d => d.netProfit),
                            backgroundColor: data.map(d => (d.netProfit ?? 0) >= 0 ? theme.colors.success.DEFAULT : theme.colors.danger.DEFAULT),
                            borderColor: data.map(d => (d.netProfit ?? 0) >= 0 ? theme.colors.success.DEFAULT : theme.colors.danger.DEFAULT),
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            }
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data]);

    const handleExportCsv = () => {
        if (data) {
            exportToCsv(`pnl_${year}.csv`, data);
        }
    };
    
    const handlePrint = () => window.print();

    const totals = React.useMemo(() => {
        if (!data) return { income: 0, cogs: 0, expenses: 0, netProfit: 0 };
        return data.reduce((acc, row) => {
            acc.income += row.income ?? 0;
            acc.cogs += row.cogs ?? 0;
            acc.expenses += row.expenses ?? 0;
            acc.netProfit += row.netProfit ?? 0;
            return acc;
        }, { income: 0, cogs: 0, expenses: 0, netProfit: 0 });
    }, [data]);

    return (
        <div className="space-y-4">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-section, #print-section * { visibility: visible; }
                    #print-section { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none; }
                }
            `}</style>

            <div className="no-print flex flex-wrap gap-4 items-center p-4 bg-background rounded-lg border">
                <select value={year} onChange={e => setYear(Number(e.target.value))} className="p-2 border rounded">
                    {[...Array(5)].map((_, i) => <option key={i} value={new Date().getFullYear() - i}>{new Date().getFullYear() - i}</option>)}
                </select>
                <button onClick={handleExportCsv} className="bg-success text-white py-2 px-4 rounded">Exportar a Excel</button>
                <button onClick={handlePrint} className="bg-info text-white py-2 px-4 rounded">Imprimir / PDF</button>
            </div>

            {loading && <p>Cargando reporte...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {data && (
                <div id="print-section" ref={reportRef}>
                    <h2 className="text-xl font-bold mb-4">Reporte de Pérdidas y Ganancias - {year}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                        <div className="p-4 bg-blue-100 rounded">
                            <div className="text-sm">Ingresos Totales</div>
                            <div className="text-2xl font-bold text-blue-800">{(totals.income ?? 0).toFixed(2)}</div>
                        </div>
                        <div className="p-4 bg-orange-100 rounded">
                            <div className="text-sm">Costos y Gastos</div>
                            <div className="text-2xl font-bold text-orange-800">{((totals.cogs ?? 0) + (totals.expenses ?? 0)).toFixed(2)}</div>
                        </div>
                        <div className="p-4 bg-green-100 rounded">
                            <div className="text-sm">Utilidad Neta</div>
                            <div className="text-2xl font-bold text-green-800">{(totals.netProfit ?? 0).toFixed(2)}</div>
                        </div>
                        <div className="p-4 bg-purple-100 rounded">
                            <div className="text-sm">Rentabilidad</div>
                            <div className="text-2xl font-bold text-purple-800">{(totals.income ?? 0) > 0 ? (((totals.netProfit ?? 0) / (totals.income || 1)) * 100).toFixed(1) : 0}%</div>
                        </div>
                    </div>
                    
                    <div className="bg-surface p-4 rounded-lg shadow-md border mb-6 h-80">
                        <canvas ref={chartCanvasRef}></canvas>
                    </div>

                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y">
                            <thead>
                                <tr>
                                    {['Mes', 'Ingresos', 'Costos', 'Gastos', 'Utilidad Neta'].map(h => 
                                        <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase">{h}</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(row => (
                                    <tr key={row.month}>
                                        <td className="px-4 py-2">{new Date(row.year, row.month - 1).toLocaleString('es-ES', { month: 'long' })}</td>
                                        <td className="px-4 py-2">{(row.income ?? 0).toFixed(2)}</td>
                                        <td className="px-4 py-2">{(row.cogs ?? 0).toFixed(2)}</td>
                                        <td className="px-4 py-2">{(row.expenses ?? 0).toFixed(2)}</td>
                                        <td className={`px-4 py-2 font-bold ${(row.netProfit ?? 0) >= 0 ? 'text-success-text' : 'text-danger-text'}`}>{(row.netProfit ?? 0).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="font-bold border-t-2">
                                <tr>
                                    <td className="px-4 py-2">Total Anual</td>
                                    <td className="px-4 py-2">{(totals.income ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2">{(totals.cogs ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2">{(totals.expenses ?? 0).toFixed(2)}</td>
                                    <td className="px-4 py-2">{(totals.netProfit ?? 0).toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PnlReport;