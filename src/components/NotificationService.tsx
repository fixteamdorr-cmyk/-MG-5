import React, { useEffect } from 'react';
import { auth, db, messaging } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, limit, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { toast, Toaster } from 'sonner';

export const NotificationService: React.FC = () => {
  useEffect(() => {
    let unsubscribeFirestore: () => void;
    let unsubscribePrefs: () => void;

    const setupNotifications = async () => {
      const user = auth.currentUser;
      if (!user) return;

      // 1. Request FCM Permission & Token (Best Effort)
      try {
        const msg = await messaging();
        if (msg) {
          const token = await getToken(msg, {
            vapidKey: 'YOUR_VAPID_KEY' // User would need to provide this in settings
          });
          if (token) {
            console.log('FCM Token:', token);
          }

          onMessage(msg, (payload) => {
            toast.success(payload.notification?.title || 'إشعار جديد', {
              description: payload.notification?.body,
              duration: 5000,
            });
          });
        }
      } catch (err) {
        console.warn('FCM setup failed:', err);
      }

      // 2. Firestore Real-Time Notifications
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false),
        orderBy('timestamp', 'desc'),
        limit(5)
      );

      // Listen to preferences in real-time
      let currentPrefs = { pushEnabled: true, tripUpdates: true, promotional: true };
      const prefRef = doc(db, 'user_preferences', user.uid);
      unsubscribePrefs = onSnapshot(prefRef, (docSnap) => {
        if (docSnap.exists()) {
          currentPrefs = docSnap.data().notifications;
        }
      });

      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            
            // Filter based on preferences
            const isTripUpdate = ['driver_arrival', 'trip_start', 'trip_complete'].includes(data.type);
            const isPromotional = data.type === 'promotional';
            
            if (isTripUpdate && !currentPrefs.tripUpdates) return;
            if (isPromotional && !currentPrefs.promotional) return;
            if (!currentPrefs.pushEnabled) return; // If push (in-app here) is disabled globally

            // Avoid showing notifications that are too old
            const now = Date.now();
            const timestamp = data.timestamp?.toMillis() || now;
            
            if (now - timestamp < 10000) { // Only show if added in the last 10 seconds
              const isArrival = data.type === 'driver_arrival';
              
              toast(data.title || 'تنبيه جديد', {
                description: data.body,
                style: isArrival ? {
                  backgroundColor: '#FACC15', // yellow-400
                  color: '#000000',
                  fontWeight: 'bold',
                  border: 'none'
                } : {},
                action: {
                  label: 'تم القراءة',
                  onClick: () => {
                    updateDoc(doc(db, 'notifications', change.doc.id), { read: true });
                  },
                },
              });
            }
          }
        });
      }, (err) => {
        console.error('Firestore notification listener error:', err);
      });
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setupNotifications();
      } else {
        if (unsubscribeFirestore) unsubscribeFirestore();
        if (unsubscribePrefs) unsubscribePrefs();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribePrefs) unsubscribePrefs();
    };
  }, []);

  return <Toaster position="top-center" expand={true} richColors />;
};

// Helper function to send a notification (usually called from server, but here for demo)
export const sendNotification = async (userId: string, title: string, body: string, type: string) => {
  try {
    const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
    await addDoc(collection(db, 'notifications'), {
      userId,
      title,
      body,
      type,
      read: false,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to send notification:', err);
  }
};
