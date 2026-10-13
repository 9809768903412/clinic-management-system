export function notifySessionChange() {
  try { localStorage.setItem('clinic-session-change', `${Date.now()}-${Math.random()}`) }
  catch { /* Focus checks still synchronize sessions if storage is unavailable. */ }
}
