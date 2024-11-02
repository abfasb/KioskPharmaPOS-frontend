import { React, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { db } from '../../config/firebase';
import { serverTimestamp, collection, doc, setDoc, writeBatch, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { loadStripe} from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function TryCart() {
  const navigate = useNavigate();
  const taxRate = 0.05
  const deliveryFee = 49;
  const discountRate = 0.1;
  const { userId } = useParams();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchCartData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/user/kiosk/cart/${userId}`);
        if (response.data.success) {
          setCartItems(response.data.products || []);
        } else {
          setError("Cart not found.");
        }
      } catch (error) {
        console.error("Failed to load cart data:", error);
        setError("Failed to load cart data.");
      } finally {
        setLoading(false);
      }
    };

    fetchCartData();
  }, [userId]);

const handleCheckoutClick = () => setShowPaymentModal(true);
const handleCloseModal = () => setShowPaymentModal(false);


const handlePurchaseAndUpdateStock = async (userId) => {
  const batch = writeBatch(db);
  try {
    // Log the user ID being processed
    console.log('Handling purchase for userId:', userId);
    
    const userCartRef = doc(db, 'carts', userId);
    
    // Check if the user cart document exists
    const userCartSnapshot = await getDoc(userCartRef);
    if (!userCartSnapshot.exists()) {
      console.warn(`No cart found for userId: ${userId}`);
      return; // Exit if cart does not exist
    }

    // Get the items array from the cart document
    const cartData = userCartSnapshot.data();
    const cartItems = cartData.items || []; // Ensure we get items as an array
    console.log('Cart items retrieved:', cartItems);
    console.log(`Number of cart items: ${cartItems.length}`);

    if (cartItems.length === 0) {
      console.warn('No items found in the cart for this user.');
      return; // Exit if no items in cart
    }

    for (let item of cartItems) {
      const productRef = doc(db, 'products', item.productId);
      const productSnapshot = await getDoc(productRef);

      if (productSnapshot.exists()) {
        const productData = productSnapshot.data();
        const currentStockLevel = productData.stockLevel;
        const newStockLevel = currentStockLevel - item.quantity;

        console.log(`Current stock level for ${item.name}: ${currentStockLevel}`);
        console.log(`Attempting to reduce stock by: ${item.quantity}`);
        console.log(`New stock level will be: ${newStockLevel}`);

        if (newStockLevel >= 0) {
          batch.update(productRef, { stockLevel: newStockLevel });
        } else {
          console.warn(`Insufficient stock for item: ${item.name}`);
        }
      } else {
        console.warn(`Product not found for productId: ${item.productId}`);
      }
    }

    await batch.commit();
    console.log('Batch commit successful: stock levels updated.');
  } catch (error) {
    console.error("Error updating stock levels:", error);
  }
};



const onConfirmCheckout = async (paymentMethod) => {
  setShowPaymentModal(false);

  if (paymentMethod === 'Cash') {
    const orderId = `order-${Date.now()}`;
    const transactionData = {
      userId,
      orderId,
      paymentMethod,
      taxRate,
      items: cartItems,
      total: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
      timestamp: serverTimestamp(),
    };

    try {
      await setDoc(doc(collection(db, 'transactions'), orderId), transactionData);
      console.log('Transaction saved successfully:', orderId);

      await handlePurchaseAndUpdateStock(userId);

      navigate('/user/kiosk/order-summary', { state: { orderId, transactionData } });
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  } else if(paymentMethod === 'E-wallet') {
    const orderId = `order-${Date.now()}`;
  const amount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  try {
    const stripe = await stripePromise;

    const response = await fetch("http://localhost:5000/user/create-payment-intent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: cartItems,
      }),
    });

    const { id: sessionId } = await response.json();

    const result = await stripe.redirectToCheckout({
      sessionId,
    });

    if (result.error) {
      console.error(result.error.message);
    }
  } catch (error) {
    console.error('Failed to process payment:', error);
  }

  }
};

  const increaseQuantity = (productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.productId === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };
  
  const removeToCart = async (productId) => {
    try {
      alert(productId + ' and ' + userId)
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


  const originalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const savings = originalPrice * discountRate;
  const tax = originalPrice * taxRate;
  const total = originalPrice - savings + tax + deliveryFee;

  if (loading) return <p>Loading...</p>;
  if (error) return <p>{error}</p>;

  return (
    <section className="bg-white py-8 antialiased dark:bg-gray-900 md:py-16">
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
                        <p className="text-base font-bold text-gray-900 dark:text-white">₱{item.price}</p>
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

                        <button onClick={() => removeToCart(item.productId)} type="button" className="inline-flex items-center text-sm font-medium text-red-600 hover:underline dark:text-red-500">
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
                <img className="mx-auto h-44 w-44 dark:hidden" src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/apple-watch-light.svg" alt="imac image" />
                <img className="mx-auto hidden h-44 w-44 dark:block" src="https://flowbite.s3.amazonaws.com/blocks/e-commerce/apple-watch-dark.svg" alt="imac image" />
              </a>
              <div>
                <a href="#" className="text-lg font-semibold leading-tight text-gray-900 hover:underline dark:text-white">Apple Watch Series 8</a>
                <p className="mt-2 text-base font-normal text-gray-500 dark:text-gray-400">This generation has some improvements, including a longer continuous battery life.</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  <span className="line-through"> $1799,99 </span>
                </p>
                <p className="text-lg font-bold leading-tight text-red-600 dark:text-red-500">$1199</p>
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
              <dt className="text-base font-normal text-gray-500 dark:text-gray-400">Savings</dt>
              <dd className="text-base font-medium text-green-600">₱{savings.toFixed(2)}</dd>
            </dl>

            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-500 dark:text-gray-400">Delivery</dt>
              <dd className="text-base font-medium text-gray-900 dark:text-white">₱{deliveryFee.toFixed(2)}</dd>
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
            <a href="#" title="" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 underline hover:no-underline dark:text-primary-500">
              Continue Shopping
              <svg className="h-5 w-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m14 0-4 4m4-4-4-4" />
              </svg>
            </a>
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <form className="space-y-4">
            <div>
              <label for="voucher" className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"> Do you have a voucher or gift card? </label>
              <input type="text" id="voucher" className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder:text-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500" placeholder="" required />
            </div>
            <button type="submit" className="flex w-full items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-800 focus:outline-none focus:ring-4 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800">Apply Code</button>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>
  )
}

export default TryCart