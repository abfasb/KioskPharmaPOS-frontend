import React, { useEffect, useState } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../config/firebase";

const OrderKiosk = () => {
  const [feedbacks, setFeedbacks] = useState([]);

  useEffect(() => {
    const feedbackCollection = collection(db, "contact");
    const unsubscribe = onSnapshot(feedbackCollection, (snapshot) => {
      const feedbackData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeedbacks(feedbackData);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="p-4 sm:ml-64 min-h-screen bg-gray-50">
      <div className="p-6 border-2 border-gray-200 rounded-xl bg-white shadow-lg mt-14">
        <h1 className="text-3xl font-bold text-gray-700 mb-8 text-center">
          User Feedbacks
        </h1>
        {feedbacks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {feedbacks.map((feedback) => (
              <div
                key={feedback.id}
                className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Subject: {feedback.subject}
                </h3>
                <p className="text-gray-600 mb-1">
                  <span className="font-medium text-gray-700">Email:</span>{" "}
                  {feedback.email}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium text-gray-700">Message:</span>{" "}
                  {feedback.message}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">
            No feedbacks available at the moment.
          </p>
        )}
      </div>

      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default OrderKiosk;
