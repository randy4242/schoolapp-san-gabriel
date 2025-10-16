import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface CourseStudentsModalProps {
    courseId: number;
    courseName: string;
    onClose: () => void;
}

const CourseStudentsModal: React.FC<CourseStudentsModalProps> = ({ courseId, courseName, onClose }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getStudentsByCourse(courseId, user.schoolId)
                .then(setStudents)
                .catch(() => setError('No se pudieron cargar los estudiantes.'))
                .finally(() => setLoading(false));
        }
    }, [courseId, user]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Estudiantes en ${courseName}`}>
            {loading && <p>Cargando estudiantes...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                students.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre del Estudiante</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {students.map(student => (
                                    <tr key={student.studentID}>
                                        <td className="px-6 py-4 whitespace-nowrap">{student.studentName}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-secondary">No hay estudiantes inscritos en este curso.</p>
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

export default CourseStudentsModal;