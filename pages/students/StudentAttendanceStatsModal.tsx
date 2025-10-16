import React, { useEffect, useState, useRef } from 'react';
// This assumes chart.js is loaded from a CDN in index.html
declare var Chart: any;

import { StudentAttendanceStats, User, Lapso } from '../../types';
import { apiService } from '../../services/apiService';
import Modal from '../../components/Modal';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../styles/theme';

interface StudentAttendanceStatsModalProps {
    student: User;
    onClose: () => void;
}

const buildDoughnut = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, present: number, absent: number) => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Presente', 'Ausente'],
            datasets: [{
                data: [present, absent],
                backgroundColor: [theme.colors.success.DEFAULT, theme.colors.danger.DEFAULT],
                hoverBackgroundColor: [theme.colors.success.light, theme.colors.danger.light]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
            },
        },
    });
};

const buildBar = (ctx: CanvasRenderingContext2D, chartRef: React.MutableRefObject<any>, labels: string[], presentData: number[], absentData: number[]) => {
    if (chartRef.current) chartRef.current.destroy();
    chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Presente', data: presentData, backgroundColor: theme.colors.success.DEFAULT },
                { label: 'Ausente', data: absentData, backgroundColor: theme.colors.danger.DEFAULT }
            ]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, stacked: true }, x: { stacked: true } }
        }
    });
};


const StudentAttendanceStatsModal: React.FC<StudentAttendanceStatsModalProps> = ({ student, onClose }) => {
    const { user: authUser } = useAuth();
    const [stats, setStats] = useState<StudentAttendanceStats | null>(null);
    const [lapsos, setLapsos] = useState<Lapso[]>([]);
    const [selectedLapso, setSelectedLapso] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const overallChartRef = useRef<any>(null);
    const byCourseChartRef = useRef<any>(null);
    const overallCanvasRef = useRef<HTMLCanvasElement>(null);
    const byCourseCanvasRef = useRef<HTMLCanvasElement>(null);

    // Fetch Lapsos first
    useEffect(() => {
        if (!authUser?.schoolId) return;
        apiService.getLapsos(authUser.schoolId)
            .then(setLapsos)
            .catch(() => setError('No se pudieron cargar los lapsos.'));
    }, [student, authUser]);

    // Fetch stats when lapso changes
    useEffect(() => {
        if (!authUser?.schoolId) return;
        setLoading(true);
        apiService.getStudentAttendanceStats(student.userID, student.userName, authUser.schoolId, selectedLapso ? parseInt(selectedLapso) : undefined)
            .then(data => {
                setStats(data);
                setError('');
            })
            .catch(() => {
                setError('No se pudieron cargar las estadísticas.');
                setStats(null);
            })
            .finally(() => setLoading(false));
    }, [student, selectedLapso, authUser]);

    // Update charts when stats data changes
    useEffect(() => {
        if (stats && overallCanvasRef.current && byCourseCanvasRef.current) {
            const overallCtx = overallCanvasRef.current.getContext('2d');
            const byCourseCtx = byCourseCanvasRef.current.getContext('2d');
            
            if (overallCtx) {
                buildDoughnut(overallCtx, overallChartRef, stats.overall.present, stats.overall.absent);
            }
            if (byCourseCtx) {
                 const labels = stats.byCourse.map(c => c.courseName);
                 const presentData = stats.byCourse.map(c => c.summary.present);
                 const absentData = stats.byCourse.map(c => c.summary.absent);
                 buildBar(byCourseCtx, byCourseChartRef, labels, presentData, absentData);
            }
        }
        return () => {
            if (overallChartRef.current) overallChartRef.current.destroy();
            if (byCourseChartRef.current) byCourseChartRef.current.destroy();
        };
    }, [stats]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Asistencia de ${student.userName}`}>
            <div className="space-y-4">
                 <form className="mb-3 bg-background p-3 rounded-md border">
                    <div className="flex flex-wrap items-center gap-4">
                        <label htmlFor="lapsoSelect" className="font-bold">Filtrar por Lapso:</label>
                         <select
                            id="lapsoSelect"
                            name="lapsoId"
                            value={selectedLapso}
                            onChange={(e) => setSelectedLapso(e.target.value)}
                            className="form-select border-border rounded-md shadow-sm"
                        >
                            <option value="">Todos los lapsos</option>
                            {lapsos.map(l => (
                                <option key={l.lapsoID} value={l.lapsoID}>
                                     {l.nombre} ({new Date(l.fechaInicio).toLocaleDateString()} - {new Date(l.fechaFin).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>
                </form>

                {loading && <p>Cargando estadísticas...</p>}
                {error && <p className="text-danger">{error}</p>}
                
                {!loading && !error && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-surface p-4 rounded-md shadow-sm border">
                            <h5 className="font-bold text-lg mb-2">Resumen</h5>
                            <ul className="space-y-2 text-sm">
                                <li className="flex justify-between items-center"><span>Total de Asistencias Registradas:</span><strong className="text-info-dark">{stats.overall.total}</strong></li>
                                <li className="flex justify-between items-center"><span>Presente:</span><strong className="text-success">{stats.overall.present}</strong></li>
                                <li className="flex justify-between items-center"><span>Ausente:</span><strong className="text-danger">{stats.overall.absent}</strong></li>
                                <li className="flex justify-between items-center pt-2 border-t"><span>Tasa de Asistencia:</span><strong className="text-lg">{stats.overall.attendanceRate?.toFixed(2) ?? 0}%</strong></li>
                            </ul>
                        </div>
                        <div className="bg-surface p-4 rounded-md shadow-sm border">
                            <h5 className="font-bold text-lg mb-2 text-center">Presente vs. Ausente</h5>
                            <div className="h-48 flex justify-center items-center">
                                <canvas ref={overallCanvasRef}></canvas>
                            </div>
                        </div>
                        <div className="md:col-span-2 bg-surface p-4 rounded-md shadow-sm border">
                             <h5 className="font-bold text-lg mb-2">Asistencia por curso</h5>
                            <canvas ref={byCourseCanvasRef}></canvas>
                        </div>
                    </div>
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

export default StudentAttendanceStatsModal;