import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoIosArrowRoundForward } from "react-icons/io";
import { motion } from "framer-motion";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

function PrescriptionHistory() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("processing");
    const navigate = useNavigate();
    const db = getFirestore();
    const auth = getAuth();
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
    const userId = user.uid;

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async () => {
            try {
                const transactionsRef = collection(db, "transactions");
                const q = query(transactionsRef, where("userId", "==", userId));
                const querySnapshot = await getDocs(q);

                if (querySnapshot.empty) {
                    console.log("No transactions found for this user.");
                }

                const transactionsData = querySnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                setTransactions(transactionsData);
            } catch (error) {
                console.error("Error fetching transaction data: ", error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [auth, db]);

    const handleViewDetails = (transaction) => {
        navigate("/user/kiosk/order-summary", {
            state: { orderId: transaction.id, transactionData: { ...transaction, isNewOrder: false } },
        });
    };

    const filteredTransactions = transactions.filter(
        (transaction) => transaction.checkoutStatus.toLowerCase() === activeTab.toLowerCase()
    );
    

    if (loading) return <p>Loading...</p>;

    return (
        <section className="py-24 bg-gray-100">
            <motion.h2
                className="font-manrope font-bold text-3xl sm:text-4xl leading-10 text-gray-800 mb-8 text-center"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
            >
                Prescription History
            </motion.h2>

            <div className="flex justify-center mb-8 space-x-6">
                {["processing", "Confirmed", "Cancelled"].map((status) => (
                    <button
                        key={status}
                        onClick={() => setActiveTab(status)}
                        className={`py-2 px-6 rounded-full font-semibold transition-colors duration-200 ${
                            activeTab === status
                                ? status === "Confirmed"
                                    ? "bg-green-600 text-white shadow-lg"
                                    : status === "Cancelled"
                                    ? "bg-red-600 text-white shadow-lg"
                                    : "bg-yellow-600 text-white shadow-lg"
                                : "bg-gray-200 text-gray-700"
                        }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {filteredTransactions.length === 0 ? (
                <p className="text-center text-gray-500">
                    No {activeTab.toLowerCase()} transactions found.
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 px-4 sm:px-8 lg:px-16">
                    {filteredTransactions.map((transaction) => (
                        <motion.div
                            key={transaction.id}
                            className="border border-gray-300 p-6 rounded-xl shadow-lg bg-white hover:shadow-2xl transition-shadow duration-300"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            <h5 className="font-semibold text-xl leading-7 text-gray-800 mb-2">
                                Order ID: {transaction.id}
                            </h5>
                            <p className="text-gray-500 mb-1">
                                Date:{" "}
                                {transaction.timestamp
                                    ? new Date(transaction.timestamp.seconds * 1000).toLocaleDateString()
                                    : "N/A"}
                            </p>
                            <p className="text-gray-500 mb-1">
                                Status:{" "}
                                <span
                                    className={`font-semibold ${
                                        transaction.checkoutStatus === "Confirmed"
                                            ? "text-green-600"
                                            : transaction.checkoutStatus === "Cancelled"
                                            ? "text-red-600"
                                            : "text-yellow-500"
                                    }`}
                                >
                                    {transaction.checkoutStatus || "N/A"}
                                </span>
                            </p>
                            <p className="text-gray-500 mb-4">
                                Total:{" "}
                                <span className="font-semibold text-gray-700">
                                    ₱
                                    {transaction.total &&
                                    transaction.discountAmount &&
                                    transaction.tax
                                        ? (
                                              transaction.total -
                                              transaction.discountAmount +
                                              transaction.tax
                                          ).toFixed(2)
                                        : "N/A"}
                                </span>
                            </p>
                            <button
                                onClick={() => handleViewDetails(transaction)}
                                className="flex items-center text-green-600 font-semibold"
                            >
                                <span className="border-b-2 border-green-600">View Details</span>
                                <IoIosArrowRoundForward size={22} className="ml-1 text-green-600" />
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}
        </section>
    );
}

export default PrescriptionHistory;
