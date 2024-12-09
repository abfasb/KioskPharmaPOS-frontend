import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../../config/firebase';
import AdminPanel from '../../components/admin/AdminPanel';
import AddProduct from '../../components/admin/AddProduct';
import Inventory from '../../components/admin/Inventory';
import UserManagement from '../../components/admin/UserManagement';
import Product from '../../components/admin/Product';
import Analytics from '../../components/admin/Analytics';
import Notifications from '../../components/admin/Notifications';
import PrescriptionManagement from '../../components/admin/PrescriptionManagement';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css'; // Import Toastify styles
import PrescriptionVerification from '../../components/admin/PrescriptionVerification';
import OrderKiosk from '../../components/admin/OrderKiosk';
import Contact from '../../components/admin/Contact';

function AdminSide() {
  const navigate = useNavigate();
  const [activeComponent, setActiveComponent] = useState('Dashboard');
  const [adminCredential, setAdminCredential] = useState(JSON.parse(localStorage.getItem('adminCredentials')));
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const isAdminAuthenticated = sessionStorage.getItem('isAdminAuthenticated');
    if (!isAdminAuthenticated) {
      navigate('/login');
    }
    requestNotificationPermission();
  }, [navigate]);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Foreground notification received:', payload);
      const newNotification = {
        title: payload.notification.title,
        message: payload.notification.body,
        timestamp: new Date(),
      };
      toast.info(`New notification: ${payload.notification.title}`, { position: 'top-right', autoClose: 5000 });
    

      setNotifications((prevNotifications) => [newNotification, ...prevNotifications]);
    });

    return () => unsubscribe();
  }, []);

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
        });
        console.log('FCM Token:', token);
        const email = adminCredential.email;
        if (email) {
          await sendFCMTokenToBackend(email, token);
          setIsPermissionGranted(true);
        } else {
          console.error('User is not authenticated');
        }
      } else {
        console.error('Notification permission denied');
      }
    } catch (error) {
      console.error('Error getting notification permission or token', error);
    }
  };

  const sendFCMTokenToBackend = async (email, token) => {
    try {
      await fetch('http://localhost:5000/save-fcm-token/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
    } catch (error) {
      console.error('Error sending FCM token to server:', error);
    }
  };

  const renderComponent = () => {
    switch (activeComponent) {
      case 'Dashboard':
        return <AddProduct />;
      case 'User Management':
        return <UserManagement />;
      case 'Sales And Product':
        return <Product />;
      case 'Inventory':
        return <Inventory />;
      case 'Analytics':
        return <Analytics />;
      case 'Notifications And Messages':
        return <Notifications />;
      case 'Prescription Verification':
        return <PrescriptionVerification />;
      case 'Kiosk':
        return <OrderKiosk />;
        case 'Contact':
        return <Contact />;
      default:
        return <AddProduct />;
    }
  };

  return (
    <>
      <AdminPanel setActiveComponent={setActiveComponent} activeComponent={activeComponent} />
      <div className="flex-1 p-2">
        {renderComponent()}
      </div>
      <ToastContainer />
    </>
  );
}

export default AdminSide;
