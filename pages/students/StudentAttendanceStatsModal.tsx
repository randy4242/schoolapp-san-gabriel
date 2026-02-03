
import React, { useEffect, useState, useRef, useMemo } from 'react';
declare var Chart: any;
declare var ChartDataLabels: any;

import { StudentAttendanceStats, User, Lapso, AttendanceSummaryDto } from '../../types';
import { apiService } from '../../services/apiService';
import Modal from '../../components/Modal';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

interface StudentAttendanceStatsModalProps {
    student: User;
    onClose: () => void;
}

const buildPieChart = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, overall: AttendanceSummaryDto) => {
    if (chartRef.current) chartRef.current.destroy();
    
    // Seguridad ante objeto indefinido
    const present = overall?.present || 0;
    const absent = overall?.absent || 0;
    const justified = overall?.justifiedAbsent || 0;
    const late = overall?.late || 0;
    const total = overall?.total || 1; // Evitar división por cero

    chartRef.current = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Presente', 'Ausente', 'Aus. Justif.', 'Retardos'],
            datasets: [{
                data: [present, absent, justified, late],
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
                legend: { position: 'bottom' },
                datalabels: {
                    color: '#fff',
                    font: { weight: 'bold' },
                    formatter: (value: number) => {
                        const pct = (value * 100 / total).toFixed(1);
                        return pct + '%';
                    }
                }
            } 
        },
        plugins: [ChartDataLabels]
    });
};

const buildBarChart = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, stats: StudentAttendanceStats) => {
    if (chartRef.current) chartRef.current.destroy();
    
    const byCourse = stats.byCourse || [];
    const labels = byCourse.map(c => c.courseName);
    const p = byCourse.map(c => c.summary?.present || 0);
    const a = byCourse.map(c => c.summary?.absent || 0);

    chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Pres.', data: p, backgroundColor: theme.colors.success.DEFAULT },
                { label: 'Aus.', data: a, backgroundColor: theme.colors.danger.DEFAULT }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
};

