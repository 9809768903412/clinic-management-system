import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { notifySessionChange } from './lib/session'
import Profile from './pages/Profile'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import Consultations from './pages/Consultations'
import Staff from './pages/Staff'
import Login from './pages/Login'

const apiUrl = import.meta.env.VITE_API_URL || '/api'

function AccountApp() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()
  const currentUser = useRef(null)
  const sessionRevision = useRef(0)
  useEffect(() => { currentUser.current = user }, [user])

  useEffect(() => {
    let pending
    function refreshSession() {
      pending?.abort()
      const controller = new AbortController()
      const revision = sessionRevision.current
      pending = controller
      function updateAccount(account) {
        const previous = currentUser.current
        const changed = previous && (previous.id !== account?.id || previous.role !== account?.role)
        currentUser.current = account
        setUser(account)
        if (changed) navigate(account ? '/dashboard' : '/login', { replace: true })
      }
      axios.get(`${apiUrl}/auth/me`, { withCredentials: true, timeout: 10000, signal: controller.signal })
        .then(({ data }) => { if (revision !== sessionRevision.current) return; updateAccount(data.user); setError('') })
        .catch(e => {
          if (axios.isCancel(e) || revision !== sessionRevision.current) return
          updateAccount(null)
          setError(e.response?.status === 401 ? '' : 'Cannot check your session. Check the backend connection and try again.')
        })
        .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    }
    function storageChanged(event) { if (event.key === 'clinic-session-change') refreshSession() }
    function visibilityChanged() { if (document.visibilityState === 'visible') refreshSession() }
    refreshSession()
    window.addEventListener('focus', refreshSession)
    window.addEventListener('storage', storageChanged)
    document.addEventListener('visibilitychange', visibilityChanged)
    return () => {
      pending?.abort()
      window.removeEventListener('focus', refreshSession)
      window.removeEventListener('storage', storageChanged)
      document.removeEventListener('visibilitychange', visibilityChanged)
    }
  }, [attempt, navigate])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true, timeout: 10000 })
      sessionRevision.current += 1
      currentUser.current = null
      setUser(null)
      notifySessionChange()
      navigate('/login', { replace: true })
    } catch (e) {
      if (e.response?.status === 401) { sessionRevision.current += 1; currentUser.current = null; setUser(null); notifySessionChange(); navigate('/login', { replace: true }) }
      else setLogoutError('Logout failed. Please try again.')
    } finally { setLoggingOut(false) }
  }

  function loggedIn(account) { sessionRevision.current += 1; currentUser.current = account; setUser(account); notifySessionChange(); navigate('/dashboard', { replace: true }) }
  if (checking) return <main className="container py-5" role="status">Checking your session…</main>
  if (error) return <main className="container py-5"><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => { setChecking(true); setAttempt(value => value + 1) }}>Retry</button></main>

  return <>
    <Navigation user={user} onLogout={logout} loggingOut={loggingOut} />
    {logoutError && <p className="container mt-3 text-danger" role="alert">{logoutError}</p>}
    <Routes key={`${user?.id || 'signed-out'}-${user?.role || 'none'}`}>
      <Route path="/staff" element={user?.role === 'admin' ? <Staff /> : <Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={loggedIn} />} />
      <Route path="/profile" element={user ? <Profile user={user} onUpdate={setUser} /> : <Navigate to="/login" replace />} />
      <Route path="/patients" element={user ? <Patients user={user} /> : <Navigate to="/login" replace />} />
      <Route path="/appointments" element={user ? <Appointments user={user} /> : <Navigate to="/login" replace />} />
      <Route path="/consultations" element={user?.role === 'doctor' ? <Consultations /> : <Navigate to={user ? '/dashboard' : '/login'} replace />} />
      <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  </>
}
export default function App() { return <BrowserRouter><AccountApp /></BrowserRouter> }
