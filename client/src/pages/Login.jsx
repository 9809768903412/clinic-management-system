import { useState } from 'react'
import axios from 'axios'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'
export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    if (busy) return
    if (!email.trim() || !password) { setMessage('Enter your email and password.'); return }
    setBusy(true)
    setMessage('')
    try {
      const { data } = await axios.post(`${apiUrl}/auth/login`, { email, password }, { withCredentials: true, timeout: 10000 })
      setPassword('')
      onLogin(data.user)
    } catch (error) { setMessage(error.response?.data?.message || 'Cannot reach the server. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="container py-5"><section className="register-card card border-0 shadow-sm mx-auto"><div className="card-body p-4 p-sm-5">
    <h1 className="h3">Login</h1>
    {message && <div role="alert" className="alert alert-danger">{message}</div>}
    <form onSubmit={submit}><fieldset disabled={busy}>
      <label htmlFor="login-email" className="form-label">Email</label>
      <input id="login-email" className="form-control mb-3" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="login-password" className="form-label">Password</label>
      <input id="login-password" className="form-control mb-4" type="password" autoComplete="current-password" maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} />
      <button className="btn btn-primary w-100">{busy ? 'Logging in…' : 'Login'}</button>
    </fieldset></form>
  </div></section></main>
}
