import { React, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { doc, setDoc, getDoc, collection, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";
import { format } from 'date-fns';
import { IoIosArrowRoundBack } from "react-icons/io";
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/img/logo.png';
import { toast, ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function OrderSummary() {
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const { orderId, transactionData } = location.state || {};
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [notificationSent, setNotificationSent] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState("Loading...");
  const notificationSentRef = useRef(false);

  const displayName = user.displayName;
  if (!transactionData) {
    return <p>Loading...</p>;
  }


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

  
  const sendAdminNotification = async () => {
    try {
      const adminFCMTokens = await getAdminFCMTokens();

      if (adminFCMTokens && adminFCMTokens.length > 0) {
        await fetch("http://localhost:5000/user/send-notification/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "New Order",
            message: "A new order has been placed.",
            orderId: orderId,
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

  const handleCancelOrder = async () => {
    try {
      const orderRef = doc(db, "transactions", orderId);
      await updateDoc(orderRef, { checkoutStatus: "Cancelled" });
  
      setModalOpen(false);
      toast.success("Order successfully cancelled!", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
      });
  
      const orderDoc = await getDoc(orderRef);
      const { userId } = orderDoc.data();

  
    } catch (error) {
      console.error("Error cancelling the order:", error);
      alert("Failed to cancel the order. Please try again.");
    }
  };
  
 

  const handleDownloadInvoice = () => {
    const doc = new jsPDF();
    
    const primaryColor = "#2F855A"; 
    const secondaryColor = "#4A5568"; 

    doc.addImage(logo, "PNG", 10, 10, 30, 30);
    doc.setFontSize(22);
    doc.setTextColor(primaryColor);
    doc.text("Checacio Pharmacy", 50, 20);

    doc.setFontSize(12);
    doc.setTextColor("#000000");
    doc.text(`Dose, Bayanan II, Calapan City, Oriental Mindoro, Philippines`, 50, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor);
    doc.text(`Order for: ${displayName}`, 10, 50);
    doc.text(`Order ID: ${orderId}`, 10, 60);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, 70);
    doc.text(`Payment Method: ${transactionData.paymentMethod}`, 10, 80);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(10, 85, 200, 85);

    doc.setFontSize(16);
    doc.setTextColor(primaryColor);
    doc.text("Order Summary", 10, 95);

    const itemRows = transactionData.items.map(item => ([
        item.name,
        item.dosage || "N/A",
        item.quantity,
        `Php ${item.price.toFixed(2)}`,
        `Php ${(item.price * item.quantity).toFixed(2)}`
    ]));
    
    doc.autoTable({
        startY: 100,
        head: [["Item Name", "Dosage", "Quantity", "Price", "Total"]],
        body: itemRows,
        theme: "striped",
        headStyles: {
            fillColor: [47, 133, 90],
            textColor: 255,
            fontSize: 12,
            fontStyle: "bold"
        },
        styles: { cellPadding: 4, fontSize: 10 },
        columnStyles: { 4: { halign: "left" } }
    });

    let finalY = doc.previousAutoTable.finalY + 10;

    doc.setTextColor(secondaryColor);
    doc.setFontSize(12);
    
    const subtotal = transactionData.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalDiscount = transactionData.discountAmount || 0;
    const totalTax = transactionData.tax || 0;

    doc.text(`Subtotal: Php ${subtotal.toFixed(2)}`, 10, finalY);
    doc.text(`Discount: Php ${totalDiscount.toFixed(2)}`, 10, finalY + 10);
    doc.text(`Taxes: Php ${totalTax.toFixed(2)}`, 10, finalY + 20);

    doc.setTextColor(primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Total: Php ${transactionData.total.toFixed(2)}`, 10, finalY + 35);

    doc.setTextColor(secondaryColor);
    doc.setFontSize(10);
    doc.text("Thank you for your purchase!", 10, finalY + 50);
    doc.text("For questions, contact Checacio Pharmacy customer support.", 10, finalY + 55);

    doc.save(`Checacio_Invoice_${orderId}.pdf`);
};
useEffect(() => {
  if (!orderId) return;

  const orderRef = doc(db, "transactions", orderId);

  // Fetch initial checkout status and set up real-time updates
  const fetchAndSubscribe = async () => {
    try {
      // Fetch initial status
      const orderDoc = await getDoc(orderRef);
      if (orderDoc.exists()) {
        setCheckoutStatus(orderDoc.data().checkoutStatus || "Processing");
      } else {
        console.error("Order document does not exist for initial fetch.");
      }
    } catch (error) {
      console.error("Error fetching initial checkout status:", error);
    }

    // Set up real-time updates
    const unsubscribe = onSnapshot(orderRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setCheckoutStatus(docSnapshot.data().checkoutStatus || "Processing");
      } else {
        console.error("Order document does not exist for real-time updates.");
      }
    });

    return unsubscribe;
  };

  let unsubscribe;
  fetchAndSubscribe().then((unsub) => {
    unsubscribe = unsub;
  });

  return () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };
}, [transactionData, orderId, user.uid]);


    let displayDate = format(new Date(), 'MMMM do yyyy');
    let pesoSign = '₱';
   

    return (
      <section className="py-24 relative">
        <button
          onClick={() => window.location.href = "../../user/kiosk"}
          className="absolute flex items-center top-4 left-4 text-green-600 font-semibold border-b-2 hover:bg-border-600 transition-all duration-300"
        >
          <IoIosArrowRoundBack size={25} />
          Back to Kiosk
        </button>
        <div className="w-full max-w-7xl px-4 md:px-5 lg:6 mx-auto">
          <h2 className="font-manrope font-bold text-3xl sm:text-4xl leading-10 text-black mb-11">
            Current Status:{" "}
            {checkoutStatus === "Loading..." ? (
              <span className="text-gray-500">Loading...</span>
            ) : (
              <span
                className={`font-semibold ${
                  checkoutStatus === "Cancelled"
                    ? "text-red-500"
                    : checkoutStatus === "Confirmed"
                    ? "text-green-500"
                    : "text-yellow-500"
                }`}
              >
                {checkoutStatus}
              </span>
            )}
          </h2>
          <h6 className="font-medium text-xl leading-8 text-black mb-3">Hello, {displayName}</h6>
          <p className="font-normal text-lg leading-8 text-gray-500 mb-11">
            Your order has been completed and is awaiting confirmation. We'll notify you once it's ready.
          </p>
    
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-8 py-6 border-y border-gray-100 mb-6">
            <div className="box group">
              <p className="font-normal text-base leading-7 text-gray-500 mb-3 transition-all duration-500 group-hover:text-gray-700">Current Data</p>
              <h6 className="font-semibold font-manrope text-2xl leading-9 text-black">{displayDate}</h6>
            </div>
            <div className="box group">
              <p className="font-normal text-base leading-7 text-gray-500 mb-3 transition-all duration-500 group-hover:text-gray-700">Order</p>
              <h6 className="font-semibold font-manrope text-2xl leading-9 text-black">{orderId}</h6>
            </div>
            <div className="box group">
              <p className="font-normal text-base leading-7 text-gray-500 mb-3 transition-all duration-500 group-hover:text-gray-700">Payment Method</p>
              <h6 className="font-semibold font-manrope text-2xl leading-9 text-black">{transactionData.paymentMethod}</h6>
            </div>
            <div className="box group">
              <p className="font-normal text-base leading-7 text-gray-500 mb-3 transition-all duration-500 group-hover:text-gray-700">Print Invoice/Receipt</p>
              <button
                onClick={handleDownloadInvoice}
                className="font-semibold border-2 border-green-500 p-2 rounded-lg bg-green-600 text-white font-manrope text-2xl leading-9 text-black hover:bg-green-700 transition duration-300"
              >
                Download
              </button>
            </div>
          </div>
    
          {transactionData.items.map((item, index) => (
            <div key={index} className="grid grid-cols-7 w-full pb-6 border-b border-gray-100">
              <div className="col-span-7 min-[500px]:col-span-2 md:col-span-1">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full rounded-xl object-cover h-[200px]"
                />
              </div>
              <div className="col-span-7 min-[500px]:col-span-5 md:col-span-6 min-[500px]:pl-5 max-sm:mt-5 flex flex-col justify-center">
                <div className="flex flex-col min-[500px]:flex-row min-[500px]:items-center justify-between">
                  <div>
                    <h5 className="font-manrope font-semibold text-2xl leading-9 text-black mb-6">{item.name}</h5>
                    <p className="font-normal text-xl leading-8 text-gray-500">Quantity: <span className="text-black font-semibold">{item.quantity}</span></p>
                  </div>
                  <h5 className="font-manrope font-semibold text-3xl leading-10 text-black sm:text-right mt-3">₱{item.price}</h5>
                </div>
              </div>
            </div>
          ))}
    
          <div className="flex items-center justify-center sm:justify-end w-full my-6">
            <div className="w-full">
              <div className="flex items-center justify-between mb-6">
                <p className="font-normal text-xl leading-8 text-gray-500">Subtotal</p>
                <p className="font-semibold text-xl leading-8 text-gray-900">₱{transactionData.subTotal}</p>
              </div>
              <div className="flex items-center justify-between mb-6">
                <p className="font-normal text-xl leading-8 text-red-500">Savings</p>
                <p className="font-semibold text-xl leading-8 text-red-500">₱{(transactionData.discountAmount).toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between mb-6">
                <p className="font-normal text-xl leading-8 text-gray-500">Taxes</p>
                <p className="font-semibold text-xl leading-8 text-gray-900">₱{transactionData.tax.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-6">
                <p className="font-semibold text-2xl leading-9 text-black">Total</p>
                <p className="font-semibold text-2xl leading-9 text-black">₱{((transactionData.total.toFixed(2)))}</p>
              </div>
            </div>
          </div>
          <button
              onClick={() => setModalOpen(true)}
              className={`w-full py-2 px-4 font-semibold rounded-lg transition ${
                checkoutStatus === "Cancelled" || checkoutStatus === "Confirmed"
                  ? "bg-gray-500 text-gray-300 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
              disabled={checkoutStatus === "Cancelled" || checkoutStatus === "Confirmed"}
            >
              Cancel Order
            </button>
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Confirm Cancellation</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to cancel this order?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-4 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleCancelOrder}
                  className="py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        <ToastContainer position="top-right" />
      </section>
    );
    
}

export default OrderSummary;
