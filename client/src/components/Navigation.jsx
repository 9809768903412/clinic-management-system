import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Navigation({ user, onLogout, loggingOut }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const itemClass = ({ isActive }) => `nav-link${isActive ? ' active fw-semibold' : ''}`
  return <nav className="navbar navbar-expand-md bg-white border-bottom" aria-label="Main navigation"><div className="container">
    <Link className="navbar-brand fw-bold" to={user ? '/dashboard' : '/login'} onClick={close}>Student Records</Link>
    <button className="navbar-toggler" type="button" aria-controls="main-menu" aria-expanded={open} aria-label="Toggle navigation" onClick={() => setOpen(value => !value)}><span className="navbar-toggler-icon" /></button>
    <div id="main-menu" className={`collapse navbar-collapse${open ? ' show' : ''}`}>
      <div className="navbar-nav me-auto">
        {user ? <><NavLink className={itemClass} to="/dashboard" onClick={close}>Dashboard</NavLink><NavLink className={itemClass} to="/students" onClick={close}>Students</NavLink><NavLink className={itemClass} to="/profile" onClick={close}>Profile</NavLink></> : <><NavLink className={itemClass} to="/login" onClick={close}>Login</NavLink><NavLink className={itemClass} to="/register" onClick={close}>Register</NavLink></>}
      </div>
      {user && <div className="d-flex align-items-center gap-3 py-2"><span className="account-name text-secondary" title={user.name}>{user.name}</span><button className="btn btn-outline-secondary btn-sm" disabled={loggingOut} onClick={onLogout}>{loggingOut ? 'Logging out…' : 'Logout'}</button></div>}
    </div>
  </div></nav>
}
