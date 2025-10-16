import React, { useEffect, useState } from 'react';
import { Notification, User } from '../../types';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import Modal from '../../components/Modal';

interface ParentNotificationsModalProps {
    user: User;
    onClose: () => void;
}

const ParentNotificationsModal: React.FC<ParentNotificationsModalProps> = ({ user, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user: authUser } = useAuth();

    useEffect(() => {
        if (authUser?.schoolId) {
            setLoading(true);
            // Assuming this endpoint exists, as per MVC logic
            apiService.getParentNotifications(user.userID, authUser.schoolId)
                .then(data => {
                    setNotifications(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
                })
                .catch(() => setError('No se pudieron cargar las notificaciones.'))
                .finally(() => setLoading(false));
        }
    }, [user, authUser]);

    return (
        <Modal isOpen={true} onClose={onClose} title={`Notificaciones de ${user.userName}`}>
            {loading && <p>Cargando notificaciones...</p>}
            {error && <p className="text-danger">{error}</p>}
            
            {!loading && !error && (
                notifications.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-header text-text-on-primary">
                                <tr>
                                    <th className="px-4 py-2 text-left">Título</th>
                                    <th className="px-4 py-2 text-left">Contenido</th>
                                    <th className="px-4 py-2 text-left">Fecha</th>
                                    <th className="px-4 py-2 text-left">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-surface divide-y divide-border">
                                {notifications.map(n => (
                                    <tr key={n.notifyID}>
                                        <td className="px-4 py-2 font-semibold">{n.title}</td>
                                        <td className="px-4 py-2">{n.content}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{new Date(n.date).toLocaleString('es-ES')}</td>
                                        <td className="px-4 py-2">
                                            {n.isRead ? 
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-light text-success-text">Leída</span> : 
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-light text-danger-text">No Leída</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-secondary">Este padre no tiene notificaciones.</p>
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

export default ParentNotificationsModal;