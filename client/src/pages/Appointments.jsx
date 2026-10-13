import { useEffect, useState } from 'react'
import api from '../lib/api'
import { nextSlot, visitTime, statusClass } from '../lib/clinic'
import Pages from '../components/Pages'

const blank = () => ({ patient: '', doctor: '', scheduledAt: nextSlot(), visitType: 'Appointment', reason: '' })
export default function Appointments({ user }) {
  const canManage = user.role !== 'doctor'
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  const [form, setForm] = useState(blank), [doctors, setDoctors] = useState([]), [patients, setPatients] = useState([]), [patientSearch, setPatientSearch] = useState('')
  const [items, setItems] = useState([]), [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [page, setPage] = useState(1), [status, setStatus] = useState(''), [search, setSearch] = useState(''), [draft, setDraft] = useState('')
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/appointments', { params: { status, page, search }, signal: controller.signal }).then(({ data }) => { setItems(data.items); setPagination(data) }).catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load appointments.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, page, search, refresh])
  useEffect(() => {
    if (!canManage) return
    const controller = new AbortController()
    Promise.all([api.get('/clinic/options', { signal: controller.signal }), api.get('/patients', { params: { limit: 100 }, signal: controller.signal })]).then(([staff, records]) => { setDoctors(staff.data.doctors); setPatients(records.data.items) }).catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load the booking choices.') })
    return () => controller.abort()
  }, [canManage])
  function reload() { setLoading(true); setError(''); setRefresh(v => v + 1) }
  async function findPatients() {
    setError('')
    try { const { data } = await api.get('/patients', { params: { search: patientSearch, limit: 100 } }); setPatients(data.items); setForm(v => ({ ...v, patient: '' })) }
    catch { setError('Cannot search patients.') }
  }
  async function save(e) {
    e.preventDefault(); if (busy) return; setError(''); setMessage('')
    const date = new Date(`${form.scheduledAt}:00+08:00`)
    if (!form.patient || !form.doctor || Number.isNaN(date.getTime())) { setError('Choose a patient, doctor, and appointment time.'); return }
    setBusy(true)
    try { await api.post('/appointments', { ...form, scheduledAt: date.toISOString() }); setMessage('Visit added.'); setForm(blank()); reload() }
    catch (e) { setError(e.response?.data?.message || 'Could not book the visit.') }
    finally { setBusy(false) }
  }
  async function changeStatus(visit, value) {
    if (busy || !window.confirm(`Mark this visit as ${value.toLowerCase()}?`)) return
    setBusy(true); setMessage(''); setError('')
    try { await api.patch(`/appointments/${visit._id}/status`, { status: value }); setMessage(`Visit marked ${value.toLowerCase()}.`); reload() }
    catch (e) { setError(e.response?.data?.message || 'Could not update the visit.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4"><h1 className="h3 mb-2">Appointments & check-in</h1><p className="text-secondary mb-4">Clinic times are shown in Asia/Manila. Each visit reserves a 30-minute slot.</p>
    {error && <div role="alert" className="alert alert-danger">{error} <button className="btn btn-link" onClick={reload}>Retry</button></div>}{message && <div role="status" className="alert alert-success">{message}</div>}
    {canManage && <section className="card border-0 shadow-sm mb-4"><div className="card-body p-4"><h2 className="h5">Book a visit or add a walk-in</h2>
      {!doctors.length && <p className="alert alert-info">An administrator must add an active doctor before booking visits.</p>}
      <div className="d-flex gap-2 mb-3"><label htmlFor="booking-patient-search" className="visually-hidden">Find patient</label><input id="booking-patient-search" className="form-control" placeholder="Find patient by name or ID" value={patientSearch} maxLength={100} onChange={e => setPatientSearch(e.target.value)} /><button type="button" className="btn btn-outline-primary" onClick={findPatients}>Find patient</button></div>
      <form onSubmit={save}><fieldset disabled={busy}><div className="row g-3">
        <div className="col-md-6"><label className="form-label" htmlFor="visit-patient">Patient</label><select id="visit-patient" className="form-select" required value={form.patient} onChange={e => setForm(v => ({ ...v, patient: e.target.value }))}><option value="">Choose an active patient</option>{patients.map(p => <option key={p._id} value={p._id}>{p.name} · {p.patientId}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-doctor">Doctor</label><select id="visit-doctor" className="form-select" required value={form.doctor} onChange={e => setForm(v => ({ ...v, doctor: e.target.value }))}><option value="">Choose a doctor</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-type">Visit type</label><select id="visit-type" className="form-select" value={form.visitType} onChange={e => setForm(v => ({ ...v, visitType: e.target.value, scheduledAt: nextSlot() }))}><option>Appointment</option><option>Walk-in</option></select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-time">Clinic date and time</label><input id="visit-time" className="form-control" type="datetime-local" step="1800" required value={form.scheduledAt} onChange={e => setForm(v => ({ ...v, scheduledAt: e.target.value }))} /></div>
        <div className="col-12"><label className="form-label" htmlFor="visit-reason">Reason for visit</label><input id="visit-reason" className="form-control" maxLength={200} value={form.reason} onChange={e => setForm(v => ({ ...v, reason: e.target.value }))} /></div>
      </div><button className="btn btn-primary mt-3" disabled={!doctors.length}>{busy ? 'Saving…' : 'Add visit'}</button></fieldset></form>
    </div></section>}
    <div className="d-flex flex-wrap gap-2 mb-3"><form className="d-flex gap-2" role="search" onSubmit={e => { e.preventDefault(); setSearch(draft); setPage(1); reload() }}><label className="visually-hidden" htmlFor="visit-search">Search visits</label><input id="visit-search" className="form-control" placeholder="Patient name or ID" maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} /><button className="btn btn-outline-primary">Search</button></form><label htmlFor="visit-filter" className="visually-hidden">Filter visit status</label><select id="visit-filter" className="form-select status-filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); reload() }}><option value="">All statuses</option>{['Scheduled', 'Checked in', 'Completed', 'Cancelled', 'No-show'].map(s => <option key={s}>{s}</option>)}</select></div>
    {loading ? <p role="status">Loading visits…</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Clinic time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(v => <tr key={v._id}><td>{visitTime(v.scheduledAt)}<small className="d-block text-secondary">{v.visitType}</small></td><td>{v.patient?.name}<small className="d-block text-secondary">{v.patient?.patientId}</small></td><td>{v.doctor?.name}</td><td><span className={`badge text-bg-${statusClass(v.status)}`}>{v.status}</span></td><td><div className="d-flex flex-wrap gap-2">{canManage && v.status === 'Scheduled' && <><button className="btn btn-sm btn-outline-primary" disabled={busy || new Date(v.scheduledAt).getTime() > now} onClick={() => changeStatus(v, 'Checked in')}>Check in</button><button className="btn btn-sm btn-outline-danger" disabled={busy || new Date(v.scheduledAt).getTime() > now} onClick={() => changeStatus(v, 'No-show')}>No-show</button></>}{canManage && ['Scheduled', 'Checked in'].includes(v.status) && <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => changeStatus(v, 'Cancelled')}>Cancel visit</button>}{!canManage && v.status === 'Checked in' && <span className="small text-secondary">Ready for consultation</span>}</div></td></tr>)}{!items.length && <tr><td colSpan="5" className="text-center py-4 text-secondary">No matching visits.</td></tr>}</tbody></table></div>}
    {!loading && !error && <Pages pagination={pagination} busy={busy} onPage={value => { setPage(value); reload() }} />}
    {canManage && <p className="small text-secondary mt-3">To reschedule, cancel the existing visit and book a new slot. Completed visits remain in history.</p>}
  </main>
}
