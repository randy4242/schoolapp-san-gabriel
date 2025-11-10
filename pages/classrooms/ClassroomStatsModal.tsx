import React, { useEffect, useState, useRef } from 'react';
// This assumes chart.js is loaded from a CDN in index.html
declare var Chart: any;
declare var ChartDataLabels: any;

import { ClassroomAttendanceStats, Lapso } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import { theme } from '../../styles/theme';

interface ClassroomStatsModalProps {
    classroomId: number;
    classroomName: string;
    onClose: () => void;
}

// Chart building functions adapted from the ASP.NET view's JavaScript
const buildPie = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, present: number, absent: number, justifiedAbsent: number, late: number) => {
    if (chartRef.current) chartRef.current.destroy();
    const total = present + absent + justifiedAbsent + late;
    if (total === 0) {
        // Handle no data case if needed
        return;
    }
    chartRef.current = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Presente', 'Ausente (No just.)', 'Ausencia Justificada', 'Retardos'],
            datasets: [{
                data: [present, absent, justifiedAbsent, late],
                backgroundColor: [
                    theme.colors.success.DEFAULT,
                    theme.colors.danger.DEFAULT,
                    theme.colors.warning.DEFAULT,
                    theme.colors.info.DEFAULT
                ]
            }]
        },
        options: {
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            const data = context.dataset.data;
                            const total = data.reduce((a: number, b: number) => a + b, 0);
                            const val = context.parsed;
                            const pct = total ? ((val * 100) / total).toFixed(1) : 0;
                            return `${context.label}: ${val} (${pct}%)`;
                        }
                    }
                },
                datalabels: {
                    formatter: (value: number, ctx: any) => {
                        const data = ctx.dataset.data || [];
                        const total = data.reduce((a: number, b: number) => a + b, 0);
                        if (value === 0) return '';
                        const pct = total ? (value * 100 / total).toFixed(1) + '%' : '0%';
                        return pct;
                    },
                    color: '#fff',
                    font: { weight: 'bold' }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
};

const buildBar = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, labels: string[], presentData: number[], absentData: number[], justifiedAbsentData: number[], lateData: number[]) => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Presente', data: presentData, backgroundColor: theme.colors.success.DEFAULT },
                { label: 'Ausente', data: absentData, backgroundColor: theme.colors.danger.DEFAULT },
                { label: 'Aus. Justif.', data: justifiedAbsentData, backgroundColor: theme.colors.warning.DEFAULT },
                { label: 'Retardo', data: lateData, backgroundColor: theme.colors.info.DEFAULT }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true } }
        }
    });
};


