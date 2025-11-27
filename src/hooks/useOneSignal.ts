import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';

export const useOneSignal = () => {
  const [initialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const initOneSignal = async () => {
      try {
        // Replace 'YOUR_ONESIGNAL_APP_ID' with your actual OneSignal App ID
        const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || 'YOUR_ONESIGNAL_APP_ID';
        
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          allowLocalhostAsSecureOrigin: true,
          serviceWorkerParam: {
            scope: '/push/onesignal/'
          },
          serviceWorkerPath: 'OneSignalSDKWorker.js'
        });

        // Show native permission prompt
        const permission = await OneSignal.Notifications.requestPermission();
        setPermissionGranted(permission);
        
        setInitialized(true);

        // Log for debugging
        console.log('OneSignal initialized successfully');
      } catch (error) {
        console.error('OneSignal initialization error:', error);
      }
    };

    initOneSignal();
  }, []);

  const sendNotification = async (title: string, message: string, data?: any) => {
    if (!initialized || !permissionGranted) {
      console.warn('OneSignal not initialized or permission not granted');
      return;
    }

    try {
      // Tag user for segmentation if needed
      await OneSignal.User.addTag('active_user', 'true');
      
      // You can send notifications from your backend using OneSignal REST API
      // This is just for local testing
      console.log('Notification triggered:', { title, message, data });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  return {
    initialized,
    permissionGranted,
    sendNotification
  };
};
