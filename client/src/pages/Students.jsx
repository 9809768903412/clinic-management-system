import { useEffect, useState } from 'react'
import api from '../lib/api'

const blank = { name: '', course: '', age: '' }
export default function Students() {
  const [items, setItems] = useState([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    api.get('/students', { signal: controller.signal, params: { search, page, limit: 10 } })
      .then(({ data }) => { setItems(data.items); setPagination({ page: data.page, pages: data.pages, total: data.total }) })
      .catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load students. Please try again.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh, search, page])

  function reload() { setLoading(true); setError(''); setRefresh(value => value + 1) }
  function clearForm() { setForm(blank); setEditing(null); setErrors({}) }
  function change(e) { setForm(current => ({ ...current, [e.target.name]: e.target.value })); setErrors(current => ({ ...current, [e.target.name]: undefined })) }
  async function save(e) {
    e.preventDefault()
    if (busy) return
    const next = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 80) next.name = 'Name must be 2–80 characters.'
    if (!form.course.trim() || form.course.trim().length > 80) next.course = 'Enter a course, up to 80 characters.'
    const age = Number(form.age)
    if (!Number.isInteger(age) || age < 1 || age > 120) next.age = 'Age must be a whole number between 1 and 120.'
    setErrors(next); setMessage(''); setError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const data = { ...form, age }
      if (editing) await api.put(`/students/${editing}`, data)
      else await api.post('/students', data)
      setMessage(editing ? 'Student updated.' : 'Student added.')
      clearForm(); reload()
    } catch (e) { setErrors(e.response?.data?.errors || {}); setError(e.response?.data?.message || 'Could not save. Please try again.') }
    finally { setBusy(false) }
  }
  async function remove(student) {
    if (busy || !window.confirm(`Delete ${student.name}? This cannot be undone.`)) return
    setBusy(true); setError(''); setMessage('')
    try {
      await api.delete(`/students/${student._id}`)
      if (editing === student._id) clearForm()
      setMessage('Student deleted.'); reload()
    } catch (e) { setError(e.response?.data?.message || 'Could not delete. Please try again.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4">
    <h1 className="h3 mb-4">Students</h1>
    {message && <div className="alert alert-success" role="status">{message}</div>}
    {error && <div className="alert alert-danger" role="alert">{error} <button type="button" className="btn btn-link" onClick={reload}>Retry</button></div>}
    <section className="card mb-4"><div className="card-body">
      <h2 className="h5">{editing ? 'Edit student' : 'Add student'}</h2>
      <form onSubmit={save} noValidate><fieldset disabled={busy}><div className="row g-3">
        {['name', 'course', 'age'].map(field => <div className={field === 'age' ? 'col-sm-2' : 'col-sm-5'} key={field}>
          <label className="form-label text-capitalize" htmlFor={`student-${field}`}>{field[0].toUpperCase() + field.slice(1)}</label>
          <input id={`student-${field}`} name={field} value={form[field]} onChange={change} type={field === 'age' ? 'number' : 'text'} min={field === 'age' ? 1 : undefined} max={field === 'age' ? 120 : undefined} maxLength={80} className={`form-control ${errors[field] ? 'is-invalid' : ''}`} aria-invalid={Boolean(errors[field])} aria-describedby={errors[field] ? `${field}-error` : undefined} required />
          {errors[field] && <div className="invalid-feedback" id={`${field}-error`}>{errors[field]}</div>}
        </div>)}
      </div><div className="d-flex gap-2 mt-3"><button className="btn btn-primary">{busy ? 'Saving…' : editing ? 'Save changes' : 'Add student'}</button>{editing && <button type="button" className="btn btn-outline-secondary" onClick={clearForm}>Cancel</button>}</div></fieldset></form>
    </div></section>
    <form className="d-flex flex-wrap gap-2 mb-3" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); setPage(1); reload() }} role="search">
      <label htmlFor="student-search" className="visually-hidden">Search by name or course</label>
      <input id="student-search" className="form-control search-input" value={searchInput} maxLength={80} onChange={e => setSearchInput(e.target.value)} placeholder="Search by name or course" />
      <button className="btn btn-outline-primary" type="submit">Search</button>
      <button className="btn btn-outline-secondary" type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); reload() }}>Clear</button>
    </form>
    {search && <p className="text-secondary">Results for “{search}”</p>}
    {loading ? <p role="status">Loading students…</p> : <div className="table-responsive"><table className="table table-hover align-middle"><thead><tr><th scope="col">Name</th><th scope="col">Course</th><th scope="col">Age</th><th scope="col">Actions</th></tr></thead><tbody>
      {items.map(student => <tr key={student._id}><td>{student.name}</td><td>{student.course}</td><td>{student.age}</td><td><div className="d-flex gap-2"><button className="btn btn-sm btn-outline-primary" disabled={busy} onClick={() => { setEditing(student._id); setForm({ name: student.name, course: student.course, age: String(student.age) }); setErrors({}); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} aria-label={`Edit ${student.name}`}>Edit</button><button className="btn btn-sm btn-outline-danger" disabled={busy} onClick={() => remove(student)} aria-label={`Delete ${student.name}`}>Delete</button></div></td></tr>)}
      {!items.length && <tr><td colSpan="4" className="text-secondary text-center py-4">{search ? 'No matching students.' : 'No students yet. Add your first record above.'}</td></tr>}
    </tbody></table></div>}
    {!loading && !error && <nav className="d-flex flex-wrap justify-content-between align-items-center gap-3" aria-label="Student list pages">
      <span className="text-secondary">{pagination.total} records · Page {pagination.page} of {pagination.pages}</span>
      <div className="d-flex gap-2"><button className="btn btn-outline-secondary" disabled={pagination.page <= 1 || busy} onClick={() => { setPage(pagination.page - 1); reload() }}>Previous</button><button className="btn btn-outline-secondary" disabled={pagination.page >= pagination.pages || busy} onClick={() => { setPage(pagination.page + 1); reload() }}>Next</button></div>
    </nav>}
  </main>
}
