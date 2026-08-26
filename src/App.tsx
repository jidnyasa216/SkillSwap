import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

// Pages
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Messages from './pages/Messages';
import SwapRequests from './pages/SwapRequests';
import Verification from './pages/Verification';
import Review from './pages/Review';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/explore" element={<Explore />} />
            
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<Profile />} />
            
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/edit-profile" element={<ProfileSetup />} />
            
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:swapId" element={<Messages />} />
            
            <Route path="/swap-requests" element={<SwapRequests />} />
            
            <Route path="/verification" element={<Verification />} />
            
            <Route path="/review/:swapId" element={<Review />} />
            
            <Route path="/admin" element={<AdminDashboard />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
