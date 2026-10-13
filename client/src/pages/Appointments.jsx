import { useEffect, useState } from 'react'
import api from '../lib/api'
import { nextSlot, visitTime, statusClass, clinicInput } from '../lib/clinic'
import Pages from '../components/Pages'

const blank = () => ({ patient: '', doctor: '', scheduledAt: nextSlot(), visitType: 'Appointment', reason: '' })
export default function Appointments({ user }) {
  const [audit, setAudit] = useState(null)
  const [editing, setEditing] = useState(null)
  function edit(visit) {
    setEditing(visit); setError(''); setMessage('')
    setForm({ patient: visit.patient?._id || '', doctor: visit.doctor?._id || '', scheduledAt: clinicInput(visit.scheduledAt), visitType: visit.visitType, reason: visit.reason })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
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
  }, [canManage, refresh])
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
    try {
      if (editing) await api.put(`/appointments/${editing._id}`, { doctor: form.doctor, scheduledAt: date.toISOString(), reason: form.reason, expectedUpdatedAt: editing.updatedAt })
      else await api.post('/appointments', { ...form, scheduledAt: date.toISOString() })
      setMessage(editing ? 'Visit updated.' : 'Visit added.'); setEditing(null); setForm(blank()); reload()
    }
    catch (e) { setError(e.response?.data?.message || 'Could not book the visit.') }
    finally { setBusy(false) }
  }
  async function changeStatus(visit, value) {
    if (busy || !window.confirm(`Mark this visit as ${value.toLowerCase()}?`)) return
    setBusy(true); setMessage(''); setError('')
    try { await api.patch(`/appointments/${visit._id}/status`, { status: value }); setMessage(`Visit marked ${value.toLowerCase()}.`); if (editing?._id === visit._id) { setEditing(null); setForm(blank()) }; reload() }
    catch (e) { setError(e.response?.data?.message || 'Could not update the visit.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4"><h1 className="h3 mb-2">Appointments & check-in</h1><p className="text-secondary mb-4">Clinic times are shown in Asia/Manila. Each visit reserves a 30-minute slot.</p>
    {error && <div role="alert" className="alert alert-danger">{error} <button className="btn btn-link" onClick={reload}>Retry</button></div>}{message && <div role="status" className="alert alert-success">{message}</div>}
    {canManage && <section className="card border-0 shadow-sm mb-4"><div className="card-body p-4"><h2 className="h5">{editing ? (editing.status === 'Checked in' ? 'Reassign checked-in visit' : 'Edit appointment') : 'Book a visit or add a walk-in'}</h2>
      {!doctors.length && <p className="alert alert-info">An administrator must add an active doctor before booking visits.</p>}
      {!editing && <div className="d-flex gap-2 mb-3"><label htmlFor="booking-patient-search" className="visually-hidden">Find patient</label><input id="booking-patient-search" className="form-control" placeholder="Find patient by name or ID" value={patientSearch} maxLength={100} onChange={e => setPatientSearch(e.target.value)} /><button type="button" className="btn btn-outline-primary" onClick={findPatients}>Find patient</button></div>}
      <form onSubmit={save}><fieldset disabled={busy}><div className="row g-3">
        <div className="col-md-6"><label className="form-label" htmlFor="visit-patient">Patient</label><select id="visit-patient" className="form-select" disabled={Boolean(editing)} required value={form.patient} onChange={e => setForm(v => ({ ...v, patient: e.target.value }))}><option value="">Choose an active patient</option>{editing && <option value={form.patient}>{editing.patient?.name} · {editing.patient?.patientId}</option>}{patients.filter(p => !editing || p._id !== form.patient).map(p => <option key={p._id} value={p._id}>{p.name} · {p.patientId}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-doctor">Doctor</label><select id="visit-doctor" className="form-select" required value={form.doctor} onChange={e => setForm(v => ({ ...v, doctor: e.target.value }))}><option value="">Choose a doctor</option>{doctors.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}</select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-type">Visit type</label><select id="visit-type" className="form-select" disabled={Boolean(editing)} value={form.visitType} onChange={e => setForm(v => ({ ...v, visitType: e.target.value, scheduledAt: nextSlot() }))}><option>Appointment</option><option>Walk-in</option></select></div>
        <div className="col-md-6"><label className="form-label" htmlFor="visit-time">Clinic date and time</label><input id="visit-time" readOnly={form.visitType === 'Walk-in' && !editing} className="form-control" disabled={editing?.status === 'Checked in'} type="datetime-local" step="1800" required value={form.scheduledAt} onChange={e => setForm(v => ({ ...v, scheduledAt: e.target.value }))} /></div>
        <div className="col-12"><label className="form-label" htmlFor="visit-reason">Reason for visit</label><input id="visit-reason" className="form-control" disabled={editing?.status === 'Checked in'} maxLength={200} value={form.reason} onChange={e => setForm(v => ({ ...v, reason: e.target.value }))} /></div>
      </div>{form.visitType === 'Walk-in' && !editing && <div className="mt-3"><button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setForm(v => ({ ...v, scheduledAt: nextSlot() }))}>Use current slot</button><span className="small text-secondary ms-2">Walk-ins use the current or next 30-minute slot.</span></div>}<button className="btn btn-primary mt-3" disabled={!doctors.length}>{busy ? 'Saving…' : editing ? 'Save appointment' : 'Add visit'}</button>{editing && <button type="button" className="btn btn-outline-secondary mt-3 ms-2" onClick={() => { setEditing(null); setForm(blank()); setError('') }}>Cancel edit</button>}</fieldset></form>
    </div></section>}
    <div className="d-flex flex-wrap gap-2 mb-3"><form className="d-flex gap-2" role="search" onSubmit={e => { e.preventDefault(); setSearch(draft); setPage(1); reload() }}><label className="visually-hidden" htmlFor="visit-search">Search visits</label><input id="visit-search" className="form-control" placeholder="Patient name or ID" maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} /><button className="btn btn-outline-primary">Search</button></form><label htmlFor="visit-filter" className="visually-hidden">Filter visit status</label><select id="visit-filter" className="form-select status-filter" value={status} onChange={e => { setStatus(e.target.value); setPage(1); reload() }}><option value="">All statuses</option>{['Scheduled', 'Checked in', 'Completed', 'Cancelled', 'No-show'].map(s => <option key={s}>{s}</option>)}</select></div>
    {loading ? <p role="status">Loading visits…</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Clinic time</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Actions</th></tr></thead><tbody>{items.map(v => <tr key={v._id}><td>{visitTime(v.scheduledAt)}<small className="d-block text-secondary">{v.visitType}</small></td><td>{v.patient?.name}<small className="d-block text-secondary">{v.patient?.patientId}</small></td><td>{v.doctor?.name}</td><td><span className={`badge text-bg-${statusClass(v.status)}`}>{v.status}</span></td><td><div className="d-flex flex-wrap gap-2">{canManage && ['Scheduled', 'Checked in'].includes(v.status) && <button className="btn btn-sm btn-outline-primary" disabled={busy} aria-label={`Edit visit for ${v.patient?.name}`} onClick={() => edit(v)}>{v.status === 'Checked in' ? 'Reassign doctor' : 'Edit'}</button>}{canManage && v.status === 'Scheduled' && <><button className="btn btn-sm btn-outline-primary" disabled={busy || new Date(v.scheduledAt).getTime() > now} onClick={() => changeStatus(v, 'Checked in')}>Check in</button><button className="btn btn-sm btn-outline-danger" disabled={busy || new Date(v.scheduledAt).getTime() > now} onClick={() => changeStatus(v, 'No-show')}>No-show</button></>}{canManage && ['Scheduled', 'Checked in'].includes(v.status) && <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => changeStatus(v, 'Cancelled')}>Cancel visit</button>}{v.edits?.length > 0 && <button className="btn btn-sm btn-outline-secondary" onClick={() => setAudit(v)}>Changes</button>}{!canManage && v.status === 'Checked in' && <span className="small text-secondary">Ready for consultation</span>}</div></td></tr>)}{!items.length && <tr><td colSpan="5" className="text-center py-4 text-secondary">No matching visits.</td></tr>}</tbody></table></div>}
    {audit && <section className="card mt-3"><div className="card-body"><div className="d-flex justify-content-between gap-3"><h2 className="h5">Appointment changes — {audit.patient?.name}</h2><button className="btn btn-sm btn-outline-secondary" onClick={() => setAudit(null)}>Close changes</button></div>{audit.edits.map(change => <article className="border-top pt-3 mt-3" key={change._id}><p>{visitTime(change.at)} · {change.by?.name || 'Clinic staff'}</p><p>Doctor: {change.previousDoctor?.name} → {change.doctor?.name}</p><p>Time: {visitTime(change.previousScheduledAt)} → {visitTime(change.scheduledAt)}</p><p className="clinical-note">Reason: {change.previousReason || 'Not recorded'} → {change.reason || 'Not recorded'}</p></article>)}</div></section>}
    {!loading && !error && <Pages pagination={pagination} busy={busy} onPage={value => { setPage(value); reload() }} />}
    {canManage && <p className="small text-secondary mt-3">Edit scheduled visits to change the doctor, clinic time, or reason. Checked-in visits allow doctor reassignment only. Patient, visit type, and completed visits stay locked.</p>}
  </main>
}
