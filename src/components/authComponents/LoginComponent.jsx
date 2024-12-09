import React, { useState } from 'react';
import Img from '../../assets/img/logo4.png'

function LoginComponent({ signInWithGoogle, signInWithUsernameAndPassword, loginError }) {
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async(e) => {
    e.preventDefault();
    const { username, password } = formData;
    const signInWithUserAndPass = await signInWithUsernameAndPassword(username, password);

    if(signInWithUserAndPass) {
      isSuccessModalOpen(true);
    }
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden" style={{backgroundImage: `url(${Img})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
    width: '100%',}}>
  <div className="container flex flex-col mx-auto rounded-lg pt-12 my-4"> 
    <div className="flex justify-center w-full h-full my-auto xl:gap-10 lg:justify-normal md:gap-4 draggable">
      <div className="flex items-center justify-center w-full lg:p-8">
        <div className="flex shadow-lg p-8 bg-white rounded-md items-center xl:p-8"> 
          <form className="flex flex-col w-full h-full pb-4 text-center bg-white rounded-3xl" onSubmit={handleSubmit}> 
            <h3 className="mb-2 text-3xl font-extrabold text-dark-grey-900">Sign In</h3>
            <p className="mb-3 text-grey-700">Enter your username and password</p> 
            <button onClick={signInWithGoogle} className="flex items-center justify-center w-full py-3 mb-5 text-sm font-medium transition duration-300 rounded-2xl text-grey-900 bg-grey-300 hover:bg-grey-400 focus:ring-4 focus:ring-grey-300"> {/* Reduced padding */}
              <img className="h-4 mr-2" src="https://raw.githubusercontent.com/Loopple/loopple-public-assets/main/motion-tailwind/img/logos/logo-google.png" alt="" />
              Sign in with Google
            </button>
            <div className="flex items-center mb-2">
              <hr className="h-0 border-b border-solid border-grey-500 grow" />
              <p className="mx-2 text-grey-600">or</p>
              <hr className="h-0 border-b border-solid border-grey-500 grow" />
            </div>
            <label htmlFor="username" className="mb-1 text-sm text-start text-grey-900">Username*</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="username123"
              className="flex items-center w-full px-4 py-3 mb-4 text-sm font-medium outline-none focus:bg-grey-400 placeholder:text-grey-700 bg-grey-200 text-dark-grey-900 rounded-2xl" 
              value={formData.username}
              onChange={handleChange}
              required
            />
            <label htmlFor="password" className="mb-1 text-sm text-start text-grey-900">Password*</label> 
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter a password"
              className="flex items-center w-full px-4 py-3 mb-4 text-sm font-medium outline-none focus:bg-grey-400 placeholder:text-grey-700 bg-grey-200 text-dark-grey-900 rounded-2xl"
              value={formData.password}
              onChange={handleChange}
              required
            />
            {loginError && <p className="text-red-500">{loginError}</p>}
            <button className="w-full px-4 py-4 mb-4 text-sm font-bold leading-none text-white bg-blue-500 transition duration-300 md:w-80 rounded-2xl hover:bg-purple-blue-600 focus:ring-4 focus:ring-purple-blue-100 bg-purple-blue-500">Sign In</button> 
            <p>Don't have an account? <a className=' text-blue-500' href="/register">Register here.</a></p>
          </form>
        </div>
      </div>
    </div>
  </div>
  {isSuccessModalOpen && (
  <div
    id="successModal"
    tabIndex="-1"
    aria-hidden="true"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
  >
    <div className="relative p-4 w-full max-w-md h-full md:h-auto">
      <div className="relative p-4 text-center bg-white rounded-lg shadow :bg-gray-800 sm:p-5">
        <button
          type="button"
          onClick={() => setIsSuccessModalOpen(false)}
          className="text-gray-400 absolute top-2.5 right-2.5 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center :hover:bg-gray-600 :hover:text-white"
        >
          <svg
            aria-hidden="true"
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Close modal</span>
        </button>
        <div className="w-12 h-12 rounded-full bg-green-100 :bg-green-900 p-2 flex items-center justify-center mx-auto mb-3.5">
          <svg
            aria-hidden="true"
            className="w-8 h-8 text-green-500 :text-green-400"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
          <span className="sr-only">Success</span>
        </div>
        <p className="mb-4 text-lg font-semibold text-gray-900 :text-white">
          Signed In successfully!
        </p>
      </div>
    </div>
  </div>
)}
</div>

  );
}

export default LoginComponent;
