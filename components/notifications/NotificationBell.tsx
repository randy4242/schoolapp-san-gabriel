
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { BellIcon } from '../icons';
import { Link, useNavigate } from 'react-router-dom';
import { Notification } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import RejectUnlockRequestModal from './RejectUnlockRequestModal';
import { apiService } from '../../services/apiService';

// Helper to parse special notification content
const parseNotificationContent = (notification: Notification): { 
    cleanTitle: string, 
    text: string, 
    actionLink: string | null,
    isUnlockRequest: boolean,
    evalId: string | null,
    requestingUserId: string | null,
    evaluationName: string | null,
    certId: string | null
} => {
    let cleanTitle = notification.title;
    let text = notification.content;
    let actionLink: string | null = null;
    let isUnlockRequest = false;
    let evalId: string | null = null;
    let requestingUserId: string | null = null;
    let evaluationName: string | null = null;
    let certId: string | null = null;

    // Generic URL parsing
    const urlMatch = text.match(/URL: (#[^\s]+)/);
    if (urlMatch) {
        actionLink = urlMatch[1];
        text = text.replace(/URL: .*/, '').trim();
    }

    if (notification.title.startsWith('[UNLOCK_REQUEST]')) {
        isUnlockRequest = true;

        const evalIdMatch = notification.title.match(/\[EVAL_ID:(\d+)\]/);
        const userIdMatch = notification.title.match(/\[USER_ID:(\d+)\]/);
        const evalNameMatch = notification.title.match(/\[EVAL_NAME:(.*?)\]/);
        
        if (evalIdMatch) evalId = evalIdMatch[1];
        if (userIdMatch) requestingUserId = userIdMatch[1];
        if (evalNameMatch) evaluationName = evalNameMatch[1];
        
        cleanTitle = notification.title.replace(/\[.*?\]/g, '').trim();
    }
    
    // Boleta Notifications Parsing (Teacher/Admin side)
    if (notification.title.startsWith('[BOLETA_REQUEST]')) {
        cleanTitle = notification.title.replace('[BOLETA_REQUEST]', '').replace(/\[ID:\d+\]/, '').trim();
    }
    if (notification.title.startsWith('[BOLETA_STATUS]')) {
        cleanTitle = notification.title.replace('[BOLETA_STATUS]', '').trim();
    }

    // Parent Boleta Notification parsing (from SQL Trigger)
    const certIdMatch = notification.content.match(/\[CERT_ID:(\d+)\]/);
    if (certIdMatch) {
        certId = certIdMatch[1];
        text = text.replace(certIdMatch[0], '').trim(); // Remove tag from view
    }

    return { cleanTitle, text, actionLink, isUnlockRequest, evalId, requestingUserId, evaluationName, certId };
};


const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { hasPermission, user } = useAuth();
    const isSuperAdmin = hasPermission([6]);
    const isParent = user?.roleId === 3;

    const [rejectionDetails, setRejectionDetails] = useState<{
        evalId: string;
        requestingUserId: string;
        title: string;
        notificationId: number;
    } | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleBellClick = () => {
        // Only mark as read when opening the dropdown and there are unread notifications
        if (!isOpen && unreadCount > 0) {
            markAllAsRead();
        }
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (id: number) => {
        markAsRead(id);
    };
    
    const handleDoubleClick = () => {
        navigate('/notifications/list');
        setIsOpen(false);
    };

    const handleRejectionSuccess = () => {
        alert('Notificación de rechazo enviada.');
        if (rejectionDetails) {
            markAsRead(rejectionDetails.notificationId);
        }
    };

    const handleViewCertificate = async (e: React.MouseEvent, certId: string) => {
        e.stopPropagation();
        if (!user?.schoolId) return;
        
        try {
            const certificate = await apiService.getCertificateById(Number(certId), user.schoolId);
            // Fetch student name if missing to ensure report looks good
            if (!certificate.studentName) {
                const studentUser = await apiService.getUserById(certificate.userId, user.schoolId);
                certificate.studentName = studentUser.userName;
            }
            
            navigate('/report-viewer', { 
                state: { 
                    reportData: certificate, 
                    reportType: 'boleta' 
                } 
            });
            setIsOpen(false);
        } catch (error) {
            console.error("Failed to load certificate", error);
            alert("No se pudo cargar la boleta. Puede que haya sido eliminada.");
        }
    };

    const filteredNotifications = useMemo(() => {
        if (!isParent) return notifications;
        return notifications.filter(n => 
            n.title.toLowerCase().includes('boleta') || 
            n.title.toLowerCase().includes('calificaciones') || 
            n.content.includes('[CERT_ID:')
        );
    }, [notifications, isParent]);

    const displayUnreadCount = isParent 
        ? filteredNotifications.filter(n => !n.isRead).length 
        : unreadCount;

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={handleBellClick}
                onDoubleClick={handleDoubleClick}
                className="relative text-text-primary hover:text-accent transition-colors p-2 rounded-full hover:bg-background"
                aria-label={`Notificaciones (${displayUnreadCount} sin leer)`}
            >
                <BellIcon className="w-6 h-6" />
                {displayUnreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-5 w-5 rounded-full bg-danger text-text-on-primary text-xs font-bold flex items-center justify-center ring-2 ring-surface">
                        {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-surface rounded-lg shadow-xl border border-border z-50">
                    <div className="p-3 flex justify-between items-center border-b">
                        <h3 className="font-semibold text-text-primary">Notificaciones</h3>
                    </div>
                    <ul className="max-h-96 overflow-y-auto divide-y divide-border">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.slice(0, 10).map(n => {
                                const { cleanTitle, text, actionLink, isUnlockRequest, evalId, requestingUserId, evaluationName, certId } = parseNotificationContent(n);
                                return (
                                <li key={n.notifyID} onClick={() => handleNotificationClick(n.notifyID)} className={`p-3 hover:bg-background cursor-pointer ${!n.isRead ? 'bg-info-light/30' : ''}`}>
                                    <div className="flex items-start">
                                        {!n.isRead && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>}
                                        <div className="flex-1">
                                            <p className={`font-semibold text-sm ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>{cleanTitle}</p>
                                            <p className="text-xs text-text-secondary mt-1">{text}</p>
                                            <div className="flex items-center space-x-2 mt-2">
                                                {actionLink && !isParent && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent parent onClick
                                                            navigate(actionLink.substring(1)); // Remove '#' for router
                                                            setIsOpen(false);
                                                        }}
                                                        className="text-xs font-bold py-1 px-2 rounded bg-accent text-white hover:bg-accent/80"
                                                    >
                                                        Ver
                                                    </button>
                                                )}
                                                {certId && (
                                                    <button 
                                                        onClick={(e) => handleViewCertificate(e, certId)}
                                                        className="text-xs font-bold py-1 px-2 rounded bg-success text-white hover:bg-success-dark"
                                                    >
                                                        Ver Boleta
                                                    </button>
                                                )}
                                                {isUnlockRequest && isSuperAdmin && evalId && requestingUserId && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRejectionDetails({ evalId, requestingUserId, title: evaluationName || cleanTitle, notificationId: n.notifyID });
                                                            setIsOpen(false);
                                                        }}
                                                        className="text-xs font-bold py-1 px-2 rounded bg-danger text-white hover:bg-danger-dark"
                                                    >
                                                        Rechazar
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-xs text-text-tertiary mt-2">{new Date(n.date).toLocaleString('es-ES')}</p>
                                        </div>
                                    </div>
                                </li>
                            )})
                        ) : (
                            <li className="p-4 text-center text-sm text-text-secondary">No tienes notificaciones.</li>
                        )}
                    </ul>
                     <div className="p-2 border-t text-center">
                        <Link to="/notifications/list" onClick={() => setIsOpen(false)} className="text-sm font-medium text-primary hover:underline">
                            Ver todas las notificaciones
                        </Link>
                    </div>
                </div>
            )}
            {rejectionDetails && (
                <RejectUnlockRequestModal
                    isOpen={!!rejectionDetails}
                    onClose={() => setRejectionDetails(null)}
                    evaluationId={rejectionDetails.evalId}
                    requestingUserId={rejectionDetails.requestingUserId}
                    evaluationTitle={rejectionDetails.title}
                    onSuccess={handleRejectionSuccess}
                />
            )}
        </div>
    );
};

export default NotificationBell;
