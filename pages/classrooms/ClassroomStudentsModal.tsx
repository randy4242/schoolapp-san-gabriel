import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import StudentGradesModal from '../students/StudentGradesModal';
import StudentAttendanceStatsModal from '../students/StudentAttendanceStatsModal';

interface ClassroomStudentsModalProps {
    classroomId: number;
    classroomName: string;
    onClose: () => void;
}

const ClassroomStudentsModal: React.FC<ClassroomStudentsModalProps> = ({ classroomId, classroomName, onClose }) => {
    const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();
    
    const [viewingGradesFor, setViewingGradesFor] = useState<User | null>(null);
    const [viewingStatsFor, setViewingStatsFor] = useState<User | null>(null);

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getStudentsByClassroom(classroomId, user.schoolId)
                .then(setStudents)
                .catch(() => setError('No se pudieron cargar los estudiantes.'))
                .finally(() => setLoading(false));
        }
    }, [classroomId, user]);

    if (viewingGradesFor) {
        return <StudentGradesModal 
                 student={viewingGradesFor} 
                 classroomId={classroomId}
                 onClose={() => setViewingGradesFor(null)} 
               />
    }

    if (viewingStatsFor) {
        return <StudentAttendanceStatsModal 
                    student={viewingStatsFor}
                    onClose={() => setViewingStatsFor(null)}
                />
    }

    return (
        <Modal isOpen={true} onClose={onClose} title={`Estudiantes en ${classroomName}`}>
            {loading && <p>Cargando estudiantes...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                students.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Correo Electrónico</th>
                                    <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {students.map(student => (
                                    <tr key={student.userID}>
                                        <td className="px-6 py-4 whitespace-nowrap">{student.userName}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">{student.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center space-x-2 md:space-x-4">
                                            <button 
                                                onClick={() => setViewingGradesFor(student)}
                                                className="text-info hover:text-info-dark text-sm font-medium"
                                            >
                                                Ver notas
                                            </button>
                                            <button 
                                                onClick={() => setViewingStatsFor(student)}
                                                className="text-info hover:text-info-dark text-sm font-medium"
                                            >
                                                Ver estadísticas
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-secondary">No hay estudiantes asignados a este salón.</p>
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

export default ClassroomStudentsModal;