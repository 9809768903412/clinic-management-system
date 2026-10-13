import { useEffect, useState } from 'react'
import axios from 'axios'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import Profile from './pages/Profile'
import Navigation from './components/Navigation'
import Dashboard from './pages/Dashboard'
import Students from './pages/Students'
import Register from './pages/Register'
import Login from './pages/Login'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

function AccountApp() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const controller = new AbortController()
    axios.get(`${apiUrl}/auth/me`, { withCredentials: true, timeout: 10000, signal: controller.signal })
      .then(({ data }) => { setUser(data.user); setError('') })
      .catch(e => { if (!axios.isCancel(e)) { setUser(null); setError(e.response?.status === 401 ? '' : 'Cannot check your session. Check the backend connection and try again.') } })
      .finally(() => { if (!controller.signal.aborted) setChecking(false) })
    return () => controller.abort()
  }, [attempt])

  async function logout() {
    if (loggingOut) return
    setLoggingOut(true)
    setLogoutError('')
    try {
      await axios.post(`${apiUrl}/auth/logout`, {}, { withCredentials: true, timeout: 10000 })
      setUser(null)
      navigate('/login', { replace: true })
    } catch (e) {
      if (e.response?.status === 401) { setUser(null); navigate('/login', { replace: true }) }
      else setLogoutError('Logout failed. Please try again.')
    } finally { setLoggingOut(false) }
  }

  function loggedIn(account) { setUser(account); navigate('/dashboard', { replace: true }) }
  if (checking) return <main className="container py-5" role="status">Checking your session…</main>
  if (error) return <main className="container py-5"><p role="alert">{error}</p><button className="btn btn-primary" onClick={() => { setChecking(true); setAttempt(value => value + 1) }}>Retry</button></main>

  return <>
    <Navigation user={user} onLogout={logout} loggingOut={loggingOut} />
    {logoutError && <p className="container mt-3 text-danger" role="alert">{logoutError}</p>}
    <Routes>
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={loggedIn} />} />
      <Route path="/profile" element={user ? <Profile user={user} onUpdate={setUser} /> : <Navigate to="/login" replace />} />
      <Route path="/students" element={user ? <Students /> : <Navigate to="/login" replace />} />
      <Route path="/dashboard" element={user ? <Dashboard user={user} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  </>
}
export default function App() { return <BrowserRouter><AccountApp /></BrowserRouter> }
