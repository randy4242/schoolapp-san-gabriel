
import React, { useEffect, useState, useRef } from 'react';
// This assumes chart.js is loaded from a CDN in index.html
declare var Chart: any;
declare var ChartDataLabels: any;

import { ClassroomAttendanceStats, Lapso, AttendanceSummaryDto } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import { theme } from '../../styles/theme';

interface ClassroomStatsModalProps {
    classroomId: number;
    classroomName: string;
    onClose: () => void;
}

const buildPieChart = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, overall: AttendanceSummaryDto) => {
    if (chartRef.current) chartRef.current.destroy();

    const total = overall?.total || 0;
    if (total === 0) return;

    chartRef.current = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Presente', 'Ausente', 'Aus. Justif.', 'Retardos'],
            datasets: [{
                data: [overall.present || 0, overall.absent || 0, overall.justifiedAbsent || 0, overall.late || 0],
                backgroundColor: [
                    theme.colors.success.DEFAULT,
                    theme.colors.danger.DEFAULT,
                    theme.colors.warning.DEFAULT,
                    theme.colors.info.DEFAULT
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold', size: 10 },
                    formatter: (value: number) => {
                        const pct = (value * 100 / total).toFixed(1);
                        return pct !== "0.0" ? pct + '%' : '';
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
};

const buildBarChart = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, byCourse: any[]) => {
    if (chartRef.current) chartRef.current.destroy();

    const labels = byCourse.map(c => c.courseName.length > 15 ? c.courseName.substring(0, 15) + '...' : c.courseName);
    const p = byCourse.map(c => c.summary.present);
    const a = byCourse.map(c => c.summary.absent);
    const j = byCourse.map(c => c.summary.justifiedAbsent);
    const l = byCourse.map(c => c.summary.late);

    chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Pres.', data: p, backgroundColor: theme.colors.success.DEFAULT },
                { label: 'Aus.', data: a, backgroundColor: theme.colors.danger.DEFAULT },
                { label: 'Just.', data: j, backgroundColor: theme.colors.warning.DEFAULT },
                { label: 'Ret.', data: l, backgroundColor: theme.colors.info.DEFAULT }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { stacked: true, beginAtZero: true },
                x: { stacked: true, ticks: { font: { size: 9 } } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
            }
        }
    });
};

