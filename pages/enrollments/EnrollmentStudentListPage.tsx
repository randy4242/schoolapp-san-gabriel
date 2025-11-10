import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';

const EnrollmentStudentListPage: React.FC = () => {
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        const fetchStudents = async () => {
            if (user?.schoolId) {
                try {
                    setLoading(true);
                    const data = await apiService.getStudents(user.schoolId);
                    setStudents(data);
                } catch (err) {
                    setError('No se pudo cargar la lista de estudiantes.');
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchStudents();
    }, [user]);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;
        return students.filter(s => s.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [students, searchTerm]);

    return (
        <div>
            <h1 className="text-2xl font-bold text-text-primary mb-4">Inscripciones de Estudiantes</h1>
            <div className="mb-4">
                <input
                    type="text"
                    id="searchInput"
                    className="w-full p-2 border border-border rounded focus:outline-none focus:ring-2 focus:ring-accent/50"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading && <p>Cargando estudiantes...</p>}
            {error && <p className="text-danger">{error}</p>}

            {!loading && !error && (
                <div className="bg-surface shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-header">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Correo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-on-primary uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-surface divide-y divide-border">
                            {filteredStudents.map((student) => (
                                <tr key={student.userID} className="hover:bg-background">
                                    <td className="px-6 py-4 whitespace-nowrap">{student.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-4">
                                            <Link to={`/enrollments/student/${student.userID}`} className="text-info hover:text-info-dark font-medium">Ver inscripciones</Link>
                                            <Link to={`/enrollments/assign/${student.userID}`} className="text-warning hover:text-warning-dark font-medium">Asignar a curso</Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EnrollmentStudentListPage;