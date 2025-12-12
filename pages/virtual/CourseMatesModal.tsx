
import React, { useEffect, useState } from 'react';
import { Student } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';
import { ChatBubbleIcon } from '../../components/icons';

interface CourseMatesModalProps {
    courseId: number;
    courseName: string;
    onClose: () => void;
}

const CourseMatesModal: React.FC<CourseMatesModalProps> = ({ courseId, courseName, onClose }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.schoolId) {
            setLoading(true);
            apiService.getStudentsByCourse(courseId, user.schoolId)
                .then(studentData => {
                    // Ensure studentData is an array before filtering
                    const safeStudentData = Array.isArray(studentData) ? studentData : [];
                    // Filter out the current user if they are a student in the list (convert to string to be safe)
                    const currentUserId = String(user.userId);
                    const filteredStudents = safeStudentData.filter(student => String(student.studentID) !== currentUserId);
                    setStudents(filteredStudents);
                })
                .catch((err) => {
                    console.error(err);
                    setError('No se pudieron cargar los compañeros de clase.');
                })
                .finally(() => setLoading(false));
        }
    }, [courseId, user]);

    const getModalTitle = () => {
        if (user && [1, 3, 11].includes(user.roleId)) { // Estudiante, Representante, Madre
            return `Compañeros en ${courseName}`;
        }
        return `Estudiantes en ${courseName}`;
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={getModalTitle()}>
            {loading && <p>Cargando lista...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                students.length > 0 ? (
                    <div className="overflow-y-auto max-h-96">
                        <ul className="divide-y divide-border -mx-2">
                            {students.map(student => (
                                <li key={student.studentID} className="px-2 py-3 flex justify-between items-center">
                                    <span>{student.studentName}</span>
                                    {/* Chat integration point */}
                                    <div className="text-primary p-1 rounded-full bg-background" title={`Estudiante #${student.studentID}`}>
                                        <ChatBubbleIcon />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-secondary">No hay otros estudiantes inscritos en este curso.</p>
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

export default CourseMatesModal;