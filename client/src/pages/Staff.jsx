import { useEffect, useState } from 'react'
import api from '../lib/api'
import Register from './Register'

export default function Staff() {
  const [items, setItems] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [refresh, setRefresh] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api.get('/staff', { signal: controller.signal }).then(({ data }) => setItems(data.items)).catch(e => { if (e.code !== 'ERR_CANCELED') setError('Cannot load staff accounts.') })
    return () => controller.abort()
  }, [refresh])
  async function toggle(user) {
    if (busy || !window.confirm(`${user.active ? 'Disable' : 'Enable'} ${user.name}'s account?`)) return
    setBusy(true); setError('')
    try { await api.patch(`/staff/${user.id}/active`, { active: !user.active }); setRefresh(v => v + 1) }
    catch (e) { setError(e.response?.data?.message || 'Could not update the account.') }
    finally { setBusy(false) }
  }
  return <main className="container py-4"><h1 className="h3">Staff accounts</h1>{error && <div className="alert alert-danger" role="alert">{error}</div>}
    <Register onCreated={() => setRefresh(v => v + 1)} />
    <div className="table-responsive"><table className="table align-middle"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{items.map(user => <tr key={user.id}><td>{user.name}</td><td>{user.email}</td><td className="text-capitalize">{user.role}</td><td>{user.active ? 'Active' : 'Disabled'}</td><td>{user.role !== 'admin' && <button className="btn btn-sm btn-outline-secondary" disabled={busy} onClick={() => toggle(user)}>{user.active ? 'Disable' : 'Enable'}</button>}</td></tr>)}</tbody></table></div>
  </main>
}
