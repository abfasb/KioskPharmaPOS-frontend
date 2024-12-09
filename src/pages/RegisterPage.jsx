import React, { useState } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs'
import Img from '../assets/img/logo4.png'
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function RegisterPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword) {
      alert('All fields are required');
      return;
    }
  
    if (formData.password.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const hashedPassword = await bcrypt.hash(formData.password, 10);
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await addDoc(collection(db, 'users'), {
        uid: user.uid,
        FirstName: formData.firstName,
        LastName: formData.lastName,
        email: formData.email,
        password: hashedPassword 
      });

      setIsSuccessModalOpen(true);
      
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (e) {
      console.error('Error during registration: ', e);
      alert('Registration failed. Please try again.');
    }
  };
  return (
    <section
    className="bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center"
    style={{
      backgroundImage: `url(${Img})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}
  >
    <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
      <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-white">Create an Account</h1>
      <form className="space-y-2" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="John"
            value={formData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="username@example.com"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            className="w-full mt-1 p-3 border border-gray-300 rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="terms"
            className="w-4 h-4 text-blue-600 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
            required
          />
          <label htmlFor="terms" className="ml-2 text-sm text-gray-500 dark:text-gray-300">
            I accept the{' '}
            <a href="#" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
              Terms and Conditions
            </a>
          </label>
        </div>
        <button
          type="submit"
          className="w-full py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Account
        </button>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <a href="/login" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
            Login here
          </a>
        </p>
      </form>
    </div>
  
    {isSuccessModalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
        aria-hidden="true"
      >
        <div className="relative p-6 max-w-md w-full bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <button
            type="button"
            onClick={() => setIsSuccessModalOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <span className="sr-only">Close</span>
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full dark:bg-green-900">
              <svg
                className="w-8 h-8 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              Account created successfully!
            </p>
          </div>
        </div>
      </div>
    )}
  </section>
  
  );
}

export default RegisterPage;


