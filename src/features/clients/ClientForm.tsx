import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client } from '@/types/database'
import { clientSchema, CLIENT_STATUSES, type ClientFormValues } from '@/features/clients/schemas'
import { Button } from '@/components/ui/Button'

type ClientFormProps = {
  initial?: Client | null
  submitting: boolean
  formError: string | null
  onSubmit: (values: ClientFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: ClientFormValues = {
  client_type: 'organization',
  client_status: 'prospect',
  name: '',
  first_name: '',
  last_name: '',
  industry: '',
  website: '',
  email: '',
  phone: '',
  address: '',
  location: '',
  notes: '',
}

function toFormValues(client: Client): ClientFormValues {
  return {
    client_type: client.client_type,
    client_status: client.client_status ?? 'prospect',
    name: client.name ?? '',
    first_name: client.first_name ?? '',
    last_name: client.last_name ?? '',
    industry: client.industry ?? '',
    website: client.website ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    location: client.location ?? '',
    notes: client.notes ?? '',
  }
}

export function ClientForm({
  initial,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  const clientType = watch('client_type')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-ink">Client type</legend>
        <div className="flex gap-4 text-sm text-ink">
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="organization" {...register('client_type')} />
            Organization
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="radio" value="individual" {...register('client_type')} />
            Individual
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="client_status" className="block text-sm font-medium text-ink">
          Status
        </label>
        <select
          id="client_status"
          className="input-field mt-1 rounded-md"
          {...register('client_status')}
        >
          {CLIENT_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          Prospect = early relationship. Active = working client. Inactive = past client.
        </p>
      </div>

      {clientType === 'organization' ? (
        <>
          <Field
            id="name"
            label="Organization name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Field
            id="industry"
            label="Industry"
            error={errors.industry?.message}
            {...register('industry')}
          />
        </>
      ) : (
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
      )}

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

      <Field
        id="website"
        label="Website"
        error={errors.website?.message}
        {...register('website')}
      />

      <Field
        id="location"
        label="Location"
        error={errors.location?.message}
        {...register('location')}
      />

      <div>
        <label htmlFor="address" className="block text-sm font-medium text-ink">
          Address
        </label>
        <textarea id="address" rows={2} className="input-field mt-1" {...register('address')} />
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1" {...register('notes')} />
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create client'}
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
      <input id={id} className="input-field mt-1" {...props} />
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  )
}
