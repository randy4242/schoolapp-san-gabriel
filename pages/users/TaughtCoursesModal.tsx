import React, { useEffect, useState } from 'react';
import { Course, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface TaughtCoursesModalProps {
    user: User;
    onClose: () => void;
}

const TaughtCoursesModal: React.FC<TaughtCoursesModalProps> = ({ user, onClose }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: authUser } = useAuth();

    useEffect(() => {
        if (authUser?.schoolId) {
            setLoading(true);
            apiService.getTaughtCourses(user.userID, authUser.schoolId)
                .then(setCourses)
                .catch(() => setError('No se pudieron cargar los cursos.'))
                .finally(() => setLoading(false));
        }
    }, [user, authUser]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Cursos de ${user.userName}`}>
            {loading && <p>Cargando cursos...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                courses.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Curso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Descripción</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {courses.map(course => (
                                    <tr key={course.courseID}>
                                        <td className="px-6 py-4 whitespace-nowrap">{course.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{course.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-secondary">Este profesor no tiene cursos asignados.</p>
                )
            )}
             <div className="flex justify-end pt-4 mt-4 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default TaughtCoursesModal;