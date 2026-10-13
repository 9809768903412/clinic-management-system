export default function Pages({ pagination, busy, onPage }) {
  return <nav className="d-flex flex-wrap justify-content-between align-items-center gap-3 mt-3" aria-label="Record pages">
    <span className="text-secondary">{pagination.total} records · Page {pagination.page} of {pagination.pages}</span>
    <div className="d-flex gap-2"><button className="btn btn-outline-secondary" disabled={busy || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button><button className="btn btn-outline-secondary" disabled={busy || pagination.page >= pagination.pages} onClick={() => onPage(pagination.page + 1)}>Next</button></div>
  </nav>
}
