import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notification';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function useNotifications() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const hasLoaded = useRef(false);
    const [pushSupported, setPushSupported] = useState(false);
    const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        if (!hasLoaded.current) setIsLoading(true);

        const { data, error } = await supabase
            .from('fdc_notifications')
            .select('*')
            .eq('recipient_id', user.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            const mapped: Notification[] = data.map(n => ({
                id: n.id,
                userId: n.recipient_id,
                type: n.type as any,
                title: n.title,
                body: n.body,
                isRead: n.is_read,
                createdAt: n.created_at,
                linkTo: n.data?.linkTo
            }));
            setNotifications(mapped);
        }

        setIsLoading(false);
        hasLoaded.current = true;
    }, [user]);

    useEffect(() => {
        fetchNotifications();

        if (!user) return;

        const channel = supabase
            .channel(`public:fdc_notifications:${user.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'fdc_notifications',
                filter: `recipient_id=eq.${user.id}`
            }, () => {
                fetchNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchNotifications, user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('fdc_notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        }
    };

    const markAllAsRead = async () => {
        if (!user) return;

        const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
        if (unreadIds.length === 0) return;

        const { error } = await supabase
            .from('fdc_notifications')
            .update({ is_read: true })
            .in('id', unreadIds);

        if (!error) {
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }
    };

    // Push notification support
    useEffect(() => {
        const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
        setPushSupported(supported);
        if (supported) {
            setPushPermission(window.Notification.permission);
        }
    }, []);

    const subscribeToPush = useCallback(async () => {
        if (!user || !pushSupported || !VAPID_PUBLIC_KEY) return false;

        try {
            const permission = await window.Notification.requestPermission();
            setPushPermission(permission);
            if (permission !== 'granted') return false;

            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
                });
            }

            const subJson = subscription.toJSON();
            await supabase.from('fdc_push_subscriptions').upsert({
                user_id: user.id,
                endpoint: subJson.endpoint,
                p256dh: subJson.keys?.p256dh,
                auth: subJson.keys?.auth,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'endpoint' });

            return true;
        } catch (err) {
            console.error('Push subscription failed:', err);
            return false;
        }
    }, [user, pushSupported]);

    const unsubscribeFromPush = useCallback(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                const endpoint = subscription.endpoint;
                await subscription.unsubscribe();
                await supabase.from('fdc_push_subscriptions').delete().eq('endpoint', endpoint);
            }
        } catch (err) {
            console.error('Push unsubscribe failed:', err);
        }
    }, []);

    return {
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        refresh: fetchNotifications,
        pushSupported,
        pushPermission,
        subscribeToPush,
        unsubscribeFromPush,
    };
}
