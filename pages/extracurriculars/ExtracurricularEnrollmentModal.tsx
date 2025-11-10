import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ExtracurricularActivity, User, EnrolledStudent } from '../../types';
import Modal from '../../components/Modal';

interface ExtracurricularEnrollmentModalProps {
    activity: ExtracurricularActivity;
    onClose: () => void;
}

const ExtracurricularEnrollmentModal: React.FC<ExtracurricularEnrollmentModalProps> = ({ activity, onClose }) => {
    const { user } = useAuth();
    const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
    const [allStudents, setAllStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [enrolling, setEnrolling] = useState(false);

    const fetchEnrolledStudents = useCallback(async () => {
        if (user?.schoolId) {
            try {
                const data = await apiService.getStudentsByActivity(activity.activityID, user.schoolId);
                setEnrolledStudents(data);
            } catch (err) {
                 // API returns 404 if no students are enrolled, which is not a critical error here
                if (err instanceof Error && err.message.includes('404')) {
                    setEnrolledStudents([]);
                } else {
                    setError('No se pudieron cargar los estudiantes inscritos.');
                }
            }
        }
    }, [activity.activityID, user?.schoolId]);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (user?.schoolId) {
                setLoading(true);
                await Promise.all([
                    fetchEnrolledStudents(),
                    apiService.getStudents(user.schoolId).then(setAllStudents)
                ]);
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [user?.schoolId, fetchEnrolledStudents]);

    const availableStudents = useMemo(() => {
        const enrolledIds = new Set(enrolledStudents.map(s => s.userID));
        const filtered = allStudents.filter(s => !enrolledIds.has(s.userID));
        if (!searchTerm) return filtered;
        return filtered.filter(s => s.userName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allStudents, enrolledStudents, searchTerm]);

    const handleEnroll = async () => {
        if (!selectedStudentId || !user?.schoolId) {
            setError("Por favor, seleccione un estudiante.");
            return;
        }
        setEnrolling(true);
        setError('');
        setSuccess('');
        try {
            await apiService.enrollStudentInActivity({
                UserID: parseInt(selectedStudentId),
                ActivityID: activity.activityID,
                SchoolID: user.schoolId
            });
            setSuccess('Estudiante inscrito correctamente.');
            setSelectedStudentId('');
            setSearchTerm('');
            fetchEnrolledStudents(); // Refresh enrolled list
        } catch (err: any) {
            setError(err.message || 'Error al inscribir al estudiante.');
        } finally {
            setEnrolling(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Inscripciones - ${activity.name}`}>
            {error && <p className="bg-danger-light text-danger-text p-2 rounded mb-3">{error}</p>}
            {success && <p className="bg-success-light text-success-text p-2 rounded mb-3">{success}</p>}

            <div className="space-y-6">
                {/* Section to add a student */}
                <div className="p-4 border rounded-lg bg-background">
                    <h3 className="font-semibold text-lg mb-3">Inscribir Nuevo Estudiante</h3>
                    <div className="space-y-2">
                         <input
                            type="text"
                            placeholder="Buscar estudiante por nombre..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-border rounded"
                        />
                        <select
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            className="w-full p-2 border border-border rounded"
                        >
                            <option value="">-- Seleccionar estudiante --</option>
                            {availableStudents.map(student => (
                                <option key={student.userID} value={student.userID}>{student.userName}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleEnroll}
                            disabled={!selectedStudentId || enrolling}
                            className="w-full bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary"
                        >
                            {enrolling ? 'Inscribiendo...' : 'Inscribir'}
                        </button>
                    </div>
                </div>

                {/* Section to view enrolled students */}
                <div>
                    <h3 className="font-semibold text-lg mb-3">Estudiantes Inscritos ({enrolledStudents.length})</h3>
                    {loading ? <p>Cargando...</p> : enrolledStudents.length > 0 ? (
                        <ul className="max-h-60 overflow-y-auto divide-y divide-border border rounded-md p-2">
                            {enrolledStudents.map(student => (
                                <li key={student.userID} className="py-2 px-2">
                                    {student.studentName}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-secondary text-sm p-4 text-center bg-background rounded-md">
                            No hay estudiantes inscritos en esta actividad.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4 mt-6 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default ExtracurricularEnrollmentModal;