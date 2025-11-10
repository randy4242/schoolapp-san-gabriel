import React, { useEffect } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { XIcon } from '../icons';

const NotificationToast: React.FC<{ notification: any; onClose: () => void }> = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto-dismiss after 5 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="bg-surface rounded-lg shadow-2xl p-4 w-full max-w-sm border border-border animate-fade-in-down">
            <div className="flex items-start">
                <div className="flex-1">
                    <p className="font-bold text-primary">{notification.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{notification.content}</p>
                </div>
                <button onClick={onClose} className="ml-4 text-text-tertiary hover:text-text-primary">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};


const NotificationToasts: React.FC = () => {
    const { toasts, removeToast } = useNotifications();

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <NotificationToast
                    key={toast.notifyID}
                    notification={toast}
                    onClose={() => removeToast(toast.notifyID)}
                />
            ))}
        </div>
    );
};

export default NotificationToasts;