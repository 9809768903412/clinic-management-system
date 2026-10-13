import { useEffect, useState } from 'react'
import api from '../lib/api'
import { visitTime, clinicDate } from '../lib/clinic'

const blank = { appointment: '', symptoms: '', findings: '', diagnosis: '', treatment: '', prescription: '', followUpDate: '' }
export default function Consultations() {
  const [form, setForm] = useState(blank), [visits, setVisits] = useState([]), [items, setItems] = useState([])
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [loading, setLoading] = useState(true), [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([api.get('/appointments', { params: { status: 'Checked in', limit: 100 }, signal: controller.signal }), api.get('/clinic/consultations', { signal: controller.signal })])
      .then(([waiting, notes]) => { setVisits(waiting.data.items); setItems(notes.data.items) })
      .catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load consultations.') }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])
  async function save(e) {
    e.preventDefault(); if (busy) return; setError(''); setMessage('')
    if (!form.appointment || !form.symptoms.trim() || !form.diagnosis.trim()) { setError('Choose a checked-in visit and enter symptoms and diagnosis.'); return }
    if (!window.confirm('Save this consultation and mark the visit completed?')) return
    setBusy(true)
    try { const { data } = await api.post('/clinic/consultations', form); setMessage(data.message); setForm(blank); setLoading(true); setRefresh(v => v + 1) }
    catch (e) { setError(e.response?.data?.message || 'Could not save the consultation.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4"><h1 className="h3 mb-4">Consultations</h1>
    {error && <div className="alert alert-danger" role="alert">{error} <button className="btn btn-link" onClick={() => { setError(''); setLoading(true); setRefresh(v => v + 1) }}>Retry</button></div>}{message && <div className="alert alert-success" role="status">{message}</div>}
    {loading ? <p role="status">Loading consultations…</p> : <>
      <section className="card border-0 shadow-sm mb-4"><div className="card-body p-4"><h2 className="h5">Complete a checked-in visit</h2>
        {!visits.length && <p className="text-secondary">No checked-in visits assigned to you.</p>}
        <form onSubmit={save}><fieldset disabled={busy || !visits.length}>
          <label className="form-label" htmlFor="consult-appointment">Checked-in visit</label><select id="consult-appointment" className="form-select mb-3" required value={form.appointment} onChange={e => setForm(v => ({ ...v, appointment: e.target.value }))}><option value="">Choose a visit</option>{visits.map(v => <option value={v._id} key={v._id}>{v.patient?.name} · {v.patient?.patientId} · {visitTime(v.scheduledAt)}</option>)}</select>
          <div className="row g-3">{['symptoms', 'findings', 'diagnosis', 'treatment', 'prescription'].map(field => <div className="col-md-6" key={field}><label className="form-label text-capitalize" htmlFor={`consult-${field}`}>{field[0].toUpperCase() + field.slice(1)}{['symptoms', 'diagnosis'].includes(field) ? ' *' : ''}</label><textarea id={`consult-${field}`} className="form-control" rows="3" maxLength={2000} required={['symptoms', 'diagnosis'].includes(field)} value={form[field]} onChange={e => setForm(v => ({ ...v, [field]: e.target.value }))} /></div>)}<div className="col-md-6"><label className="form-label" htmlFor="consult-followUpDate">Follow-up date (optional)</label><input id="consult-followUpDate" className="form-control" type="date" min={clinicDate()} value={form.followUpDate} onChange={e => setForm(v => ({ ...v, followUpDate: e.target.value }))} /></div></div>
          <p className="small text-secondary mt-3">Saving completes the visit and keeps the consultation in the patient’s history.</p><button className="btn btn-primary">{busy ? 'Saving…' : 'Save consultation & complete visit'}</button>
        </fieldset></form>
      </div></section>
      <section className="card border-0 shadow-sm"><div className="card-body p-4"><h2 className="h5">Your recent consultations</h2>{items.length ? items.map(note => <article className="border-top pt-3 mt-3" key={note._id}><h3 className="h6">{note.patient?.name} · {note.patient?.patientId}</h3><p className="small text-secondary">{visitTime(note.createdAt)}</p>{['symptoms', 'findings', 'diagnosis', 'treatment', 'prescription', 'followUpDate'].map(field => note[field] && <p className="clinical-note" key={field}><strong className="text-capitalize">{field === 'followUpDate' ? 'Follow-up date' : field}:</strong> {note[field]}</p>)}</article>) : <p className="text-secondary">No consultations recorded yet.</p>}</div></section>
    </>}
  </main>
}
