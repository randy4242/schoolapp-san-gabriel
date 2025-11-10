import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Enrollment, User } from '../../types';

const StudentEnrollmentListPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const [student, setStudent] = useState<User | null>(null);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        if (user?.schoolId && userId) {
            try {
                setLoading(true);
                const [studentData, enrollmentData] = await Promise.all([
                    apiService.getUserById(parseInt(userId), user.schoolId),
                    apiService.getEnrollmentsForUser(parseInt(userId), user.schoolId)
                ]);
                setStudent(studentData);
                setEnrollments(enrollmentData);
                setError(''); // Clear error on successful fetch
            } catch (err) {
                setError('No se pudieron cargar los datos de inscripción.');
            } finally {
                setLoading(false);
            }
        }
    }, [userId, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleUnenroll = async (enrollmentId: number) => {
        if (window.confirm('¿Estás seguro que deseas eliminar esta inscripción?')) {
            if (user?.schoolId) {
                try {
                    await apiService.deleteEnrollment(enrollmentId, user.schoolId);
                    fetchData(); // Refresh list
                } catch (err) {
                    setError('Error al anular la inscripción.');
                }
            }
        }
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-center text-text-primary mb-4">
                Inscripciones de <span className="text-accent">{student?.userName || '...'}</span>
            </h1>
            
            {loading && <p className="text-center">Cargando...</p>}
            {error && <p className="text-danger text-center bg-danger-light p-3 rounded-md">{error}</p>}
            
            {!loading && !error && (
                <>
                    <div className="mb-4">
                        <Link to={`/enrollments/assign/${userId}`} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 transition-colors">
                            Asignar a Nuevo Curso
                        </Link>
                    </div>
                    {enrollments.length > 0 ? (
                        <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                            <table className="min-w-full divide-y divide-border">
                                <thead className="bg-header">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Nombre del Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Fecha de Inscripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-surface divide-y divide-border">
                                    {enrollments.map(e => (
                                        <tr key={e.enrollmentID} className="hover:bg-background">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{e.courseName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(e.enrollmentDate).toLocaleDateString('es-ES')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => handleUnenroll(e.enrollmentID)} className="text-xs py-1 px-2 rounded bg-danger text-text-on-primary hover:bg-danger-dark font-medium">
                                                    Eliminar inscripción
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <div className="text-center p-6 bg-surface rounded-lg shadow">
                             <h2 className="text-xl text-info-dark">Este usuario no tiene inscripciones.</h2>
                        </div>
                    )}
                </>
            )}
             <div className="mt-6">
                <Link to="/enrollments" className="text-info hover:underline">
                    &larr; Volver a la lista de estudiantes
                </Link>
            </div>
        </div>
    );
};

export default StudentEnrollmentListPage;