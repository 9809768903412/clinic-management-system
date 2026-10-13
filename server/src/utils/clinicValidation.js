function today() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function patientInput(body = {}) {
  const data = {}; const errors = {};
  for (const field of ['name', 'birthDate', 'sex', 'contact', 'address']) data[field] = typeof body?.[field] === 'string' ? body[field].trim() : '';
  if (data.name.length < 2 || data.name.length > 100) errors.name = 'Name must be 2–100 characters.';
  if (!validDate(data.birthDate) || data.birthDate > today() || data.birthDate < '1900-01-01') errors.birthDate = 'Enter a valid birth date, from 1900 through today.';
  if (!['Female', 'Male', 'Other', 'Not specified'].includes(data.sex)) errors.sex = 'Choose a valid sex option.';
  if (!/^[+\d ()-]{7,30}$/.test(data.contact) || data.contact.replace(/\D/g, '').length < 7 || data.contact.replace(/\D/g, '').length > 15) errors.contact = 'Enter a valid contact number.';
  if (data.address.length > 500) errors.address = 'Address must be under 500 characters.';
  return { data, errors };
}
function pageQuery(query) {
  const search = query.search ?? ''; const pageText = query.page ?? '1'; const limitText = query.limit ?? '10';
  if (typeof search !== 'string' || search.length > 100 || typeof pageText !== 'string' || !/^[1-9]\d*$/.test(pageText) || typeof limitText !== 'string' || !/^[1-9]\d*$/.test(limitText)) return null;
  const page = Number(pageText), limit = Number(limitText);
  if (!Number.isSafeInteger(page) || limit > 100) return null;
  return { search: search.trim(), page, limit };
}
function literalSearch(value) { return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'); }
module.exports = { today, validDate, patientInput, pageQuery, literalSearch };
