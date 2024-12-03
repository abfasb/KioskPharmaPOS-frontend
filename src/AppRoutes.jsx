import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import Login from './pages/Login';
import LandingPage from './pages/LandingPage';
import RegisterPage from './pages/RegisterPage';
import MeetTheTeam from './components/MeetTheTeam';
import NavLayout from './layout/NavLayout';
import Contact from './components/Contact';
import ForgotPasswordComponent from './components/authComponents/ForgotPasswordComponent';
import AdminSide from './pages/adminPage/AdminSide';
import MainKiosk from './pages/kiosk/MainKiosk';
import Cart from './pages/kiosk/Cart';
import Product from './pages/kiosk/Product';
import OrderSummaryPage from './pages/kiosk/OrderSummaryPage';
import PaymentSuccess from './pages/kiosk/PaymentSuccess';
import PrescriptionHistoryPage from './pages/PrescriptionHistoryPage';
import SchemaDisplay from './components/SchemaDisplay';

function AppRoutes() {

  return (
    <Router>
      <Routes>
      <Route path='/login' Component={Login}/>
      <Route path='/register' Component={RegisterPage}/>
      <Route path='/forgot-password' Component={ForgotPasswordComponent}/>
      
      <Route element={<NavLayout />}>
          <Route path="/" Component={LandingPage} />
          <Route path="/meet-the-team" Component={MeetTheTeam} />
          <Route path="/contact-us" Component={Contact} />
          <Route path='/user/order-history' Component={PrescriptionHistoryPage}/>
       </Route>

      <Route path='/user/kiosk' Component={MainKiosk}/>
      <Route path='/get-collection' Component={SchemaDisplay}/>
      <Route path='/user/kiosk/cart/:userId' Component={Cart}/>
      <Route path='/user/kiosk/View-Product/:productId' Component={Product}/>
      <Route path='/user/kiosk/payment-success' Component={PaymentSuccess}/>
      <Route path='/user/kiosk/order-summary' Component={OrderSummaryPage}/>

      <Route path='/admin/' Component={AdminSide} />
      </Routes>
    </Router>
  )
}

export default AppRoutes;