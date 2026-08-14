import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Lead } from '@/types/database'
import {
  LEAD_FORM_STATUSES,
  leadSchema,
  type LeadFormValues,
} from '@/features/leads/schemas'
import { Button } from '@/components/ui/Button'

type LeadFormProps = {
  initial?: Lead | null
  linkedClientName?: string | null
  submitting: boolean
  formError: string | null
  onSubmit: (values: LeadFormValues) => Promise<void>
  onCancel: () => void
}

const emptyValues: LeadFormValues = {
  company_name: '',
  source: '',
  service_interested: '',
  status: 'new',
  estimated_value: '',
  notes: '',
  last_contacted_at: '',
  next_follow_up_at: '',
}

function toDateInput(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 10)
}

function toFormValues(lead: Lead): LeadFormValues {
  const status: LeadFormValues['status'] =
    lead.status === 'converted'
      ? 'following_up'
      : lead.status === 'new' ||
          lead.status === 'contacted' ||
          lead.status === 'following_up' ||
          lead.status === 'lost'
        ? lead.status
        : 'new'

  return {
    company_name: lead.company_name ?? '',
    source: lead.source ?? '',
    service_interested: lead.service_interested ?? '',
    status,
    estimated_value:
      lead.estimated_value === null || lead.estimated_value === undefined
        ? ''
        : String(lead.estimated_value),
    notes: lead.notes ?? '',
    last_contacted_at: toDateInput(lead.last_contacted_at),
    next_follow_up_at: toDateInput(lead.next_follow_up_at),
  }
}

export function LeadForm({
  initial,
  linkedClientName,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: LeadFormProps) {
  const isConverted = initial?.status === 'converted'

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues,
  })

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues)
  }, [initial, reset])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-ink-muted">
        Capture the interest here. When they’re ready, use <strong>Convert</strong> to turn this
        lead into a client.
      </p>

      {linkedClientName ? (
        <p className="border border-line bg-surface-muted px-3 py-2 text-sm text-ink">
          Linked client: <span className="font-semibold">{linkedClientName}</span>
          {isConverted ? ' · Already converted' : null}
        </p>
      ) : null}

      {!isConverted ? (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-ink">
            Status
          </label>
          <select id="status" className="input-field mt-1 rounded-md" {...register('status')}>
            {LEAD_FORM_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          Status is <strong>Converted</strong>. Edit the client record for relationship details.
        </p>
      )}

      <Field
        id="company_name"
        label="Company"
        error={errors.company_name?.message}
        {...register('company_name')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="source" label="Lead source" error={errors.source?.message} {...register('source')} />
        <Field
          id="service_interested"
          label="Service interested in"
          error={errors.service_interested?.message}
          {...register('service_interested')}
        />
      </div>

      <Field
        id="estimated_value"
        label="Estimated value (USD)"
        type="number"
        step="0.01"
        min="0"
        error={errors.estimated_value?.message}
        {...register('estimated_value')}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="last_contacted_at"
          label="Last contacted"
          type="date"
          error={errors.last_contacted_at?.message}
          {...register('last_contacted_at')}
        />
        <Field
          id="next_follow_up_at"
          label="Next follow-up"
          type="date"
          error={errors.next_follow_up_at?.message}
          {...register('next_follow_up_at')}
        />
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
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Create lead'}
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
