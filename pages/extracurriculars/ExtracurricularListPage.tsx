import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ExtracurricularActivity, Teacher } from '../../types';
import ExtracurricularEnrollmentModal from './ExtracurricularEnrollmentModal';

const dayOfWeekMap: { [key: number]: string } = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
};

const ExtracurricularListPage: React.FC = () => {
    const [activities, setActivities] = useState<ExtracurricularActivity[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, hasPermission } = useAuth();
    const [viewingEnrollmentsFor, setViewingEnrollmentsFor] = useState<ExtracurricularActivity | null>(null);


    const canCreate = useMemo(() => hasPermission([6]), [hasPermission]);

    const fetchData = async () => {
        if (user?.schoolId) {
            try {
                setLoading(true);
                const [activityData, teacherData] = await Promise.all([
                    apiService.getExtracurriculars(user.schoolId),
                    apiService.getTeachers(user.schoolId)
                ]);
                setActivities(activityData);
                setTeachers(teacherData);
                setError('');
            } catch (err) {
                setError('No se pudo cargar la lista de actividades.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const handleDelete = async (activityId: number) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar esta actividad?')) {
            try {
                if (user?.schoolId) {
                    await apiService.deleteExtracurricular(activityId, user.schoolId);
                    fetchData();
                }
            } catch (err) {
                setError('Error al eliminar la actividad.');
                console.error(err);
            }
        }
    };

    const getTeacherName = (teacherId: number | null) => {
        if (!teacherId) return 'No asignado';
        return teachers.find(t => t.userID === teacherId)?.userName || 'Desconocido';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary">Actividades Extracurriculares</h1>
                {canCreate && (
                    <Link to="/extracurriculars/create" className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                        Crear Nueva Actividad
                    </Link>
                )}
            </div>

            {loading && <p>Cargando actividades...</p>}
            {error && <p className="text-danger">{error}</p>}

            {!loading && !error && (
                activities.length > 0 ? (
                    <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Día</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Profesor</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {activities.map((activity) => (
                                    <tr key={activity.activityID} className="hover:bg-background">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-text-primary">{activity.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary max-w-md truncate">{activity.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary">{dayOfWeekMap[activity.dayOfWeek] || 'No asignado'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-secondary">{getTeacherName(activity.userID)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-4">
                                                <button onClick={() => setViewingEnrollmentsFor(activity)} className="text-info hover:text-info-dark">Inscripciones</button>
                                                <Link to={`/extracurriculars/edit/${activity.activityID}`} className="text-warning hover:text-warning-dark">Editar</Link>
                                                <button onClick={() => handleDelete(activity.activityID)} className="text-danger hover:text-danger-text">Eliminar</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-surface rounded-lg shadow-md">
                        <p className="text-secondary">No hay actividades extracurriculares registradas.</p>
                    </div>
                )
            )}

            {viewingEnrollmentsFor && (
                <ExtracurricularEnrollmentModal
                    activity={viewingEnrollmentsFor}
                    onClose={() => setViewingEnrollmentsFor(null)}
                />
            )}
        </div>
    );
};

export default ExtracurricularListPage;