import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import SearchPage from './pages/SearchPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import { ToastProvider } from './components/ToastProvider'
import { AuthProvider, useAuth } from './context/AuthContext'
import './App.css'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="loading">Loading NovaSocial...</div>
  return user ? children : <Navigate to="/auth" replace />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/" element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><HomePage /></motion.div>} />
          <Route path="/explore" element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><ExplorePage /></motion.div>} />
          <Route path="/search" element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><SearchPage /></motion.div>} />
          <Route path="/profile/:username" element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><ProfilePage /></motion.div>} />
          <Route path="/admin" element={<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}><AdminPage /></motion.div>} />
        </Route>
        <Route path="*" element={<div className="page-card">404 · This page does not exist.</div>} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
