import { React, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { db } from '../../config/firebase';
import { toast, ToastContainer } from 'react-toastify';
import { serverTimestamp, collection, doc, setDoc, writeBatch, updateDoc, getDocs, getDoc, addDoc } from 'firebase/firestore';
import { loadStripe} from '@stripe/stripe-js';
import { IoIosArrowRoundBack } from 'react-icons/io';
import LoadingSpinner from '../LoadingSpinner';
import 'react-toastify/dist/ReactToastify.css';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function TryCart() {
  const navigate = useNavigate();
  const taxRate = 0.12;
  const deliveryFee = 49;
  const discountRate = 0.10;
  const { userId } = useParams();
  const [cartItems, setCartItems] = useState([]);
  const [voucherCode, setVoucherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutStatus, setCheckoutStatus] = useState(null); 
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isVoucherValid, setIsVoucherValid] = useState(false);
  const [savings, setSavings] = useState(0.05);

  
  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/user/kiosk/cart/${userId}`);
        if (response.data.success) {
          if (response.data.products.length === 0) {
            setError("Your cart is empty.");
          } else {
            setCartItems(response.data.products);
          }
        } else {
          setError("Cart not found.");
        }
      } catch (error) {
        console.error("Your Cart is empty", error);
        setError("Your Cart is empty.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCartData();
    
    if (checkoutStatus) {
  
      const timer = setTimeout(() => {
        console.log("Clearing toast..."); 
        setCheckoutStatus(null);
      }, 2000);
  
      return () => clearTimeout(timer);
    }
  }, [userId, checkoutStatus]);

const handleCheckoutClick = () => setShowPaymentModal(true);
const handleCloseModal = () => setShowPaymentModal(false);

const addHistoryLog = async (action, productName, details) => {
  const historyRef = collection(db, "history");
  await addDoc(historyRef, {
    action,
    productName,
    details,
    timestamp: new Date(),
  });
};

const handlePurchaseAndUpdateStock = async (userId) => {
  const batch = writeBatch(db);
  
  try {
    const userCartRef = doc(db, 'carts', userId);
    const userCartSnapshot = await getDoc(userCartRef);

    if (!userCartSnapshot.exists()) {
      console.warn(`No cart found for userId: ${userId}`);
      return;
    }

    const cartData = userCartSnapshot.data();
    const cartItems = cartData.items || [];
    console.log('Cart items retrieved:', cartItems);

    if (cartItems.length === 0) {
      console.warn('No items found in the cart for this user.');
      return;
    }

    for (let item of cartItems) {
      const productRef = doc(db, 'products', item.productId);
      const productSnapshot = await getDoc(productRef);

      if (productSnapshot.exists()) {
        const productData = productSnapshot.data();
        const currentStockLevel = productData.stockLevel;

        const newStockLevel = currentStockLevel - item.quantity;
        console.log(`Current stock for ${item.name}: ${currentStockLevel}`);
        console.log(`Attempting to reduce stock by: ${item.quantity}`);
        console.log(`New stock level will be: ${newStockLevel}`);

        if (newStockLevel >= 0) {
          batch.update(productRef, { stockLevel: newStockLevel });

          await addHistoryLog(
            'Outbound',
            item.name,
            `Removed ${item.quantity} units.`
          );
        } else {
          console.warn(`Insufficient stock for item: ${item.name}`);
        }
      } else {
        console.warn(`Product not found for productId: ${item.productId}`);
      }
    }

    await batch.commit();
    console.log('Batch commit successful: stock levels updated.');
    toast.success('Stock levels updated successfully!');
  } catch (error) {
    console.error('Error processing outbound:', error);
    toast.error('Failed to process outbound stock.');
  }
};


const getAdminFCMTokens = async () => {
  try {
    const adminRef = doc(db, "admin", "checachio@gmail.com");
    const adminDoc = await getDoc(adminRef);

    if (adminDoc.exists()) {
      const data = adminDoc.data();
      const fcmTokens = data.fcmTokens || [];
      
      if (fcmTokens.length > 0) {
        return fcmTokens;
      } else {
        console.warn("No FCM tokens found for the admin.");
        return null;
      }
    } else {
      console.error("Admin document does not exist.");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving admin FCM token:", error);
    return null;
  }
};

const sendAdminNotification = async (userId) => {
  try {
    const orderId = `order-${Date.now()}`;
    const adminFCMTokens = await getAdminFCMTokens();
    
    if (adminFCMTokens && adminFCMTokens.length > 0) {
      await fetch("http://localhost:5000/user/send-notification/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "New Order",
          message: "A new order has been placed.",
          orderId: orderId,
          userId: userId,
          fcmTokens: adminFCMTokens,
        }),
      });
    } else {
      console.log("No FCM token found for the admin");
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};


const getUserFCMToken = async (userId) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const fcmToken = userData.fcmTokens || null;
      return fcmToken;
    } else {
      console.log(`User document with ID ${userId} does not exist`);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving FCM token:', error);
    return null;
  }
};

const clearUserCart = async (userId) => {
  try {
    const cartRef = doc(db, 'carts', userId);
    
    await updateDoc(cartRef, {
      items: []  
    });
    console.log('User cart cleared successfully.');
  } catch (error) {
    console.error('Error clearing the user cart:', error);
  }
};


const onConfirmCheckout = async (paymentMethod) => {
  setIsLoading(true);
  setCheckoutStatus(null)
  setShowPaymentModal(false);

  if (paymentMethod === 'Cash') {
    const orderId = `order-${Date.now()}`;
    const transactionData = {
      userId,
      orderId,
      paymentMethod,
      tax,
      discountAmount,
      items: cartItems,
      subTotal: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
      total: total,
      timestamp: serverTimestamp(),
      checkoutStatus: 'processing',
    };

    try {
      const recipientToken = await getUserFCMToken(userId);
      alert(recipientToken);
      await setDoc(doc(collection(db, 'transactions'), orderId), transactionData);
      console.log('Transaction saved successfully:', orderId);

      await handlePurchaseAndUpdateStock(userId);

      if (recipientToken) {
        await fetch("http://localhost:5000/user/send-notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Transaction Confirmed",
            body: "Your order has been successfully confirmed.",
            recipientToken: recipientToken, 
          }),
        });
      } else {
        console.log("No valid recipient token found");
      }
  
      sendAdminNotification(userId);
      await clearUserCart(userId);
      setCheckoutStatus('success');
      navigate('/user/kiosk/order-summary', { state: { orderId, transactionData, isNewOrder: true } });
    } catch (error) {
      console.error('Failed to save transaction:', error);
      setCheckoutStatus('failed');
    } finally{
      setIsLoading(false);
    }
  } else if (paymentMethod === 'E-wallet') {
    const finalTotalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    if (finalTotalAmount < 30) {
      setIsLoading(false); 
      setCheckoutStatus('Minimum Order must be atleast 30. You can consider paying in cash, thankyouuu')
      return;
    }
    try {

      const orderId = `order-${Date.now()}`;
      
      const stripe = await stripePromise;
      const response = await fetch("http://localhost:5000/user/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          orderId,
          paymentMethod,
          tax,
          discountAmount,
          subTotal: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            description: item.dosage || "No description available",
            imageUrl: item.imageUrl,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to process payment:", errorData.error);
        setCheckoutStatus(errorData.error);
        return;
      }

      const { sessionId } = await response.json();
      const result = await stripe.redirectToCheckout({ sessionId });

      if (result.error) {
        console.error(result.error.message);
      } else {
        await clearUserCart(userId);

      }
    } catch (error) {
      console.error("Failed to process payment:", error);
    } finally {
      setIsLoading(false);
    }
  }
};

const increaseQuantity = async (productId) => {
  try {
    const productRef = doc(db, "products", productId);
    const productSnapshot = await getDoc(productRef);

    if (productSnapshot.exists()) {
      const productData = productSnapshot.data();
      const currentStockLevel = productData.stockLevel;

      if (currentStockLevel > 0) {
        setCartItems((prevItems) =>
          prevItems.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );

        await updateDoc(productRef, { stockLevel: currentStockLevel - 1 });
        console.log(`Stock level for ${productId} reduced by 1`);
      } else {
        alert("Stock level is insufficient to increase quantity");
      }
    } else {
      console.warn("Product not found in Firestore");
    }
  } catch (error) {
    console.error("Error updating stock level:", error);
  }
};

const decreaseQuantity = async (productId) => {
  try {
    const productRef = doc(db, "products", productId);
    const productSnapshot = await getDoc(productRef);

    if (productSnapshot.exists()) {
      const productData = productSnapshot.data();
      const currentStockLevel = productData.stockLevel;

      setCartItems((prevItems) =>
        prevItems.map((item) =>
          item.productId === productId && item.quantity > 1
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );

      const updatedStockLevel = currentStockLevel + 1;
      await updateDoc(productRef, { stockLevel: updatedStockLevel });
      console.log(`Stock level for ${productId} increased by 1`);
    } else {
      console.warn("Product not found in Firestore");
    }
  } catch (error) {
    console.error("Error updating stock level:", error);
  }
};

const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedProductId, setSelectedProductId] = useState(null);

const removeToCart = async (productId) => {
  try {
      if (!userId) {
          console.error("User ID is undefined");
          return;
      }
      
      const response = await fetch('http://localhost:5000/user/kiosk/cart/remove', {
          method: 'DELETE',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, productId }), 
      });

      if (response.ok) {
          const updatedCart = cartItems.filter(item => item.productId !== productId);
          setCartItems(updatedCart);
          console.log("Removed item with ID:", productId);
      } else {
          console.error('Failed to remove item from cart');
      }
  } catch (error) {
      console.error('Error:', error);
  }
};

    const openModal = (productId) => {
      setSelectedProductId(productId);
      setIsModalOpen(true);
    };

    const closeModal = () => {
      setSelectedProductId(null);
      setIsModalOpen(false);
    };

    const confirmRemove = () => {
      if (selectedProductId) {
        removeToCart(selectedProductId);
      }
      closeModal();
    };


  const originalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = isVoucherValid ? originalPrice * discountRate : originalPrice * 0.05;
  const priceAfterDiscount = originalPrice - discountAmount;
  
  const tax = priceAfterDiscount * taxRate;
  const total = priceAfterDiscount + tax ;
  
  const handleVoucherSubmit = (e) => {
    e.preventDefault();
    if (voucherCode === 'CUTEKO') {
      toast.success("Congratulations you just got 10% discount");
      setIsVoucherValid(true); 
      setSavings(discountRate);
    } else {
      alert('Invalid voucher code');
      setIsVoucherValid(false);
      setSavings(0);    
      setVoucherCode('');  
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <p>{error}</p>;

  return (
    <section className="bg-white py-8 antialiased dark:bg-gray-900 md:py-16">
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover draggable />
      <button onClick={() => window.location.href = "../../../user/kiosk"} className="absolute flex items-center top-4 left-4 text-green-600 font-semibold border-2 p-1 rounded-md border-green-500 opacity-85 hover:bg-green-500 hover:text-white">
                <IoIosArrowRoundBack size={25}/>
                Back to Kiosk
            </button>
  <div className="mx-auto max-w-screen-xl px-4 2xl:px-0">
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl">Shopping Cart</h2>

    <div className="mt-6 sm:mt-8 md:gap-6 lg:flex lg:items-start xl:gap-8">
      <div className="mx-auto w-full flex-none gap-2 lg:max-w-2xl xl:max-w-4xl">
      <div className="space-y-6">
      {cartItems.map((item) => (
        <div key={item.productId} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:p-6">
            <div className="space-y-4 md:flex md:items-center md:justify-between md:gap-6 md:space-y-0">
                <a href="#" className="shrink-0 md:order-1">
                    <img className="h-20 w-20 dark:hidden" src={item.imageUrl} alt={item.name} />
                    <img className="hidden h-20 w-20 dark:block" src={item.imageUrl} alt={item.name} />
                </a>

                <label htmlFor="counter-input" className="sr-only">Choose quantity:</label>
                <div className="flex items-center justify-between md:order-3 md:justify-end">
                    <div className="flex items-center">
                        <button type="button" onClick={() => decreaseQuantity(item.productId)} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700">
                            <svg className="h-2.5 w-2.5 text-gray-900 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 2">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M1 1h16" />
                            </svg>
                        </button>
                        <input type="text" value={item.quantity} className="w-10 shrink-0 border-0 bg-transparent text-center text-sm font-medium text-gray-900 focus:outline-none focus:ring-0 dark:text-white" readOnly />
                        <button type="button" onClick={() => increaseQuantity(item.productId)} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600 dark:focus:ring-gray-700">
                            <svg className="h-2.5 w-2.5 text-gray-900 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 18 18">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 1v16M1 9h16" />
                            </svg>
                        </button>
                    </div>
                    <div className="text-end md:order-4 md:w-32">
                        <p className="text-base font-bold text-gray-900 dark:text-white">₱{item.price * item.quantity}</p>
                    </div>
                </div>

                <div className="w-full min-w-0 flex-1 space-y-4 md:order-2 md:max-w-md">
                    <a href="#" className="text-base font-medium text-gray-900 hover:underline dark:text-white">{item.name}</a>

                    {item.dosage && (
                        <p className="text-sm text-gray-500">Dosage: {item.dosage}</p>
                    )}

                    <div className="flex items-center gap-4">
                        <button type="button" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 hover:underline dark:text-gray-400 dark:hover:text-white">
                            <svg className="me-1.5 h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.01 6.001C6.5 1 1 8 5.782 13.001L12.011 20l6.23-7C23 8 17.5 1 12.01 6.002Z" />
                            </svg>
                            Add to Favorites
                        </button>

                        <button onClick={() => openModal(item.productId)} type="button" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline dark:text-red-500">
                            <svg className="me-1.5 h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 17.94 6M18 18 6.06 6" />
                            </svg>
                            Remove
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ))}

    </div>
        
        <div className="hidden xl:mt-8 xl:block">
          <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">People also bought</h3>
          <div className="mt-6 grid grid-cols-3 gap-4 sm:mt-8">
            <div className="space-y-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <a href="#" className="overflow-hidden rounded">
                <img className="mx-auto h-44 w-44 dark:hidden" src="https://toppng.com/uploads/preview/medication-transparent-medical-picture-library-medication-pill-11563059442i6tjrher6h.png" alt="imac image" />
                <img className="mx-auto hidden h-44 w-44 dark:block" src="https://toppng.com/uploads/preview/medication-transparent-medical-picture-library-medication-pill-11563059442i6tjrher6h.png" alt="imac image" />
              </a>
              <div>
                <a href="#" className="text-lg font-semibold leading-tight text-gray-900 hover:underline dark:text-white">Amopracin</a>
                <p className="mt-2 text-base font-normal text-gray-500 dark:text-gray-400">This generation has some improvements, including a longer continuous battery life.</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  <span className="line-through"> ₱1799,99 </span>
                </p>
                <p className="text-lg font-bold leading-tight text-red-600 dark:text-red-500">₱1199</p>
              </div>
              <div className="mt-6 flex items-center gap-2.5">
                <button data-tooltip-target="favourites-tooltip-3" type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700">
                  <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6C6.5 1 1 8 5.8 13l6.2 7 6.2-7C23 8 17.5 1 12 6Z"></path>
                  </svg>
                </button>
                <div id="favourites-tooltip-3" role="tooltip" className="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700">
                  Add to favourites
                  <div className="tooltip-arrow" data-popper-arrow></div>
                </div>

                <button type="button" className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium  text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-primary-800">
                  <svg className="-ms-2 me-2 h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h1.5L9 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8.5-3h9.25L19 7h-1M8 7h-.688M13 5v4m-2-2h4" />
                  </svg>
                  Add to cart
                </button>
              </div>
            </div>
            <div className="space-y-6 overflow-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <a href="#" className="overflow-hidden rounded">
                <img className="mx-auto h-44 w-44 dark:hidden" src="https://toppng.com/uploads/preview/medication-transparent-medical-picture-library-medication-pill-11563059442i6tjrher6h.png" alt="imac image" />
                <img className="mx-auto hidden h-44 w-44 dark:block" src="https://toppng.com/uploads/preview/medication-transparent-medical-picture-library-medication-pill-11563059442i6tjrher6h.png" alt="imac image" />
              </a>
              <div>
                <a href="#" className="text-lg font-semibold leading-tight text-gray-900 hover:underline dark:text-white">Ceterazin</a>
                <p className="mt-2 text-base font-normal text-gray-500 dark:text-gray-400">This generation has some improvements, including a longer continuous battery life.</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  <span className="line-through"> ₱1799,99 </span>
                </p>
                <p className="text-lg font-bold leading-tight text-red-600 dark:text-red-500">₱879</p>
              </div>
              <div className="mt-6 flex items-center gap-2.5">
                <button data-tooltip-target="favourites-tooltip-3" type="button" className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white p-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 hover:text-primary-700 focus:z-10 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700">
                  <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6C6.5 1 1 8 5.8 13l6.2 7 6.2-7C23 8 17.5 1 12 6Z"></path>
                  </svg>
                </button>
                <div id="favourites-tooltip-3" role="tooltip" className="tooltip invisible absolute z-10 inline-block rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white opacity-0 shadow-sm transition-opacity duration-300 dark:bg-gray-700">
                  Add to favourites
                  <div className="tooltip-arrow" data-popper-arrow></div>
                </div>

                <button type="button" className="inline-flex w-full items-center justify-center rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium  text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-primary-800">
                  <svg className="-ms-2 me-2 h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 4h1.5L9 16m0 0h8m-8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-8.5-3h9.25L19 7h-1M8 7h-.688M13 5v4m-2-2h4" />
                  </svg>
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-6 max-w-4xl flex-1 space-y-6 lg:mt-0 lg:w-full">
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <p className="text-xl font-semibold text-gray-900 dark:text-white">Order summary</p>

          <div className="space-y-4 mt-8">
          <div className="space-y-2">
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-500 dark:text-gray-400">Original price</dt>
              <dd className="text-base font-medium text-gray-900 dark:text-white">₱{originalPrice.toFixed(2)}</dd>
            </dl>

            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-500 dark:text-gray-400">Discount</dt>
              <dd className="text-base font-medium text-red-600">₱{discountAmount.toFixed(2)}</dd>
            </dl>

            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-500 dark:text-gray-400">Tax</dt>
              <dd className="text-base font-medium text-gray-900 dark:text-white">₱{tax.toFixed(2)}</dd>
            </dl>
          </div>

          <dl className="flex items-center justify-between gap-4 border-t border-gray-200 pt-2 dark:border-gray-700">
            <dt className="text-base font-bold text-gray-900 dark:text-white">Total</dt>
            <dd className="text-base font-bold text-gray-900 dark:text-white">₱{total.toFixed(2)}</dd>
          </dl>
        </div>

          <button onClick={handleCheckoutClick} className="flex w-full items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Proceed to Checkout</button>


              {showPaymentModal && (
            <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-900 bg-opacity-50">
              <div className="bg-white rounded-lg shadow-lg w-80 p-6 dark:bg-gray-800">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Choose Payment Method</h3>
                <div className="mt-4 space-y-4">
                  <button
                    onClick={() => onConfirmCheckout('Cash')}
                    className="w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-600"
                  >
                    Cash
                  </button>
                  <button
                    onClick={() => onConfirmCheckout('E-wallet')}
                    className="w-full rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  >
                    E-wallet
                  </button>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="mt-6 text-sm text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> or </span>
            <a href="/user/kiosk" title="" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline hover:no-underline dark:text-primary-500">
              Continue Shopping
              <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4" />
              </svg>
            </a>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <form className="space-y-4" onSubmit={handleVoucherSubmit}>
          <div>
            <label htmlFor="voucher" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white">Do you have a voucher or gift card?</label>
            <input
              type="text"
              id="voucher"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
              placeholder=""
              required
            />
          </div>
          <button type="submit" className="flex w-full items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Apply Code</button>
        </form>
        </div>
      </div>
    </div>
  </div>


  <div className="relative">
      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-green-600 bg-opacity-70 z-50 border-4 border-black">
          <div className="flex flex-col items-center text-white">
            <div className="w-12 h-12 border-4 border-t-white border-b-white rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-semibold">Processing your transaction...</p>
          </div>
        </div>
      )}

      {checkoutStatus === 'success' && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-green-600 text-white p-4 rounded-lg shadow-lg border-2 border-black">
          <p className="text-lg font-semibold">Transaction successful! Redirecting...</p>
        </div>
      )}

      {checkoutStatus === 'failed' && (
        <div className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white p-4 rounded-lg shadow-lg border-2 border-black">
          <p className="text-lg font-semibold">Transaction failed. Please try again.</p>
        </div>
      )}
    </div>
      {checkoutStatus && (
        <div
          className="fixed top-4 left-[600px] transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-md shadow-lg max-w-xs text-center animate-slide-in-out"
           > 
           <p>{checkoutStatus}</p>
         </div>
          )}

{isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow-md">
            <h2 className="text-lg font-bold mb-4">Confirm Removal</h2>
            <p>Are you sure you want to remove this item from your cart?</p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeModal}
                className="bg-gray-300 text-black px-4 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemove}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
</section>
  )
}


export default TryCart