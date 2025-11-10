import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import RejectUnlockRequestModal from '../../components/notifications/RejectUnlockRequestModal';


// Helper to parse special notification content
const parseNotificationContent = (notification: Notification): { 
    cleanTitle: string, 
    text: string, 
    actionLink: string | null,
    isUnlockRequest: boolean,
    evalId: string | null,
    requestingUserId: string | null,
    evaluationName: string | null
} => {
    let cleanTitle = notification.title;
    let text = notification.content;
    let actionLink: string | null = null;
    let isUnlockRequest = false;
    let evalId: string | null = null;
    let requestingUserId: string | null = null;
    let evaluationName: string | null = null;

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
    return { cleanTitle, text, actionLink, isUnlockRequest, evalId, requestingUserId, evaluationName };
};

const NotificationListPage: React.FC = () => {
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const isSuperAdmin = hasPermission([6]);

  const [rejectionDetails, setRejectionDetails] = useState<{
    evalId: string;
    requestingUserId: string;
    title: string;
    notificationId: number;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRejectionSuccess = () => {
    setSuccessMessage('Notificación de rechazo enviada correctamente.');
    if (rejectionDetails) {
        // Mark the original request notification as read
        markAsRead(rejectionDetails.notificationId);
    }
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Todas las Notificaciones</h1>
        {notifications.some(n => !n.isRead) && (
            <button onClick={markAllAsRead} className="text-sm text-primary hover:underline">
                Marcar todas como leídas
            </button>
        )}
      </div>
      
      {successMessage && <div className="bg-success-light text-success-text p-3 rounded mb-4">{successMessage}</div>}
      {loading && <p>Cargando notificaciones...</p>}
      
      {!loading && notifications.length === 0 && (
        <div className="text-center py-8 bg-surface rounded-lg shadow-md">
          <p className="text-secondary">No tienes notificaciones.</p>
        </div>
      )}

      {!loading && notifications.length > 0 && (
        <div className="bg-surface shadow-md rounded-lg">
          <ul className="divide-y divide-border">
            {notifications.map(n => {
              const { cleanTitle, text, actionLink, isUnlockRequest, evalId, requestingUserId, evaluationName } = parseNotificationContent(n);
              return (
              <li 
                key={n.notifyID} 
                onClick={() => !n.isRead && markAsRead(n.notifyID)} 
                className={`p-4 transition-colors ${!n.isRead ? 'bg-info-light/20 hover:bg-info-light/40 cursor-pointer' : 'hover:bg-background'}`}
              >
                <div className="flex items-start">
                  {!n.isRead && <div className="w-2.5 h-2.5 bg-primary rounded-full mt-1.5 mr-4 flex-shrink-0" aria-label="No leída"></div>}
                  <div className={`flex-1 ${n.isRead ? 'pl-[26px]' : ''}`}>
                      <div className="flex justify-between items-baseline gap-4">
                          <p className={`font-semibold ${!n.isRead ? 'text-text-primary' : 'text-text-secondary'}`}>{cleanTitle}</p>
                          <p className="text-xs text-text-tertiary flex-shrink-0">{new Date(n.date).toLocaleString('es-ES')}</p>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">{text}</p>
                      <div className="flex items-center space-x-2 mt-2">
                          {actionLink && (
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation(); // Prevent parent onClick
                                      navigate(actionLink.substring(1)); // Remove '#' for router
                                  }}
                                  className="text-sm font-bold py-1 px-3 rounded bg-accent text-white hover:bg-accent/80"
                              >
                                  Ir a la Evaluación
                              </button>
                          )}
                          {isUnlockRequest && isSuperAdmin && evalId && requestingUserId && (
                              <button 
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      setRejectionDetails({ evalId, requestingUserId, title: evaluationName || cleanTitle, notificationId: n.notifyID });
                                  }}
                                  className="text-sm font-bold py-1 px-3 rounded bg-danger text-white hover:bg-danger-dark"
                              >
                                  Rechazar
                              </button>
                          )}
                      </div>
                  </div>
                </div>
              </li>
            )})}
          </ul>
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

export default NotificationListPage;