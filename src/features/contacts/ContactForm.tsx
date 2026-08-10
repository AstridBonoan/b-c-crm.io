import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact } from '@/types/database'
import { contactSchema, type ContactFormValues } from '@/features/contacts/schemas'
import { Button } from '@/components/ui/Button'

type ContactFormProps = {
  initial?: Contact | null
  clients: Pick<Client, 'id' | 'name' | 'client_type'>[]
  submitting: boolean
  formError: string | null
  onSubmit: (values: ContactFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: ContactFormValues = {
  client_id: '',
  first_name: '',
  last_name: '',
  job_title: '',
  email: '',
  phone: '',
  notes: '',
}

function toFormValues(contact: Contact): ContactFormValues {
  return {
    client_id: contact.client_id,
    first_name: contact.first_name,
    last_name: contact.last_name,
    job_title: contact.job_title ?? '',
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    notes: contact.notes ?? '',
  }
}

export function ContactForm({
  initial,
  clients,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="client_id" className="block text-sm font-medium text-ink">
          Client
        </label>
        <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
          <option value="">Select a client…</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name} ({client.client_type})
            </option>
          ))}
        </select>
        {errors.client_id ? (
          <p className="mt-1 text-xs text-danger">{errors.client_id.message}</p>
        ) : null}
        {clients.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">
            No clients yet. Add a client first, then create contacts.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="first_name"
          label="First name"
          error={errors.first_name?.message}
          {...register('first_name')}
        />
        <Field
          id="last_name"
          label="Last name"
          error={errors.last_name?.message}
          {...register('last_name')}
        />
      </div>

      <Field
        id="job_title"
        label="Job title"
        error={errors.job_title?.message}
        {...register('job_title')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="email"
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Field id="phone" label="Phone" error={errors.phone?.message} {...register('phone')} />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || clients.length === 0}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create contact'}
        </Button>
      </div>
    </form>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

function Field({ id, label, error, ...props }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input id={id} className="input-field mt-1 rounded-md" {...props} />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