const ClassroomStatsModal: React.FC<ClassroomStatsModalProps> = ({ classroomId, classroomName, onClose }) => {
    const [stats, setStats] = useState<ClassroomAttendanceStats | null>(null);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [selectedLapso, setSelectedLapso] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const overallChartRef = useRef<any>(null);
    const byCourseChartRef = useRef<any>(null);
    const overallCanvasRef = useRef<HTMLCanvasElement>(null);
    const byCourseCanvasRef = useRef<HTMLCanvasElement>(null);

    // Fetch Lapsos
    useEffect(() => {
        if (user?.schoolId) {
            apiService.getLapsos(user.schoolId)
                .then(setLapsos)
                .catch(() => setError('No se pudieron cargar los lapsos.'));
        }
    }, [user]);

    // Fetch Stats based on selectedLapso
    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getClassroomAttendanceStats(classroomId, user.schoolId, selectedLapso ? parseInt(selectedLapso) : undefined)
                .then(data => {
                    setStats(data);
                    setError('');
                })
                .catch(() => {
                    setError('No se pudieron cargar las estadísticas.');
                    setStats(null);
                })
                .finally(() => setLoading(false));
        }
    }, [classroomId, user, selectedLapso]);

    // Update charts when stats data changes
    useEffect(() => {
        if (stats && overallCanvasRef.current && byCourseCanvasRef.current) {
            const overallCtx = overallCanvasRef.current.getContext('2d');
            const byCourseCtx = byCourseCanvasRef.current.getContext('2d');
            
            if (overallCtx) {
                buildPie(overallCtx, overallChartRef, stats.overall.present, stats.overall.absent, stats.overall.justifiedAbsent, stats.overall.late);
            }
            if (byCourseCtx) {
                 const labels = stats.byCourse.map(c => c.courseName);
                 const presentData = stats.byCourse.map(c => c.summary.present);
                 const absentData = stats.byCourse.map(c => c.summary.absent);
                 const justifiedAbsentData = stats.byCourse.map(c => c.summary.justifiedAbsent);
                 const lateData = stats.byCourse.map(c => c.summary.late);
                 buildBar(byCourseCtx, byCourseChartRef, labels, presentData, absentData, justifiedAbsentData, lateData);
            }
        }
        // Cleanup charts on component unmount
        return () => {
            if (overallChartRef.current) { overallChartRef.current.destroy(); overallChartRef.current = null; }
            if (byCourseChartRef.current) { byCourseChartRef.current.destroy(); byCourseChartRef.current = null; }
        };
    }, [stats]);


    return (
        <Modal isOpen={true} onClose={onClose} title={`Estadísticas de Asistencia — ${classroomName}`}>
            <div className="space-y-4">
                <div className="bg-surface p-3 rounded-md shadow-sm border flex flex-wrap justify-between items-center gap-2">
                    <div className="font-bold">Resumen general de asistencia del salón</div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="lapsoSelect" className="font-bold mb-0">Lapso:</label>
                        <select
                            id="lapsoSelect"
                            value={selectedLapso}
                            onChange={e => setSelectedLapso(e.target.value)}
                            className="form-select border-border rounded-md shadow-sm"
                        >
                            <option value="">Todos</option>
                            {lapsos.map(l => (
                                <option key={l.lapsoID} value={l.lapsoID}>
                                    {l.nombre} ({new Date(l.fechaInicio).toLocaleDateString()} - {new Date(l.fechaFin).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading && <p>Cargando estadísticas...</p>}
                {error && <p className="text-danger">{error}</p>}
                
                {!loading && !error && stats && (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                            <div className="lg:col-span-4 bg-surface p-4 rounded-md shadow-sm border h-full flex flex-col">
                                <h5 className="font-bold text-lg mb-2">Global</h5>
                                <div className="flex-grow flex items-center justify-center"><canvas ref={overallCanvasRef}></canvas></div>
                                <div className="mt-2 text-center flex flex-wrap justify-center gap-1">
                                    <span className="inline-block bg-info-light text-info-text text-xs font-semibold px-2.5 py-0.5 rounded">Total: {stats.overall.total}</span>
                                    <span className="inline-block bg-success-light text-success-text text-xs font-semibold px-2.5 py-0.5 rounded">Pres.: {stats.overall.present}</span>
                                    <span className="inline-block bg-danger-light text-danger-text text-xs font-semibold px-2.5 py-0.5 rounded">Aus.: {stats.overall.absent}</span>
                                    <span className="inline-block bg-warning/20 text-warning-dark text-xs font-semibold px-2.5 py-0.5 rounded">Justif.: {stats.overall.justifiedAbsent}</span>
                                    <span className="inline-block bg-info-light text-info-text text-xs font-semibold px-2.5 py-0.5 rounded">Ret.: {stats.overall.late}</span>
                                    <span className="inline-block bg-gray-200 text-gray-800 text-xs font-semibold px-2.5 py-0.5 rounded">Observ.: {stats.overall.observation}</span>
                                </div>
                            </div>
                            <div className="lg:col-span-8 bg-surface p-4 rounded-md shadow-sm border h-full">
                                <h5 className="font-bold text-lg mb-2">Por curso</h5>
                                <canvas ref={byCourseCanvasRef}></canvas>
                            </div>
                        </div>

                        <div className="bg-surface p-4 rounded-md shadow-sm border mt-4">
                            <h5 className="font-bold text-lg mb-3">Por estudiante</h5>
                            <div className="overflow-x-auto max-h-64">
                                <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-header text-text-on-primary sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">Estudiante</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Total</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Pres.</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Aus.</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Aus. Justif.</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Retardos</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">Observ.</th>
                                            <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider">% Asistencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-surface divide-y divide-border">
                                        {stats.byStudent.length > 0 ? stats.byStudent.map(s => {
                                            const rate = s.summary.total === 0 ? 0 : ((s.summary.present + s.summary.justifiedAbsent) * 100 / s.summary.total);
                                            return (
                                                <tr key={s.studentID}>
                                                    <td className="px-4 py-2 whitespace-nowrap">{s.studentName}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.total}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.present}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.absent}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.justifiedAbsent}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.late}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{s.summary.observation}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-center">{rate.toFixed(1)}%</td>
                                                </tr>
                                            );
                                        }) : (
                                            <tr><td colSpan={8} className="text-center py-4">Sin datos en el rango seleccionado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                <div className="flex justify-end pt-4 mt-4 border-t">
                    <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default ClassroomStatsModal;