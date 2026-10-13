import { useState } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import Register from './pages/Register'
import Login from './pages/Login'

export default function App() {
  const [page, setPage] = useState('login')
  const [user, setUser] = useState(null)
  return <>
    <nav className="container pt-4 d-flex gap-2" aria-label="Account navigation">
      <button className="btn btn-outline-primary" onClick={() => setPage('login')}>Login</button>
      <button className="btn btn-outline-primary" onClick={() => setPage('register')}>Register</button>
    </nav>
    {user ? <main className="container py-5"><h1 className="h3">Welcome, {user.name}</h1></main> : page === 'register' ? <Register /> : <Login onLogin={setUser} />}
  </>
}
