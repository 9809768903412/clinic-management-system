import { useState } from 'react'
import axios from 'axios'

const emptyForm = { name: '', email: '', password: '', confirmPassword: '' }
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'

export default function Register() {
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function changeField(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setMessage('')
    setSuccess(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (submitting) return
    const nextErrors = {}
    if (form.name.trim().length < 2 || form.name.trim().length > 80) nextErrors.name = 'Enter a name between 2 and 80 characters.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) || form.email.trim().length > 254) nextErrors.email = 'Enter a valid email address.'
    if (form.password.length < 8 || form.password.length > 128 || !form.password.trim()) nextErrors.password = 'Use a password between 8 and 128 characters.'
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    setMessage('')
    setSuccess(false)
    if (Object.keys(nextErrors).length) return

    setSubmitting(true)
    try {
      const { data } = await axios.post(`${apiUrl}/auth/register`, form, { timeout: 10000 })
      setSuccess(true)
      setMessage(data.message)
      setForm(emptyForm)
    } catch (error) {
      setErrors(error.response?.data?.errors || {})
      setMessage(error.response?.data?.message || 'Cannot reach the server. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    { name: 'name', label: 'Full name', type: 'text', autoComplete: 'name', maxLength: 80 },
    { name: 'email', label: 'Email', type: 'email', autoComplete: 'email', maxLength: 254 },
    { name: 'password', label: 'Password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
    { name: 'confirmPassword', label: 'Confirm password', type: 'password', autoComplete: 'new-password', maxLength: 128 },
  ]

  return (
    <main className="container py-5">
      <section className="register-card card border-0 shadow-sm mx-auto">
        <div className="card-body p-4 p-sm-5">
          <h1 className="h3 mb-2">Create an account</h1>
          <p className="text-secondary mb-4">Enter your details to register.</p>
          {message && <div role="status" className={`alert alert-${success ? 'success' : 'danger'}`}>{message}</div>}
          <form onSubmit={submit} noValidate>
            <fieldset disabled={submitting}>
              {fields.map(({ name, label, ...attributes }) => (
                <div className="mb-3" key={name}>
                  <label className="form-label" htmlFor={name}>{label}</label>
                  <input {...attributes} id={name} name={name} value={form[name]} onChange={changeField} required
                    className={`form-control ${errors[name] ? 'is-invalid' : ''}`}
                    aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${name}-error` : undefined} />
                  {errors[name] && <div id={`${name}-error`} className="invalid-feedback">{errors[name]}</div>}
                </div>
              ))}
              <p className="small text-secondary">Use 8–128 characters for your password.</p>
              <button className="btn btn-primary w-100" type="submit">{submitting ? 'Creating account…' : 'Register'}</button>
            </fieldset>
          </form>
        </div>
      </section>
    </main>
  )
}
