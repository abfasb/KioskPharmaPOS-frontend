import React, { useState, useEffect } from "react";
import { db } from "../../config/firebase";
import { getStorage, ref, getDownloadURL, uploadBytes} from "firebase/storage";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { debounce } from "lodash";
import { AiOutlineMedicineBox, AiOutlineSafety, AiOutlineUser, AiOutlineShoppingCart } from "react-icons/ai";
import { RiFirstAidKitFill } from "react-icons/ri";
import { getAuth } from "firebase/auth";
import { MdMedicalInformation, MdOutlineMedication } from "react-icons/md";
import { FaSearch } from "react-icons/fa";
import { RxHamburgerMenu } from "react-icons/rx";
import axios from "axios";
import Tesseract from "tesseract.js";
import { AiFillForward } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";

const categories = [
  { name: "Prescription Medication", icon: <AiOutlineMedicineBox /> },
  { name: "Over-the-Counter Medication", icon: <MdOutlineMedication /> },
  { name: "Vitamins & Supplements", icon: <AiOutlineSafety /> },
  { name: "First Aid", icon: <RiFirstAidKitFill /> },
  { name: "Personal Care", icon: <AiOutlineUser /> },
  { name: "Medical Equipment", icon: <MdMedicalInformation /> },
];

const Kiosk = () => {
  const storage = getStorage();

  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(categories[0].name);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [authenticatedUser, setAuthenticatedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [verifiedProducts, setVerifiedProducts] = useState([]);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));



  useEffect(() => {
    const auth = getAuth();
    auth.onAuthStateChanged((user) => {
      setAuthenticatedUser(user);
    });
  }, [user.uid]);

  const fetchProducts = async () => {
    setLoading(true);
    const productsRef = collection(db, "products");
    let q;

    if (selectedCategory === "Prescription Medication") {
      q = query(productsRef, where("prescriptionNeeded", "==", true));
    } else {
      q = query(productsRef, where("category", "==", selectedCategory));
    }

    try {
      const snapshot = await getDocs(q);
      const productData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProducts(productData);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    setPrescriptionFile(file);
  
    try {
      const extractedMedications = await parsePrescription(file);
  
      if (extractedMedications.length === 0) {
        alert("No medications detected in the prescription image.");
        setShowModal(true);
        return;
      }
  
      const fuse = new Fuse(products, { 
        keys: ["name", "description", "category"], 
        threshold: 0.3, 
        distance: 100,
      });
  
      const matchedProducts = extractedMedications.flatMap((medication) =>
        fuse.search(medication).map((result) => result.item)
      );
  
      
      if (matchedProducts.length) {
        alert("Prescription verified! Displaying matching products.");
        setVerifiedProducts(matchedProducts);
      } else {
        alert("Prescription failed. Image is undetectable or not available in the pharmacy.");
        setShowModal(true); 
      }
    } catch (error) {
      alert("Failed to process prescription. Please try again.");
      console.error("Error:", error);
    }
  };


  const handlePrescriptionSubmit = async () => {
    if (!prescriptionFile) {
      alert("Please upload a prescription before submitting.");
      return;
    }

    setUploadStatus("Uploading...");
    try {
      const storageRef = ref(storage, `prescriptions/${prescriptionFile.name}`);
      await uploadBytes(storageRef, prescriptionFile);

      const fileURL = await getDownloadURL(storageRef);

      const prescriptionRef = collection(db, "prescriptions");
      await addDoc(prescriptionRef, {
        userId: authenticatedUser?.uid,
        fileURL,
        timestamp: serverTimestamp(),
        status: "Pending",
      });

      setUploadStatus("Prescription submitted successfully! Waiting for admin confirmation.");
      setShowModal(false); 
    } catch (error) {
      setUploadStatus("Error uploading prescription. Please try again.");
      console.error("Error:", error);
    }
  };
  

  const parsePrescription = async (imageFile) => {
    try {
      const { data: { text } } = await Tesseract.recognize(imageFile, "eng");
  
      const normalizedText = text
        .replace(/[^a-zA-Z\s]/g, "")
        .toLowerCase();
  
      const keywords = Array.from(new Set(normalizedText.split(/\s+/)))
        .filter((word) => word.length > 2); 
  
      return keywords;
    } catch (error) {
      console.error("Error processing prescription image:", error);
      return [];
    }
  };

  const handleCategoryChange = (category) => {
    setSearchTerm("");
    setSelectedCategory(category);
  };

  const handleSearchChange = debounce((e) => {
    setSearchTerm(e.target.value);
  }, 300);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const viewCart = () => {
    const auth = getAuth();
    const firebaseUser = auth.currentUser; 
    const manualUser = JSON.parse(localStorage.getItem('user'));
    
    const user = firebaseUser || manualUser;
    navigate(`/user/kiosk/cart/${user.uid}`);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`transition-all duration-500 ease-in-out fixed top-0 left-0 ${isSidebarOpen ? "w-72" : "w-16"} bg-green-800 h-screen text-white p-4 overflow-y-auto`}
      >
        <button onClick={toggleSidebar} className="text-white mb-6 focus:outline-none">
          {isSidebarOpen ? <RxHamburgerMenu /> : <AiFillForward />}
        </button>
        {isSidebarOpen && <h2 className="text-2xl font-semibold mb-6">Categories</h2>}
        <ul className="space-y-4">
          {categories.map((category) => (
            <li
              key={category.name}
              className={`flex items-center p-2 cursor-pointer rounded-md transition-all duration-300 ${
                selectedCategory === category.name ? "bg-green-900 text-white" : "hover:bg-green-700 text-gray-200"
              }`}
              onClick={() => handleCategoryChange(category.name)}
            >
              <span className="text-xl mr-4">{category.icon}</span>
              {isSidebarOpen && <span className="text-lg">{category.name}</span>}
            </li>
          ))}
        </ul>
      </aside>

      <main className={`flex-grow p-6 ${isSidebarOpen ? "ml-72" : "ml-16"}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-3xl font-bold text-gray-800">{selectedCategory}</h2>
            <div className="relative flex items-center w-full sm:w-80">
              <FaSearch className="absolute left-3 text-gray-400 text-lg" />
              <input
                type="text"
                placeholder="Search product..."
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={viewCart} className="relative">
              <AiOutlineShoppingCart className="text-3xl text-green-700" />
              <span className="absolute -top-2 -right-2 bg-green-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                2
              </span>
            </button>
            {selectedCategory === "Prescription Medication" && (
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-sm file:border-0 file:bg-blue-500 file:text-white file:py-1 file:px-3 file:rounded-md hover:file:bg-blue-600 focus:outline-none transition-colors"
                />
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 mt-4">Loading products...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const isVerified = verifiedProducts.some((p) => p.id === product.id);
              const isDisabled =
                product.prescriptionNeeded && (!authenticatedUser || !isVerified);

              return (
                <div
                  key={product.id}
                  onClick={() => !isDisabled && navigate(`/user/kiosk/View-Product/${product.id}`)}
                  className={`relative group bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-green-600 ${isDisabled && "cursor-not-allowed opacity-50"}`}
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-56 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors duration-300">
                      {product.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-2">{product.description}</p>
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-xl font-semibold text-gray-800">₱{product.price}</p>
                      {product.prescriptionNeeded && (
                        <span className="text-xs text-red-600 bg-red-100 rounded-full px-2 py-1">Prescription</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto">
            <h3 className="text-2xl font-semibold text-red-600 mb-4">Prescription Upload</h3>
            <p className="text-gray-700 mb-4">Please upload your prescription for verification.</p>

            <div className="mb-4">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setPrescriptionFile(e.target.files[0])}
                className="w-full py-2 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {prescriptionFile && (
                <p className="mt-2 text-gray-500 text-sm">
                  File selected: {prescriptionFile.name}
                </p>
              )}
            </div>

            {uploadStatus && (
              <div className="bg-gray-100 p-4 rounded-md mb-4">
                <p className="text-center text-gray-700">{uploadStatus}</p>
              </div>
            )}

            <div className="mt-4 flex justify-end space-x-2">
              {/* Close Button */}
              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePrescriptionSubmit}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Submit Prescription
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default Kiosk;



