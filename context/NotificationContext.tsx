import React, { createContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/apiService';
import { Notification } from '../types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  toasts: Notification[];
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeToast: (notificationId: number) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Notification[]>([]);
  const previousNotificationIds = useRef<Set<number>>(new Set());

  const fetchNotifications = useCallback(async (isPolling = false) => {
    if (!user) return;
    if (!isPolling) setLoading(true);

    try {
      const fetchedNotifications = await apiService.getUserNotifications(user.userId);
      const sortedNotifications = fetchedNotifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (isPolling) {
        const newNotifications = sortedNotifications.filter(
          n => !n.isRead && !previousNotificationIds.current.has(n.notifyID)
        );
        if (newNotifications.length > 0) {
          setToasts(currentToasts => [...newNotifications, ...currentToasts]);
        }
      }

      setNotifications(sortedNotifications);
      previousNotificationIds.current = new Set(sortedNotifications.map(n => n.notifyID));

    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchNotifications(false); // Initial fetch
      const intervalId = setInterval(() => fetchNotifications(true), 15000); // Poll every 15 seconds
      return () => clearInterval(intervalId);
    } else {
      setNotifications([]);
      setToasts([]);
      previousNotificationIds.current.clear();
    }
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: number) => {
    // Optimistic update for better UX
    setNotifications(current =>
      current.map(n => (n.notifyID === notificationId ? { ...n, isRead: true } : n))
    );
    try {
      await apiService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      // On error, revert state by refetching from server
      fetchNotifications(false);
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.every(n => n.isRead)) return;
    try {
      await apiService.markAllNotificationsAsRead(user.userId);
      // Refetch to ensure consistency and avoid race conditions with polling
      await fetchNotifications(false);
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [user, fetchNotifications, notifications]);

  const removeToast = (notificationId: number) => {
    setToasts(currentToasts => currentToasts.filter(t => t.notifyID !== notificationId));
  };
  
  const unreadCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, toasts, markAsRead, markAllAsRead, removeToast }}>
      {children}
    </NotificationContext.Provider>
  );
};