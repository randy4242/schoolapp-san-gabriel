import React, { useEffect, useState, useRef, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Classroom, ClassroomAverage, ClassroomStudentAveragesResponse } from '../../types';
import { ChartBarIcon } from '../../components/icons';
import { theme } from '../../styles/theme';

declare var Chart: any;

const buildStudentAveragesChart = (
    ctx: CanvasRenderingContext2D, 
    chartRef: React.MutableRefObject<any>, 
    stats: ClassroomStudentAveragesResponse | null
) => {
    if (chartRef.current) {
        chartRef.current.destroy();
    }
    if (!stats || !stats.studentAverages || stats.studentAverages.length === 0) {
        return;
    }

    const sortedAverages = [...stats.studentAverages].sort((a, b) => b.averageGrade - a.averageGrade);

    const labels = sortedAverages.map(s => s.studentName);
    const data = sortedAverages.map(s => s.averageGrade);

    chartRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Promedio de Notas',
                data: data,
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.secondary,
                borderWidth: 1,
                borderRadius: 4,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 20 // Assuming grades are on a 0-20 scale
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context: any) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
};

const GradeStatsPage: React.FC = () => {
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [schoolAverages, setSchoolAverages] = useState<ClassroomAverage[]>([]);
    const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
    const [classroomStats, setClassroomStats] = useState<ClassroomStudentAveragesResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(false);
    const [error, setError] = useState('');

    const chartRef = useRef<any>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);

    const { user } = useAuth();

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getClassrooms(user.schoolId),
                apiService.getSchoolClassroomAverages(user.schoolId).catch(() => []) // Don't fail if this errors
            ]).then(([classroomData, averagesData]) => {
                setClassrooms(classroomData);
                setSchoolAverages(averagesData);
            }).catch(() => setError('Error al cargar la lista de salones.'))
            .finally(() => setLoading(false));
        }
    }, [user]);

    useEffect(() => {
        if (selectedClassroomId && user?.schoolId) {
            setStatsLoading(true);
            setError('');
            setClassroomStats(null);
            apiService.getClassroomStudentAverages(parseInt(selectedClassroomId), user.schoolId)
                .then(setClassroomStats)
                .catch((err) => {
                    console.error(err);
                    setError(`No se encontraron notas para este salón.`);
                })
                .finally(() => setStatsLoading(false));
        } else {
            setClassroomStats(null);
        }
    }, [selectedClassroomId, user]);
    
    useEffect(() => {
        if (chartCanvasRef.current) {
            const ctx = chartCanvasRef.current.getContext('2d');
            if (ctx) {
                buildStudentAveragesChart(ctx, chartRef, classroomStats);
            }
        }
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [classroomStats]);

    const selectedClassroomAverage = useMemo(() => {
        return schoolAverages.find(avg => avg.classroomID === parseInt(selectedClassroomId))?.averageGrade;
    }, [schoolAverages, selectedClassroomId]);

    const sortedStudentAverages = useMemo(() => {
        if (!classroomStats?.studentAverages) return [];
        return [...classroomStats.studentAverages].sort((a, b) => b.averageGrade - a.averageGrade);
    }, [classroomStats]);
    
    return (
        <div>
            <div className="flex items-center mb-6">
                <ChartBarIcon />
                <h1 className="text-2xl font-bold text-text-primary ml-2">Estadísticas de Calificaciones</h1>
            </div>

            <div className="mb-6 p-4 bg-surface rounded-lg shadow-sm border">
                <label htmlFor="classroom-select" className="block text-sm font-medium text-text-primary mb-2">
                    Seleccione un salón para ver sus estadísticas
                </label>
                <select
                    id="classroom-select"
                    value={selectedClassroomId}
                    onChange={e => setSelectedClassroomId(e.target.value)}
                    disabled={loading}
                    className="w-full md:w-1/2 p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                    <option value="">{loading ? 'Cargando salones...' : '-- Seleccionar un salón --'}</option>
                    {classrooms.map(c => (
                        <option key={c.classroomID} value={c.classroomID}>{c.name}</option>
                    ))}
                </select>
            </div>
            
            {statsLoading && <p>Cargando estadísticas...</p>}
            {error && <p className="text-danger bg-danger-light p-3 rounded">{error}</p>}
            
            {!selectedClassroomId && !statsLoading && (
                <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                    <p className="text-secondary">Por favor, seleccione un salón para comenzar.</p>
                </div>
            )}
            
            {classroomStats && !statsLoading && !error && (
                 <div className="space-y-6">
                    <div className="bg-surface p-4 rounded-lg shadow-sm border text-center">
                        <h3 className="text-md font-semibold text-text-secondary">Promedio General del Salón</h3>
                        <p className="text-4xl font-bold text-primary mt-1">
                            {selectedClassroomAverage ? selectedClassroomAverage.toFixed(2) : 'N/A'}
                        </p>
                    </div>
                    
                    <div className="bg-surface p-4 rounded-lg shadow-sm border">
                        <h3 className="text-lg font-semibold text-text-primary mb-4">Promedio por Estudiante</h3>
                        <div className="h-96">
                            <canvas ref={chartCanvasRef}></canvas>
                        </div>
                    </div>

                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Estudiante</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-text-on-primary uppercase">Promedio</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-text-on-primary uppercase">Nº de Notas</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {sortedStudentAverages.map(avg => (
                                    <tr key={avg.studentId} className="hover:bg-background">
                                        <td className="px-6 py-4 whitespace-nowrap">{avg.studentName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center font-semibold">{avg.averageGrade.toFixed(2)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">{avg.totalGrades}</td>
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

export default GradeStatsPage;