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
            <style>{`
                .btn-danger {
                    background-color: #D61616;
                    color: white;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.875rem;
                    line-height: 1.25rem;
                    font-weight: 500;
                    border: none;
                }
                .btn-danger:hover {
                    background-color: #b01212;
                }
                .btn-sm {
                    padding: 0.25rem 0.5rem;
                    font-size: .875rem;
                    border-radius: .2rem;
                }
            `}</style>

            <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">
                Inscripciones de <span className="text-brand-yellow">{student?.userName || '...'}</span>
            </h1>
            
            {loading && <p className="text-center">Cargando...</p>}
            {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-md">{error}</p>}
            
            {!loading && !error && (
                <>
                    <div className="mb-4">
                        <Link to={`/enrollments/assign/${userId}`} className="bg-main-blue text-white py-2 px-4 rounded hover:bg-black transition-colors">
                            Asignar a Nuevo Curso
                        </Link>
                    </div>
                    {enrollments.length > 0 ? (
                        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-main-blue">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Nombre del Curso</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Fecha de Inscripción</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {enrollments.map(e => (
                                        <tr key={e.enrollmentID} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{e.courseName}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{new Date(e.enrollmentDate).toLocaleDateString('es-ES')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button onClick={() => handleUnenroll(e.enrollmentID)} className="btn-sm btn-danger">
                                                    Eliminar inscripción
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <div className="text-center p-6 bg-white rounded-lg shadow">
                             <h2 className="text-xl text-red-600">Este usuario no tiene inscripciones.</h2>
                        </div>
                    )}
                </>
            )}
             <div className="mt-6">
                <Link to="/enrollments" className="text-blue-600 hover:underline">
                    &larr; Volver a la lista de estudiantes
                </Link>
            </div>
        </div>
    );
};

export default StudentEnrollmentListPage;
