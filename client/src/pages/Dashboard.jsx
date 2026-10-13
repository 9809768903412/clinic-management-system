import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function Dashboard({ user }) {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/students/summary', { signal: controller.signal })
      .then(({ data }) => { setSummary(data); setError('') })
      .catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load dashboard data. Please try again.') })
    return () => controller.abort()
  }, [attempt])
  return <main className="container py-4">
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h1 className="h3 mb-1">Dashboard</h1><p className="text-secondary mb-0">Welcome back, {user.name}.</p></div><Link className="btn btn-primary" to="/students">Manage students</Link></div>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-link" onClick={() => { setSummary(null); setError(''); setAttempt(value => value + 1) }}>Retry</button></div>}
    {!summary && !error && <p role="status">Loading dashboard…</p>}
    {summary && <>
      <section className="row g-3 mb-4" aria-label="Record overview">
        <div className="col-sm-6"><div className="card h-100 border-0 shadow-sm"><div className="card-body p-4"><h2 className="h6 text-secondary">Student records</h2><p className="display-6 mb-0 fw-semibold">{summary.total}</p></div></div></div>
        <div className="col-sm-6"><div className="card h-100 border-0 shadow-sm"><div className="card-body p-4"><h2 className="h6 text-secondary">Courses represented</h2><p className="display-6 mb-0 fw-semibold">{summary.courses}</p></div></div></div>
      </section>
      <section className="card border-0 shadow-sm"><div className="card-body p-4"><h2 className="h5 mb-3">Recently added students</h2>
        {summary.latest.length ? <div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th scope="col">Name</th><th scope="col">Course</th><th scope="col">Age</th></tr></thead><tbody>{summary.latest.map(student => <tr key={student._id}><td>{student.name}</td><td>{student.course}</td><td>{student.age}</td></tr>)}</tbody></table></div> : <p className="text-secondary mb-0">No student records yet. Add a record to get started.</p>}
      </div></section>
    </>}
  </main>
}
