import { useEffect, useState } from 'react'
import axios from 'axios'
import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export default function App() {
  const [health, setHealth] = useState({ state: 'loading', message: 'Checking backend connection…' })

  useEffect(() => {
    const controller = new AbortController()
    axios.get(`${apiUrl}/health`, { signal: controller.signal, timeout: 6000 })
      .then(({ data }) => setHealth({ state: 'ready', message: `Backend ready · MongoDB ${data.database}` }))
      .catch((error) => {
        if (axios.isCancel(error)) return
        setHealth({ state: 'error', message: 'Backend unavailable. Start MongoDB and the server, then refresh.' })
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="container py-5">
      <div className="project-shell mx-auto">
        <p className="text-uppercase text-primary fw-semibold small">Advanced Web Programming</p>
        <h1 className="display-5 fw-bold">MERN Project Foundation</h1>
        <p className="lead text-secondary">A shared starting point for our group’s full-stack project.</p>
        <div role="status" aria-live="polite" className={`alert alert-${health.state === 'ready' ? 'success' : health.state === 'error' ? 'warning' : 'info'}`}>
          {health.message}
        </div>
        <section className="card border-0 shadow-sm mt-4">
          <div className="card-body p-4">
            <h2 className="h4">Foundation includes</h2>
            <ul className="mb-0">
              <li>React and Vite with Axios and Bootstrap</li>
              <li>Express backend with MongoDB connection and health endpoint</li>
              <li>Environment templates and team setup instructions</li>
            </ul>
          </div>
        </section>
        <p className="text-secondary mt-4">Authentication, routing, CRUD, and the final system interface are upcoming team tasks.</p>
      </div>
    </main>
  )
}
