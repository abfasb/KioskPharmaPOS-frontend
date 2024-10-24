import React, { useState } from 'react';

function LoginComponent({ signInWithGoogle, signInWithUsernameAndPassword, loginError }) {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const { username, password } = formData;
    signInWithUsernameAndPassword(username, password);
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden">
      <div className="container flex flex-col mx-auto bg-white rounded-lg pt-12 my-5">
        <div className="flex justify-center w-full h-full my-auto xl:gap-14 lg:justify-normal md:gap-5 draggable">
          <div className="flex items-center justify-center w-full lg:p-12">
            <div className="flex shadow-lg items-center xl:p-10">
              <form className="flex flex-col w-full h-full pb-6 text-center bg-white rounded-3xl" onSubmit={handleSubmit}>
                <h3 className="mb-3 text-4xl font-extrabold text-dark-grey-900">Sign In</h3>
                <p className="mb-4 text-grey-700">Enter your username and password</p>
                <button onClick={signInWithGoogle} className="flex items-center justify-center w-full py-4 mb-6 text-sm font-medium transition duration-300 rounded-2xl text-grey-900 bg-grey-300 hover:bg-grey-400 focus:ring-4 focus:ring-grey-300">
                  <img className="h-5 mr-2" src="https://raw.githubusercontent.com/Loopple/loopple-public-assets/main/motion-tailwind/img/logos/logo-google.png" alt="" />
                  Sign in with Google
                </button>
                <div className="flex items-center mb-3">
                  <hr className="h-0 border-b border-solid border-grey-500 grow" />
                  <p className="mx-4 text-grey-600">or</p>
                  <hr className="h-0 border-b border-solid border-grey-500 grow" />
                </div>
                <label htmlFor="username" className="mb-2 text-sm text-start text-grey-900">Username*</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="username123"
                  className="flex items-center w-full px-5 py-4 mr-2 text-sm font-medium outline-none focus:bg-grey-400 mb-7 placeholder:text-grey-700 bg-grey-200 text-dark-grey-900 rounded-2xl"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="password" className="mb-2 text-sm text-start text-grey-900">Password*</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter a password"
                  className="flex items-center w-full px-5 py-4 mb-5 mr-2 text-sm font-medium outline-none focus:bg-grey-400 placeholder:text-grey-700 bg-grey-200 text-dark-grey-900 rounded-2xl"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                {loginError && <p className="text-red-500">{loginError}</p>}
                <button className="w-full px-6 py-5 mb-5 text-sm font-bold leading-none text-white bg-blue-500 transition duration-300 md:w-96 rounded-2xl hover:bg-purple-blue-600 focus:ring-4 focus:ring-purple-blue-100 bg-purple-blue-500">Sign In</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginComponent;