const ClassroomStatsModal: React.FC<ClassroomStatsModalProps> = ({ classroomId, classroomName, onClose }) => {
    const [viewMode, setViewMode] = useState<'lapso' | 'daily'>('lapso');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<ClassroomAttendanceStats | null>(null);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [selectedLapsoId, setSelectedLapsoId] = useState<string>('');
    const [selectedGender, setSelectedGender] = useState<'M' | 'F' | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const overallChartRef = useRef<any>(null);
    const byCourseChartRef = useRef<any>(null);
    const overallCanvasRef = useRef<HTMLCanvasElement>(null);
    const byCourseCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (user?.schoolId) {
            apiService.getLapsos(user.schoolId)
                .then(data => {
                    setLapsos(data);
                    if (data.length > 0) setSelectedLapsoId(data[data.length - 1].lapsoID.toString());
                })
                .catch(() => setError('No se pudieron cargar los lapsos.'));
        }
    }, [user]);

    useEffect(() => {
        if (user?.schoolId && (viewMode === 'lapso' ? selectedLapsoId : selectedDate)) {
            setLoading(true);
            setError('');

            // Calcular fechas según el modo
            let from: string | undefined;
            let to: string | undefined;

            if (viewMode === 'lapso' && selectedLapsoId) {
                const selLapso = lapsos.find(l => l.lapsoID === Number(selectedLapsoId));
                if (selLapso) {
                    from = selLapso.fechaInicio.split('T')[0];
                    to = selLapso.fechaFin.split('T')[0];
                }
            } else if (viewMode === 'daily') {
                from = selectedDate;
                to = selectedDate;
            }

            let fetchPromise;

            // Si hay un género seleccionado, usar el endpoint de filtro por género
            if (selectedGender) {
                fetchPromise = apiService.getClassroomAttendanceStatsByGender(
                    classroomId,
                    selectedGender,
                    from,
                    to
                ).then(res => {
                    // Transformar GenderStatsResponse a ClassroomAttendanceStats
                    if (res.genderStats && res.genderStats.length > 0) {
                        const genderStat = res.genderStats[0];
                        const attendanceRate = genderStat.total > 0
                            ? Math.round((genderStat.present / genderStat.total) * 100)
                            : 0;
                        const absenceRate = 100 - attendanceRate;

                        return {
                            classroomID: res.classroomID,
                            classroomName: res.classroomName,
                            overall: {
                                total: genderStat.total,
                                present: genderStat.present,
                                absent: genderStat.absent,
                                late: genderStat.late,
                                justifiedAbsent: genderStat.justifiedAbsent,
                                observation: genderStat.observation,
                                attendanceRate: attendanceRate,
                                absenceRate: absenceRate
                            },
                            byCourse: [],
                            byStudent: []
                        } as ClassroomAttendanceStats;
                    }
                    return null;
                });
            } else {
                // Sin filtro de género, usar el endpoint normal
                fetchPromise = apiService.getClassroomAttendanceStats(
                    classroomId,
                    user.schoolId,
                    from,
                    to
                );
            }

            fetchPromise
                .then(setStats)
                .catch(() => setError('Error al cargar datos.'))
                .finally(() => setLoading(false));
        }
    }, [classroomId, user, viewMode, selectedLapsoId, selectedDate, selectedGender, lapsos]);


    useEffect(() => {
        if (stats && stats.overall && overallCanvasRef.current) {
            const overallCtx = overallCanvasRef.current.getContext('2d');
            if (overallCtx) buildPieChart(overallCtx, overallChartRef, stats.overall);
        }
        if (stats && stats.byCourse && stats.byCourse.length > 0 && byCourseCanvasRef.current) {
            const byCourseCtx = byCourseCanvasRef.current.getContext('2d');
            if (byCourseCtx) buildBarChart(byCourseCtx, byCourseChartRef, stats.byCourse);
        }
    }, [stats]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Estadísticas: ${classroomName}`}>
            <div className="space-y-6">

                {/* Selector de Modo */}
                <div className="flex flex-col md:flex-row gap-4 p-3 bg-background rounded-lg border">
                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Periodo:</label>
                        <div className="flex bg-surface border rounded overflow-hidden">
                            <button
                                onClick={() => setViewMode('lapso')}
                                className={`flex-1 py-1.5 text-xs font-bold ${viewMode === 'lapso' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Lapso
                            </button>
                            <button
                                onClick={() => setViewMode('daily')}
                                className={`flex-1 py-1.5 text-xs font-bold ${viewMode === 'daily' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Por Día
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        {viewMode === 'lapso' ? (
                            <>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Lapso Académico:</label>
                                <select
                                    value={selectedLapsoId}
                                    onChange={e => setSelectedLapsoId(e.target.value)}
                                    className="w-full p-1.5 border rounded bg-surface text-xs outline-none"
                                >
                                    {lapsos.map(l => <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>)}
                                </select>
                            </>
                        ) : (
                            <>
                                <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Fecha:</label>
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full p-1.5 border rounded bg-surface text-xs outline-none"
                                />
                            </>
                        )}
                    </div>

                    <div className="flex-1">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase mb-1">Filtrar por Género:</label>
                        <div className="flex bg-surface border rounded overflow-hidden">
                            <button
                                onClick={() => setSelectedGender(null)}
                                className={`flex-1 py-1.5 text-xs font-bold ${selectedGender === null ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => setSelectedGender('M')}
                                className={`flex-1 py-1.5 text-xs font-bold ${selectedGender === 'M' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Masculino
                            </button>
                            <button
                                onClick={() => setSelectedGender('F')}
                                className={`flex-1 py-1.5 text-xs font-bold ${selectedGender === 'F' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Femenino
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                ) : !stats || !stats.overall ? (
                    <div className="text-center py-10 text-text-tertiary">No hay datos de asistencia registrados para este periodo.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Gráfico Circular */}
                            <div className="bg-surface p-4 rounded-lg border shadow-sm h-60 flex flex-col">
                                <h4 className="text-[10px] font-bold uppercase text-text-secondary mb-2 text-center">Distribución Global</h4>
                                <div className="flex-1 min-h-0"><canvas ref={overallCanvasRef}></canvas></div>
                            </div>

                            {/* Resumen Numérico */}
                            <div className="bg-surface p-4 rounded-lg border shadow-sm flex flex-col justify-center">
                                <div className="text-center mb-4">
                                    <span className="block text-4xl font-black text-primary">{stats.overall.attendanceRate || 0}%</span>
                                    <span className="text-[10px] uppercase font-bold text-text-tertiary">Tasa de Asistencia Global</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-background p-2 rounded text-center">
                                        <span className="block text-lg font-bold text-success-text">{stats.overall.present || 0}</span>
                                        <span className="text-[9px] uppercase text-text-tertiary">Presentes</span>
                                    </div>
                                    <div className="bg-background p-2 rounded text-center">
                                        <span className="block text-lg font-bold text-danger-text">{stats.overall.absent || 0}</span>
                                        <span className="text-[9px] uppercase text-text-tertiary">Ausentes</span>
                                    </div>
                                    <div className="bg-background p-2 rounded text-center">
                                        <span className="block text-lg font-bold text-warning-dark">{stats.overall.justifiedAbsent || 0}</span>
                                        <span className="text-[9px] uppercase text-text-tertiary">Justificadas</span>
                                    </div>
                                    <div className="bg-background p-2 rounded text-center">
                                        <span className="block text-lg font-bold text-info-dark">{stats.overall.late || 0}</span>
                                        <span className="text-[9px] uppercase text-text-tertiary">Retardos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desglose por Materia */}
                        {viewMode === 'lapso' && stats.byCourse && stats.byCourse.length > 0 && (
                            <div className="bg-surface p-4 rounded-lg border shadow-sm h-64 flex flex-col">
                                <h4 className="text-[10px] font-bold uppercase text-text-secondary mb-2 text-center">Asistencia por Materia</h4>
                                <div className="flex-1 min-h-0"><canvas ref={byCourseCanvasRef}></canvas></div>
                            </div>
                        )}

                        {/* Listado de Estudiantes (Ranking) */}
                        {viewMode === 'lapso' && stats.byStudent && stats.byStudent.length > 0 && (
                            <div className="bg-surface rounded-lg border shadow-sm overflow-hidden">
                                <h4 className="text-[10px] font-bold uppercase text-text-secondary bg-background p-2 border-b">Resumen por Estudiante</h4>
                                <div className="max-h-60 overflow-y-auto">
                                    <table className="min-w-full text-[11px]">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Estudiante</th>
                                                <th className="px-3 py-2 text-center">Tasa</th>
                                                <th className="px-3 py-2 text-center">Pres.</th>
                                                <th className="px-3 py-2 text-center">Aus.</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stats.byStudent.map(s => (
                                                <tr key={s.studentID} className="hover:bg-gray-50">
                                                    <td className="px-3 py-1.5 font-medium">{s.studentName}</td>
                                                    <td className="px-3 py-1.5 text-center font-bold text-primary">{s.summary.attendanceRate}%</td>
                                                    <td className="px-3 py-1.5 text-center text-success-text">{s.summary.present}</td>
                                                    <td className="px-3 py-1.5 text-center text-danger-text">{s.summary.absent}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {error && <p className="text-danger text-center bg-danger-light p-2 rounded text-xs">{error}</p>}

                <div className="flex justify-end pt-2 border-t">
                    <button onClick={onClose} className="bg-background text-text-primary px-4 py-1.5 rounded border hover:bg-border text-sm transition-colors">Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};

export default ClassroomStatsModal;
