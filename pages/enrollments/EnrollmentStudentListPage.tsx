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
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Inscripciones de Estudiantes</h1>
            <div className="mb-4">
                <input
                    type="text"
                    id="searchInput"
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brand-yellow/50"
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {loading && <p>Cargando estudiantes...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (
                <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-main-blue">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Correo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.map((student) => (
                                <tr key={student.userID} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{student.userName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-2">
                                            <Link to={`/enrollments/student/${student.userID}`} className="text-blue-600 hover:text-blue-800 font-medium">Ver inscripciones</Link>
                                            <Link to={`/enrollments/assign/${student.userID}`} className="text-yellow-600 hover:text-yellow-800 font-medium">Asignar a curso</Link>
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