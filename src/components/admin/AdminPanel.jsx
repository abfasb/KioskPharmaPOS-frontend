import React from 'react';
import { useState, useEffect } from 'react';
import logo from '../../assets/img/logo.png'
import { useNavigate } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getMessaging, getToken } from 'firebase/messaging';
import { toast } from 'react-toastify';
import { db } from '../../config/firebase';
import { FcSelfServiceKiosk } from "react-icons/fc";
import MovingBanner from './MovingBanner';

const AdminPanel = ({ setActiveComponent, activeComponent }) => {
  
  const messaging = getMessaging();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stocks");
  const navigate = useNavigate();
  const logoutAdmin = () => {
    sessionStorage.removeItem('isAdminAuthenticated')
    localStorage.removeItem('adminCredentials');
    navigate('/login');
  }
  const adminEmail = sessionStorage.getItem('adminCredentials');

  const toggleDropdown = () => {
    setIsDropdownOpen((prevState) => !prevState);
  };

  const [productAlerts, setProductAlerts] = useState({
    stocks: [],
    orders: [],
    expiry: [],
  });

  useEffect(() => {
      const fetchProducts = async () => {
        const productsCollection = collection(db, "products");
        const snapshot = await getDocs(productsCollection);
        const products = snapshot.docs.map((doc) => doc.data());
      
        const today = new Date();
        const stocksAlerts = [];
        const expiryAlerts = [];
      
        await Promise.all(
          products.map(async (product) => {
            if (product.stockLevel && product.stockLevel < 10) {
              stocksAlerts.push(product.name);
              await sendNotification(`Low Stock Alert: ${product.name} is running low.`);
            }
        
            if (product.expirationDate && product.expirationDate.toDate) {
              const expiryDate = product.expirationDate.toDate();
              const daysUntilExpiry = differenceInDays(expiryDate, today);
        
              if (daysUntilExpiry <= 14 && daysUntilExpiry >= 0) {
                expiryAlerts.push({
                  name: product.name,
                  expiryDate: expiryDate,
                });
                await sendNotification(`Expiry Alert: ${product.name} is nearing expiry.`);
              }
            } else {
              console.warn(`Expiration date is missing for product: ${product.name}`);
            }
          })
        );
        

        const ordersCollection = collection(db, "transactions");
        const ordersSnapshot = await getDocs(ordersCollection);
        const orders = ordersSnapshot.docs.map((doc) => doc.data());
      
        console.log("Stocks Alerts:", stocksAlerts); 
        console.log("Expiry Alerts:", expiryAlerts);
      
        setProductAlerts({
          stocks: stocksAlerts,
          orders: orders,
          expiry: expiryAlerts,
        });
      };
    

    fetchProducts();

    const fetchTokenAndListen = async () => {
      try {
        const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY });

        if (token) {
          console.log("FCM Token:", token);
        } else {
          console.log("No FCM token found.");
        }
      } catch (error) {
        console.error("Error fetching FCM token:", error);
      }
    };

    fetchTokenAndListen();
  }, []);

  const sendNotification = (message) => {
    toast.info(message, {
      position: "top-right",
      autoClose: 5000,
    });

    console.log("Notification sent:", message);
  };


  return (
    <>
    <nav className="fixed top-0 z-50 w-full bg-blue-950 border-b-2 border-b-green-400">
      <div className="px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <img src={logo} alt="Checacio Logo" className="h-8" />
          <h1 className="text-xl font-bold text-green-500">Checacio's Store</h1>
        </div>

        <div className="flex-grow flex justify-center">
            <MovingBanner 
              expiryProducts={productAlerts.expiry} 
              outOfStockProducts={productAlerts.stocks} 
            />
          </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={toggleDropdown}
              type="button"
              className="relative text-white hover:text-green-400"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341A6.002 6.002 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m1 4a3 3 0 006 0H10z"
                />
              </svg>
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-blue-950"></span>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white shadow-lg rounded-lg">
                <div className="flex justify-between border-b border-gray-200">
                  <button
                    className={`w-1/3 py-2 text-center text-sm font-medium ${
                      activeTab === "stocks"
                        ? "text-green-500 border-b-2 border-green-500"
                        : "text-gray-600 hover:text-green-500"
                    }`}
                    onClick={() => setActiveTab("stocks")}
                  >
                    Stocks
                  </button>
                  <button
                    className={`w-1/3 py-2 text-center text-sm font-medium ${
                      activeTab === "orders"
                        ? "text-green-500 border-b-2 border-green-500"
                        : "text-gray-600 hover:text-green-500"
                    }`}
                    onClick={() => setActiveTab("orders")}
                  >
                    New Orders
                  </button>
                  <button
                    className={`w-1/3 py-2 text-center text-sm font-medium ${
                      activeTab === "expiry"
                        ? "text-green-500 border-b-2 border-green-500"
                        : "text-gray-600 hover:text-green-500"
                    }`}
                    onClick={() => setActiveTab("expiry")}
                  >
                    Expiry
                  </button>
                </div>

                <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-green-500 scrollbar-track-gray-100 rounded-lg">
                  {activeTab === "stocks" ? (
                    <>
                      {productAlerts.stocks.length > 0 ? (
                        productAlerts.stocks.map((product, index) => (
                          <p key={index} className="text-sm text-gray-700">
                            <span className="font-semibold text-green-500">{product}</span> is low in stock.
                          </p>
                        ))
                      ) : (
                        <p className="text-sm text-gray-700">All products are well-stocked.</p>
                      )}
                    </>
                  ) : activeTab === "orders" ? (
                    productAlerts.orders.length > 0 ? (
                      productAlerts.orders.map((order, index) => (
                        <div
                          key={index}
                          className="bg-white p-4 mb-4 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 ease-in-out"
                        >
                          {
                             productAlerts.orders.length > 0 ? (
                              productAlerts.orders.map((order, index) => (
                                <div
                                  key={index}
                                  className="bg-white p-4 mb-4 rounded-lg shadow-lg hover:shadow-2xl transition duration-300 ease-in-out"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-lg font-semibold text-gray-800">
                                        Order #{order.orderId}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        <span className="font-medium">Status:</span> {order.checkoutStatus}
                                      </p>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      <p>
                                        <span className="font-medium">Total:</span> ${order.total}
                                      </p>
                                      <p>
                                        <span className="font-medium">Payment Method:</span> {order.paymentMethod}
                                      </p>
                                    </div>
                                  </div>
          
                                  <div className="mt-3">
                                    <p className="text-gray-600 text-sm font-medium">Ordered Items:</p>
                                    <div className="space-y-2">
                                      {order.items.map((item, idx) => (
                                        <div
                                          key={idx}
                                          className="flex items-center justify-between p-2 bg-gray-100 rounded-md"
                                        >
                                          <div className="flex items-center space-x-2">
                                            <img
                                              src={item.imageUrl}
                                              alt={item.name}
                                              className="w-12 h-12 object-cover rounded-md"
                                            />
                                            <div>
                                              <p className="font-medium text-gray-800">{item.name}</p>
                                              <p className="text-sm text-gray-500">Dosage: {item.dosage}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="font-semibold text-gray-800">
                                              x{item.quantity} - ${item.price * item.quantity}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
          
                                  <div className="mt-4 flex justify-between items-center">
                                    <p className="text-sm text-gray-500">
                                      <span className="font-medium">Placed on:</span> {new Date(order.timestamp.seconds * 1000).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-700">No new orders.</p>
                            )
                          }
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-700">No new orders.</p>
                    )
                  ) : activeTab === "expiry" ? (
                    productAlerts.expiry.length > 0 ? (
                      productAlerts.expiry.map((product, index) => (
                        <p key={index} className="text-sm text-gray-700">
                          <span className="font-semibold text-yellow-500">{product.name}</span> is nearing expiry on{" "}
                          {product.expiryDate.toLocaleDateString()}.
                        </p>
                      ))
                    ) : (
                      <p className="text-sm text-gray-700">No products are nearing expiry.</p>
                    )
                  ) : null}
                </div>
              </div>
            )}

          </div>

          <div className="relative">
            <button
              type="button"
              className="flex items-center bg-gray-800 text-white rounded-full w-8 h-8 focus:ring-2 focus:ring-green-400"
            >
              <img
                src="https://flowbite.com/docs/images/people/profile-picture-5.jpg"
                alt="User Avatar"
                className="rounded-full"
              />
            </button>
            <div
            id="dropdown-user"
            className="z-50 hidden absolute right-0 mt-2 w-48 bg-white divide-y divide-gray-100 rounded shadow dark:bg-gray-700 dark:divide-gray-600"
          >
            <div className="px-4 py-3">
              <p className="text-sm text-gray-900 dark:text-white">
                Matthew Balinton
              </p>
              <p className="text-sm font-medium text-gray-900 truncate dark:text-gray-300">
                {adminEmail}
              </p>
            </div>
            <ul className="py-1">
              <li>
                <a
                  href="#"
                  className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200"
                >
                  Dashboard
                </a>
              </li>
              <button
                onClick={logoutAdmin}
                className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Sign out
              </button>
            </ul>
          </div>
          </div>
        </div>
      </div>
    </nav>


      <aside
        id="logo-sidebar"
        className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0 dark:bg-blue-950 dark:border-gray-700"
        aria-label="Sidebar"
      >
        <div className="h-full px-3 pb-4 overflow-y-auto bg-blue-950 shadow-lg">
          <ul className="space-y-4 font-medium">
            <li>
              <button onClick={() => setActiveComponent('Dashboard')}
               className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Dashboard' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
              </svg>

                <span className="ms-3 text-green-500">Dashboard</span>
              </button>
            </li>
            <li>
              <button
              onClick={() => setActiveComponent('User Management')}
              className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'User Management' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
                <span className="flex-1 ms-3 whitespace-nowrap text-green-500">User Management</span>
                <span className="inline-flex items-center justify-center w-3 h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">14</span>
              </button>
            </li>
            <li>
              <button
              onClick={() => setActiveComponent('Sales And Product')}
              className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Sales And Product' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
                </svg>
                <span className="flex-1 ms-3 mr-4 whitespace-nowrap text-green-500">Sales & Product</span>
                <span className="inline-flex items-center ml-4 justify-center w-3 h-3 p-3 ms-3 text-sm font-medium text-blue-800 bg-blue-100 rounded-full dark:bg-blue-900 dark:text-blue-300">3</span>
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveComponent('Inventory')}
                className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Inventory' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
              </svg>
                <span className="flex-1 ms-3 md:mr-[95px] whitespace-nowrap text-green-500">Inventory</span>
              </button>
            </li>
            <li>
              <button
              onClick={() => setActiveComponent('Analytics')}
              className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Analytics' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-5"> <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /> </svg>
                <span className="flex-1 ms-3 whitespace-nowrap md:mr-[95px] text-green-500">Analytics</span>
              </button>
            </li>
            <li>
              <button
              onClick={() => setActiveComponent('Contact')}
              className={`flex w-full items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Contact' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6"> <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /> </svg>
                <span className="flex-1 ms-3 whitespace-nowrap md:mr-[95px] text-green-500">Contact</span>
              </button>
            </li>
            <li>
              <button
              onClick={() => setActiveComponent('Notifications And Messages')}
              className={`flex w-full mt-[273px] items-center p-2 text-gray-900 rounded-lg dark:text-white ${activeComponent === 'Notifications And Messages' ? 'bg-green-700' : ''} dark:hover:bg-gray-700 group`}
              >
                <svg
              aria-hidden="true"
              className="w-6 h-6"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"
              ></path>
            </svg>
                <span className="flex-1 ms-3 whitespace-nowrap text-green-500">Notifications & Messages</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>


    </>
  );
};

export default AdminPanel;
