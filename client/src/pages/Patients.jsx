import { useEffect, useState } from 'react'
import api from '../lib/api'
import { ageFromDate, clinicDate, visitTime } from '../lib/clinic'
import Pages from '../components/Pages'

const blank = { name: '', birthDate: '', sex: 'Not specified', contact: '', address: '' }
export default function Patients({ user }) {
  const canEdit = ['admin', 'receptionist'].includes(user.role)
  const [items, setItems] = useState([]), [form, setForm] = useState(blank), [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({}), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0)
  const [draft, setDraft] = useState(''), [search, setSearch] = useState(''), [page, setPage] = useState(1), [archived, setArchived] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 }), [history, setHistory] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/patients', { params: { search, page, archived }, signal: controller.signal })
      .then(({ data }) => { setItems(data.items); setPagination(data) })
      .catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load patients. Please try again.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [search, page, archived, refresh])
  function reload() { setLoading(true); setError(''); setRefresh(v => v + 1) }
  function clear() { setForm(blank); setEditing(null); setErrors({}) }
  async function save(e) {
    e.preventDefault(); if (busy) return
    setBusy(true); setError(''); setMessage(''); setErrors({})
    try {
      if (editing) await api.put(`/patients/${editing}`, form); else await api.post('/patients', form)
      setMessage(editing ? 'Patient updated.' : 'Patient added.'); clear(); reload()
    } catch (e) { setErrors(e.response?.data?.errors || {}); setError(e.response?.data?.message || 'Could not save the patient.') }
    finally { setBusy(false) }
  }
  async function archive(patient) {
    if (busy || !window.confirm(`${patient.archived ? 'Restore' : 'Archive'} ${patient.name}? Visit history will be preserved.`)) return
    setBusy(true); setError(''); setMessage('')
    try { await api.patch(`/patients/${patient._id}/archive`, { archived: !patient.archived }); if (editing === patient._id) clear(); setMessage(patient.archived ? 'Patient restored.' : 'Patient archived.'); reload() }
    catch (e) { setError(e.response?.data?.message || 'Could not change the archive status.') }
    finally { setBusy(false) }
  }
  async function remove(patient) {
    if (busy || !window.confirm(`Permanently delete ${patient.name}? Only records with no visit history can be deleted. This cannot be undone.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await api.delete(`/patients/${patient._id}`)
      if (editing === patient._id) clear()
      setMessage('Patient deleted.'); reload()
    } catch (e) { setError(e.response?.data?.message || 'Could not delete the patient.') }
    finally { setBusy(false) }
  }
  async function viewHistory(patient) {
    setHistory({ patient, loading: true, items: [] }); setError('')
    try { const { data } = await api.get(`/patients/${patient._id}/history`); setHistory({ patient, loading: false, items: data.items }) }
    catch (e) { setHistory(null); setError(e.response?.data?.message || 'Cannot load the clinical history.') }
  }
  const fields = [ ['name', 'Full name', 'text'], ['birthDate', 'Date of birth', 'date'], ['contact', 'Contact number', 'tel'], ['address', 'Address', 'text'] ]
  return <main className="container py-4"><h1 className="h3 mb-4">Patients</h1>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-link" onClick={reload}>Retry</button></div>}
    {message && <div className="alert alert-success" role="status">{message}</div>}
    {canEdit && <section className="card border-0 shadow-sm mb-4"><div className="card-body p-4"><h2 className="h5">{editing ? 'Edit patient' : 'Add patient'}</h2>
      <form onSubmit={save} noValidate><fieldset disabled={busy}><div className="row g-3">
        {fields.map(([field, label, type]) => <div className="col-md-6" key={field}><label className="form-label" htmlFor={`patient-${field}`}>{label}</label><input id={`patient-${field}`} type={type} value={form[field]} max={type === 'date' ? clinicDate() : undefined} min={type === 'date' ? '1900-01-01' : undefined} maxLength={field === 'address' ? 500 : field === 'contact' ? 30 : 100} className={`form-control ${errors[field] ? 'is-invalid' : ''}`} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} onChange={e => setForm(v => ({ ...v, [field]: e.target.value }))} />{errors[field] && <div id={`${field}-error`} className="invalid-feedback">{errors[field]}</div>}</div>)}
        <div className="col-md-6"><label className="form-label" htmlFor="patient-sex">Sex</label><select id="patient-sex" className="form-select" value={form.sex} onChange={e => setForm(v => ({ ...v, sex: e.target.value }))}>{['Not specified', 'Female', 'Male', 'Other'].map(value => <option key={value}>{value}</option>)}</select></div>
      </div><div className="d-flex gap-2 mt-3"><button className="btn btn-primary">{busy ? 'Saving…' : editing ? 'Save patient' : 'Add patient'}</button>{editing && <button className="btn btn-outline-secondary" type="button" onClick={clear}>Cancel</button>}</div></fieldset></form>
    </div></section>}
    <form className="d-flex flex-wrap gap-2 mb-3" role="search" onSubmit={e => { e.preventDefault(); setSearch(draft.trim()); setPage(1); reload() }}><label htmlFor="patient-search" className="visually-hidden">Search patients</label><input id="patient-search" className="form-control search-input" placeholder="Name, patient ID, or contact" maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} /><button className="btn btn-outline-primary">Search</button><button className="btn btn-outline-secondary" type="button" onClick={() => { setDraft(''); setSearch(''); setPage(1); reload() }}>Clear</button></form>
    <label className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={archived} onChange={e => { setArchived(e.target.checked); setPage(1); clear(); reload() }} /><span className="form-check-label">Show archived records</span></label>
    {search && <p className="text-secondary">Results for “{search}”</p>}
    {loading ? <p role="status">Loading patients…</p> : <div className="table-responsive"><table className="table align-middle"><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Contact</th><th>Actions</th></tr></thead><tbody>{items.map(p => <tr key={p._id}><td className="text-nowrap">{p.patientId}</td><td>{p.name}</td><td>{ageFromDate(p.birthDate)}</td><td>{p.contact}</td><td><div className="d-flex flex-wrap gap-2">{canEdit && <><button className="btn btn-sm btn-outline-primary" disabled={busy} aria-label={`Edit ${p.name}`} onClick={() => { setEditing(p._id); setForm({ name: p.name, birthDate: p.birthDate, sex: p.sex, contact: p.contact, address: p.address }); setErrors({}); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Edit</button><button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => archive(p)}>{p.archived ? 'Restore' : 'Archive'}</button><button className="btn btn-sm btn-outline-danger" disabled={busy} aria-label={`Delete ${p.name}`} onClick={() => remove(p)}>Delete</button></>}{user.role === 'doctor' && <button className="btn btn-sm btn-outline-primary" onClick={() => viewHistory(p)}>History</button>}</div></td></tr>)}{!items.length && <tr><td colSpan="5" className="text-center text-secondary py-4">No matching patient records.</td></tr>}</tbody></table></div>}
    {!loading && !error && <Pages pagination={pagination} busy={busy} onPage={value => { setPage(value); reload() }} />}
    {history && <section className="card mt-4" aria-label="Clinical history"><div className="card-body"><div className="d-flex justify-content-between gap-3"><h2 className="h5">{history.patient.name} — consultation history</h2><button className="btn btn-sm btn-outline-secondary" onClick={() => setHistory(null)}>Close history</button></div>{history.loading ? <p>Loading history…</p> : history.items.length ? history.items.map(note => <article className="border-top pt-3 mt-3" key={note._id}><p className="text-secondary">{visitTime(note.createdAt)} · Dr. {note.doctor?.name}</p>{['symptoms', 'findings', 'diagnosis', 'treatment', 'prescription', 'followUpDate'].map(field => note[field] && <p key={field} className="clinical-note"><strong className="text-capitalize">{field === 'followUpDate' ? 'Follow-up date' : field}:</strong> {note[field]}</p>)}</article>) : <p>No consultations recorded.</p>}</div></section>}
  </main>
}
