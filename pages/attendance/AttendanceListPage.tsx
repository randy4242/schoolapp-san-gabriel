import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Course, AttendanceRecord } from '../../types';
import EditAttendanceModal from './EditAttendanceModal';
import { ClipboardListIcon } from '../../components/icons';

const AttendanceListPage: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [error, setError] = useState('');
    const [recordToEdit, setRecordToEdit] = useState<AttendanceRecord | null>(null);
    const [dateFilter, setDateFilter] = useState<string>('');

    const { user } = useAuth();

    useEffect(() => {
        const fetchCourses = async () => {
            if (user?.schoolId) {
                try {
                    const coursesData = await apiService.getCourses(user.schoolId);
                    setCourses(coursesData);
                } catch (err) {
                    setError('No se pudo cargar la lista de cursos.');
                } finally {
                    setLoadingCourses(false);
                }
            }
        };
        fetchCourses();
    }, [user]);

    const fetchRecords = async (courseId: string) => {
        if (user?.schoolId && courseId) {
            setLoadingRecords(true);
            setError('');
            try {
                const recordsData = await apiService.getAttendanceByCourse(parseInt(courseId), user.schoolId);
                setAttendanceRecords(recordsData.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (err) {
                setError('No se pudo cargar la lista de asistencias.');
                setAttendanceRecords([]);
            } finally {
                setLoadingRecords(false);
            }
        } else {
            setAttendanceRecords([]);
        }
    }
    
    useEffect(() => {
        fetchRecords(selectedCourseId);
    }, [selectedCourseId, user]);

    const handleCourseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedCourseId(e.target.value);
    };

    const handleDelete = async (recordId: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro de asistencia?')) {
            if (user?.schoolId) {
                try {
                    await apiService.deleteAttendance(recordId, user.schoolId);
                    // Refresh records
                    fetchRecords(selectedCourseId);
                } catch (err: any) {
                    setError(err.message || 'Error al eliminar el registro.');
                }
            }
        }
    };
    
    const getStatusBadge = (status: string, isJustified: boolean | null) => {
        let text = status;
        let colorClasses = "bg-gray-200 text-gray-800";
        if (status === 'Presente') colorClasses = "bg-success-light text-success-text";
        if (status === 'Ausente') {
            text = isJustified ? 'Ausencia Justif.' : 'Ausente';
            colorClasses = isJustified ? "bg-warning/20 text-warning-dark" : "bg-danger-light text-danger-text";
        }
        if (status === 'Retardo') {
             text = isJustified ? 'Retardo Justif.' : 'Retardo';
            colorClasses = isJustified ? "bg-info-light text-info-text" : "bg-warning/20 text-warning-dark";
        }
        if (status === 'Observación') colorClasses = "bg-info-light text-info-text";

        return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>{text}</span>;
    };

    const filteredRecords = useMemo(() => {
        if (!dateFilter) {
            return attendanceRecords;
        }
        const filterDateStr = new Date(dateFilter).toDateString();
    
        return attendanceRecords.filter(record => {
            const recordDateStr = new Date(record.date).toDateString();
            return recordDateStr === filterDateStr;
        });
    }, [attendanceRecords, dateFilter]);

    return (
        <div>
            <div className="flex items-center mb-6">
                <ClipboardListIcon/>
                <h1 className="text-2xl font-bold text-text-primary ml-2">Gestión de Asistencia</h1>
            </div>

            <div className="mb-6 p-4 bg-surface rounded-lg shadow-sm border flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <label htmlFor="course-select" className="block text-sm font-medium text-text-primary mb-2">
                        Seleccione un curso
                    </label>
                    <select
                        id="course-select"
                        value={selectedCourseId}
                        onChange={handleCourseChange}
                        disabled={loadingCourses}
                        className="w-full p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                    >
                        <option value="">{loadingCourses ? 'Cargando cursos...' : '-- Seleccionar un curso --'}</option>
                        {courses.map(course => (
                            <option key={course.courseID} value={course.courseID}>{course.name}</option>
                        ))}
                    </select>
                </div>
                 <div className="flex-1">
                    <label htmlFor="date-filter" className="block text-sm font-medium text-text-primary mb-2">
                        Filtrar por Día
                    </label>
                    <input
                        type="date"
                        id="date-filter"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full p-2 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-accent/50"
                    />
                </div>
            </div>
            
            {error && <p className="text-danger bg-danger-light p-3 rounded mb-4">{error}</p>}
            
            {loadingRecords ? (
                <p>Cargando registros...</p>
            ) : selectedCourseId && filteredRecords.length > 0 ? (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estudiante</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Notas</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-text-on-primary uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {filteredRecords.map((record) => (
                                <tr key={record.attendanceID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{record.studentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{new Date(record.date).toLocaleDateString('es-ES')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(record.status, record.isJustified)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap max-w-sm truncate">{record.notes || '—'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button onClick={() => setRecordToEdit(record)} className="text-warning hover:text-warning-dark mr-4">Editar</button>
                                        <button onClick={() => handleDelete(record.attendanceID)} className="text-danger hover:text-danger-text">Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : selectedCourseId && (
                <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                    <p className="text-secondary">No se encontraron registros de asistencia para los filtros seleccionados.</p>
                </div>
            )}
            
            {recordToEdit && (
                <EditAttendanceModal 
                    record={recordToEdit}
                    onClose={() => setRecordToEdit(null)}
                    onSaveSuccess={() => {
                        setRecordToEdit(null);
                        fetchRecords(selectedCourseId); // Refresh data
                    }}
                />
            )}
        </div>
    );
};

export default AttendanceListPage;