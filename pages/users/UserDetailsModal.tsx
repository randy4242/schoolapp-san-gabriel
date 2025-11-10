import React, { useEffect, useState, useMemo } from 'react';
import { User, UserDetails, ROLES, Course, MedicalInfo } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface UserDetailsModalProps {
    user: User;
    onClose: () => void;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <dt className="text-sm font-medium text-text-secondary">{label}</dt>
        <dd className="mt-1 text-sm text-text-primary">{value || '—'}</dd>
    </div>
);

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ user, onClose }) => {
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: authUser } = useAuth();

    useEffect(() => {
        if (authUser?.schoolId) {
            setLoading(true);
            Promise.all([
                apiService.getUserDetails(user.userID, authUser.schoolId),
                apiService.getCourses(authUser.schoolId),
                apiService.getMedicalInfo(user.userID, authUser.schoolId).catch(() => null)
            ]).then(([detailsData, coursesData, medicalData]) => {
                setDetails(detailsData);
                setCourses(coursesData);
                setMedicalInfo(medicalData);
            }).catch(() => setError('No se pudieron cargar los detalles del usuario.'))
              .finally(() => setLoading(false));
        }
    }, [user, authUser]);

    const courseIdToNameMap = useMemo(() => {
        return new Map(courses.map(c => [c.courseID, c.name]));
    }, [courses]);

    const getRoleName = (roleId: number) => {
        return ROLES.find(r => r.id === roleId)?.name || 'Desconocido';
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Detalles de ${user.userName}`}>
            {loading && <p>Cargando detalles...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && details && (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium leading-6 text-text-primary border-b pb-2 mb-4">Información del Usuario</h3>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <DetailItem label="Nombre Completo" value={details.userName} />
                            <DetailItem label="Email" value={details.email} />
                            <DetailItem label="Cédula" value={details.cedula} />
                            <DetailItem label="Teléfono" value={details.phoneNumber} />
                            <DetailItem label="Rol" value={getRoleName(details.roleID)} />
                            <DetailItem label="Estado" value={
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${details.isBlocked ? 'bg-danger-light text-danger-text' : 'bg-success-light text-success-text'}`}>
                                    {details.isBlocked ? 'Bloqueado' : 'Activo'}
                                </span>
                            } />
                        </dl>
                    </div>

                    <div>
                        <h3 className="text-lg font-medium leading-6 text-text-primary border-b pb-2 mb-4">Información Académica</h3>
                         <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <DetailItem label="Colegio" value={details.school.name} />
                            <DetailItem label="Año Escolar" value={details.school.schoolYear} />
                            <DetailItem label="Salón de Clases" value={details.classroom?.name} />
                        </dl>
                    </div>

                    {details.roleID === 1 && (
                        <div>
                            <h3 className="text-lg font-medium leading-6 text-text-primary border-b pb-2 mb-4">Información Médica</h3>
                            {medicalInfo ? (
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                                    <DetailItem label="Tipo de Sangre" value={medicalInfo.bloodType} />
                                    <DetailItem label="Alergias" value={medicalInfo.allergies} />
                                    <DetailItem label="Condiciones Crónicas" value={medicalInfo.chronicConditions} />
                                    <DetailItem label="Medicamentos" value={medicalInfo.medications} />
                                    <DetailItem label="Contacto de Emergencia" value={medicalInfo.emergencyContactName} />
                                    <DetailItem label="Teléfono de Emergencia" value={medicalInfo.emergencyContactPhone} />
                                    <div className="sm:col-span-2">
                                        <DetailItem label="Notas Adicionales" value={medicalInfo.notes} />
                                    </div>
                                </dl>
                            ) : (
                                <p className="text-sm text-text-secondary">No hay información médica registrada para este estudiante.</p>
                            )}
                        </div>
                    )}

                    <div>
                        <h3 className="text-lg font-medium leading-6 text-text-primary border-b pb-2 mb-4">Inscripciones</h3>
                        {details.enrollments.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {details.enrollments.map(e => (
                                    <span key={e.enrollmentID} className="text-sm bg-info-light text-info-text px-2.5 py-1 rounded-full">
                                        {courseIdToNameMap.get(e.courseID) || `Curso ID: ${e.courseID}`}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-text-secondary">No está inscrito en ningún curso.</p>
                        )}
                    </div>
                </div>
            )}
             <div className="flex justify-end pt-4 mt-6 border-t">
                <button type="button" onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                    Cerrar
                </button>
            </div>
        </Modal>
    );
};

export default UserDetailsModal;