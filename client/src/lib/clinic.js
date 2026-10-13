export function clinicDate() {
  return dateParts(new Date()).date
}
function dateParts(date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date)
  const get = type => parts.find(p => p.type === type).value
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` }
}
export function clinicInput(value) { const parts = dateParts(new Date(value)); return `${parts.date}T${parts.time}` }
export function nextSlot() {
  const parts = dateParts(new Date(Math.ceil(Date.now() / 1800000) * 1800000))
  return `${parts.date}T${parts.time}`
}
export function ageFromDate(birthDate) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const [y, m, d] = clinicDate().split('-').map(Number)
  return y - year - (m < month || (m === month && d < day) ? 1 : 0)
}
export function visitTime(value) {
  return new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
export function statusClass(status) {
  return { Scheduled: 'primary', 'Checked in': 'warning', Completed: 'success', Cancelled: 'secondary', 'No-show': 'danger' }[status] || 'secondary'
}