const StudentAttendanceStatsModal: React.FC<StudentAttendanceStatsModalProps> = ({ student, onClose }) => {
    const { user: authUser } = useAuth();
    const [viewMode, setViewMode] = useState<'lapso' | 'daily'>('lapso');
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<StudentAttendanceStats | null>(null);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [selectedLapsoId, setSelectedLapsoId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const overallChartRef = useRef<any>(null);
    const byCourseChartRef = useRef<any>(null);
    
    const overallCanvasRef = useRef<HTMLCanvasElement>(null);
    const byCourseCanvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (authUser?.schoolId) {
            apiService.getLapsos(authUser.schoolId).then(data => {
                setLapsos(data);
                if (data.length > 0) setSelectedLapsoId(data[data.length - 1].lapsoID.toString());
            });
        }
    }, [authUser]);

    useEffect(() => {
        if (authUser?.schoolId && (viewMode === 'lapso' ? selectedLapsoId : selectedDate)) {
            setLoading(true);
            setError('');
            
            let fetchPromise;

            if (viewMode === 'lapso') {
                const selLapso = lapsos.find(l => l.lapsoID === Number(selectedLapsoId));
                const from = selLapso?.fechaInicio.split('T')[0];
                const to = selLapso?.fechaFin.split('T')[0];
                fetchPromise = apiService.getStudentAttendanceStats(student.userID, student.userName, authUser.schoolId, from, to);
            } else {
                fetchPromise = apiService.getDailyStudentStats(student.userID, selectedDate, selectedDate, authUser.schoolId)
                    .then(res => {
                        if (res.dailyStats && res.dailyStats.length > 0) {
                            return {
                                studentID: student.userID,
                                studentName: student.userName,
                                overall: res.dailyStats[0].summary,
                                byCourse: []
                            } as StudentAttendanceStats;
                        }
                        return null;
                    });
            }

            fetchPromise
                .then(setStats)
                .catch(() => setError('No se pudieron cargar los datos.'))
                .finally(() => setLoading(false));
        }
    }, [student, viewMode, selectedLapsoId, selectedDate, authUser, lapsos]);

    useEffect(() => {
        if (stats && stats.overall && overallCanvasRef.current) {
            const overallCtx = overallCanvasRef.current.getContext('2d');
            if (overallCtx) buildPieChart(overallCtx, overallChartRef, stats.overall);
        }
        if (stats && stats.byCourse && byCourseCanvasRef.current && viewMode === 'lapso') {
            const byCourseCtx = byCourseCanvasRef.current.getContext('2d');
            if (byCourseCtx) buildBarChart(byCourseCtx, byCourseChartRef, stats);
        }
    }, [stats, viewMode]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Estadísticas: ${student.userName}`}>
            <div className="space-y-6">
                
                {/* Control Header */}
                <div className="flex flex-col md:flex-row gap-4 p-4 bg-background rounded-lg border border-border">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Periodo</label>
                        <div className="flex bg-surface border rounded-md overflow-hidden">
                            <button 
                                onClick={() => setViewMode('lapso')}
                                className={`flex-1 py-2 text-sm font-semibold transition-colors ${viewMode === 'lapso' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Acumulado Lapso
                            </button>
                            <button 
                                onClick={() => setViewMode('daily')}
                                className={`flex-1 py-2 text-sm font-semibold transition-colors ${viewMode === 'daily' ? 'bg-primary text-white' : 'hover:bg-gray-50'}`}
                            >
                                Por Día
                            </button>
                        </div>
                    </div>

                    <div className="flex-1">
                        {viewMode === 'lapso' ? (
                            <>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Elegir Lapso</label>
                                <select 
                                    value={selectedLapsoId} 
                                    onChange={e => setSelectedLapsoId(e.target.value)} 
                                    className="w-full p-2 border rounded bg-surface text-sm outline-none"
                                >
                                    {lapsos.map(l => <option key={l.lapsoID} value={l.lapsoID}>{l.nombre}</option>)}
                                </select>
                            </>
                        ) : (
                            <>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Fecha a Consultar</label>
                                <input 
                                    type="date" 
                                    value={selectedDate} 
                                    onChange={e => setSelectedDate(e.target.value)}
                                    className="w-full p-2 border rounded bg-surface text-sm outline-none"
                                />
                            </>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : !stats || !stats.overall ? (
                    <div className="text-center py-10 text-text-tertiary">No se encontraron registros de asistencia.</div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-surface p-4 rounded-lg border shadow-sm h-64 flex flex-col">
                                <h4 className="text-xs font-bold uppercase text-text-secondary mb-2 text-center">Desempeño Global</h4>
                                <div className="flex-1 min-h-0"><canvas ref={overallCanvasRef}></canvas></div>
                            </div>
                            <div className="bg-surface p-4 rounded-lg border shadow-sm flex flex-col justify-center">
                                <h4 className="text-xs font-bold uppercase text-text-secondary mb-4 text-center">Indicadores</h4>
                                <div className="text-center py-2">
                                    <div className="text-5xl font-black text-primary">{stats.overall.attendanceRate || 0}%</div>
                                    <div className="text-xs text-text-tertiary uppercase mt-1">Asistencia Real</div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 bg-background rounded flex justify-between"><span>Presentes:</span> <b>{stats.overall.present || 0}</b></div>
                                    <div className="p-2 bg-background rounded flex justify-between"><span>Ausentes:</span> <b className="text-danger">{stats.overall.absent || 0}</b></div>
                                    <div className="p-2 bg-background rounded flex justify-between"><span>Retardos:</span> <b className="text-info-dark">{stats.overall.late || 0}</b></div>
                                    <div className="p-2 bg-background rounded flex justify-between"><span>Justif.:</span> <b className="text-warning-dark">{stats.overall.justifiedAbsent || 0}</b></div>
                                </div>
                            </div>
                        </div>

                        {viewMode === 'lapso' && (
                            <div className="bg-surface p-4 rounded-lg shadow-sm h-64 flex flex-col">
                                 <h4 className="text-xs font-bold uppercase text-text-secondary mb-2">Asistencia por Materia</h4>
                                 <div className="flex-1 min-h-0"><canvas ref={byCourseCanvasRef}></canvas></div>
                            </div>
                        )}
                    </>
                )}

                {error && <p className="text-danger text-center bg-danger-light p-2 rounded">{error}</p>}

                <div className="flex justify-end pt-4 border-t">
                    <button onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cerrar</button>
                </div>
            </div>
        </Modal>
    );
};

export default StudentAttendanceStatsModal;
