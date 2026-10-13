import { useState } from 'react'
import api from '../lib/api'

export default function Profile({ user, onUpdate }) {
  const [passwords, setPasswords] = useState({ currentPassword: '', password: '', confirmPassword: '' })
  async function changePassword(event) {
    event.preventDefault(); if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await api.post('/auth/password', passwords); window.location.assign('/login') }
    catch (e) { setError(e.response?.data?.message || 'Could not change your password.') }
    finally { setBusy(false) }
  }
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  async function save(event) {
    event.preventDefault()
    if (busy) return
    setMessage(''); setError('')
    if (name.trim().length < 2 || name.trim().length > 80) { setError('Name must be 2–80 characters.'); return }
    setBusy(true)
    try {
      const { data } = await api.patch('/auth/profile', { name: name.trim() })
      onUpdate(data.user); setName(data.user.name); setMessage(data.message)
    } catch (e) { setError(e.response?.data?.message || 'Could not update your profile. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4"><section className="register-card card border-0 shadow-sm mx-auto"><div className="card-body p-4">
    <h1 className="h3 mb-4">My profile</h1>
    {message && <div role="status" className="alert alert-success">{message}</div>}
    {error && <div id="profile-error" role="alert" className="alert alert-danger">{error}</div>}
    <form onSubmit={save} noValidate><fieldset disabled={busy}>
      <label className="form-label" htmlFor="profile-name">Full name</label>
      <input id="profile-name" className="form-control mb-3" value={name} maxLength={80} autoComplete="name" required onChange={e => { setName(e.target.value); setError(''); setMessage('') }} aria-invalid={Boolean(error)} aria-describedby={error ? 'profile-error' : undefined} />
      <label className="form-label" htmlFor="profile-email">Email</label>
      <input id="profile-email" className="form-control mb-2" value={user.email} readOnly type="email" aria-describedby="email-note" />
      <p id="email-note" className="small text-secondary mb-4">Your email is used to log in and cannot be changed here.</p>
      <button className="btn btn-primary" type="submit">{busy ? 'Saving…' : 'Save profile'}</button>
    </fieldset></form>
    <form className="border-top mt-4 pt-4" onSubmit={changePassword}><fieldset disabled={busy}><h2 className="h5">Change password</h2><p className="small text-secondary">Use 8–128 characters. You will be logged out after changing it.</p>{[['currentPassword', 'Current password'], ['password', 'New password'], ['confirmPassword', 'Confirm new password']].map(([field, label]) => <div className="mb-3" key={field}><label className="form-label" htmlFor={`profile-${field}`}>{label}</label><input id={`profile-${field}`} className="form-control" type="password" required minLength={field === 'currentPassword' ? undefined : 8} maxLength={128} autoComplete={field === 'currentPassword' ? 'current-password' : 'new-password'} value={passwords[field]} onChange={e => setPasswords(v => ({ ...v, [field]: e.target.value }))} /></div>)}<button className="btn btn-outline-primary">Change password</button></fieldset></form>
  </div></section></main>
}
