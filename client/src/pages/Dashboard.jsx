import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'
import { visitTime, statusClass } from '../lib/clinic'

export default function Dashboard({ user }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/clinic/summary', { signal: controller.signal }).then(({ data }) => { setData(data); setError('') }).catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load clinic statistics.') })
    return () => controller.abort()
  }, [attempt])
  return <main className="container py-4"><div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4"><div><h1 className="h3 mb-1">Clinic dashboard</h1><p className="text-secondary mb-0">Welcome, {user.name}. <span className="text-capitalize">{user.role}</span></p></div><Link className="btn btn-primary" to={user.role === 'doctor' ? '/consultations' : '/appointments'}>{user.role === 'doctor' ? 'Open consultations' : 'Manage visits'}</Link></div>
    {error && <div role="alert" className="alert alert-danger">{error} <button className="btn btn-link" onClick={() => { setData(null); setError(''); setAttempt(v => v + 1) }}>Retry</button></div>}
    {!data && !error && <p role="status">Loading dashboard…</p>}
    {data && <><section className="row g-3 mb-4" aria-label="Clinic statistics">{[['patients', 'Active patients'], ['scheduled', 'Scheduled visits'], ['waiting', 'Checked in'], ['completed', 'Completed visits']].map(([key, label]) => <div className="col-6 col-lg-3" key={key}><div className="card border-0 shadow-sm h-100"><div className="card-body p-4"><h2 className="h6 text-secondary">{label}</h2><p className="display-6 fw-semibold mb-0">{data[key]}</p></div></div></div>)}</section>
    {user.role === 'doctor' && <p className="small text-secondary">Visit totals and the queue include only visits assigned to you.</p>}
    <section className="card border-0 shadow-sm"><div className="card-body p-4"><h2 className="h5">Active visits</h2>{data.upcoming.length ? <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Clinic time</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead><tbody>{data.upcoming.map(v => <tr key={v._id}><td>{visitTime(v.scheduledAt)}</td><td>{v.patient?.name}</td><td>{v.doctor?.name}</td><td><span className={`badge text-bg-${statusClass(v.status)}`}>{v.status}</span></td></tr>)}</tbody></table></div> : <p className="text-secondary mb-0">No active visits. Reception can book an appointment or check in a walk-in.</p>}</div></section></>}
  </main>
}
