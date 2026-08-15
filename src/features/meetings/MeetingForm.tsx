import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { InputHTMLAttributes } from 'react'
import type { Client, Contact, Deal, DealMeeting } from '@/types/database'
import { listContactsForClient } from '@/features/pipeline/api'
import {
  MEETING_OUTCOMES,
  MEETING_TYPES,
  meetingSchema,
  nowDatetimeLocal,
  toDatetimeLocalValue,
  type MeetingFormValues,
} from '@/features/meetings/schemas'
import { Button } from '@/components/ui/Button'

type MeetingFormProps = {
  initial?: DealMeeting | null
  deals: Pick<Deal, 'id' | 'name' | 'client_id' | 'contact_id'>[]
  clients: Pick<Client, 'id' | 'name'>[]
  defaultDealId?: string
  submitting: boolean
  formError: string | null
  onSubmit: (values: MeetingFormValues) => Promise<void>
  onCancel: () => void
}

function emptyValues(dealId: string): MeetingFormValues {
  return {
    deal_id: dealId,
    client_id: '',
    contact_id: '',
    meeting_at: nowDatetimeLocal(),
    meeting_type: 'sales_meeting',
    location_or_link: '',
    notes: '',
    outcome: '',
    next_action: '',
  }
}

function toFormValues(meeting: DealMeeting): MeetingFormValues {
  return {
    deal_id: meeting.deal_id,
    client_id: meeting.client_id ?? '',
    contact_id: meeting.contact_id ?? '',
    meeting_at: toDatetimeLocalValue(meeting.meeting_at),
    meeting_type: meeting.meeting_type,
    location_or_link: meeting.location_or_link ?? '',
    notes: meeting.notes ?? '',
    outcome: meeting.outcome ?? '',
    next_action: meeting.next_action ?? '',
  }
}

export function MeetingForm({
  initial,
  deals,
  clients,
  defaultDealId = '',
  submitting,
  formError,
  onSubmit,
  onCancel,
}: MeetingFormProps) {
  const [contacts, setContacts] = useState<Pick<Contact, 'id' | 'first_name' | 'last_name'>[]>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingSchema),
    defaultValues: initial ? toFormValues(initial) : emptyValues(defaultDealId),
  })

  const dealId = watch('deal_id')
  const clientId = watch('client_id')

  useEffect(() => {
    reset(initial ? toFormValues(initial) : emptyValues(defaultDealId))
  }, [initial, defaultDealId, reset])

  useEffect(() => {
    if (!dealId || initial) return
    const deal = deals.find((item) => item.id === dealId)
    if (!deal) return
    setValue('client_id', deal.client_id ?? '')
    setValue('contact_id', deal.contact_id ?? '')
  }, [dealId, deals, initial, setValue])

  useEffect(() => {
    if (!clientId) {
      setContacts([])
      return
    }
    let active = true
    void listContactsForClient(clientId).then((data) => {
      if (active) setContacts(data)
    })
    return () => {
      active = false
    }
  }, [clientId])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="deal_id" className="block text-sm font-medium text-ink">
          Deal
        </label>
        <select id="deal_id" className="input-field mt-1 rounded-md" {...register('deal_id')}>
          <option value="">Select a deal</option>
          {deals.map((deal) => (
            <option key={deal.id} value={deal.id}>
              {deal.name}
            </option>
          ))}
        </select>
        {errors.deal_id ? <p className="mt-1 text-xs text-danger">{errors.deal_id.message}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="client_id" className="block text-sm font-medium text-ink">
            Client
          </label>
          <select id="client_id" className="input-field mt-1 rounded-md" {...register('client_id')}>
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact_id" className="block text-sm font-medium text-ink">
            Contact
          </label>
          <select id="contact_id" className="input-field mt-1 rounded-md" disabled={!clientId} {...register('contact_id')}>
            <option value="">{clientId ? 'No contact' : 'Select a client first'}</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.first_name} {contact.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field id="meeting_at" label="Date and time" type="datetime-local" error={errors.meeting_at?.message} {...register('meeting_at')} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="meeting_type" className="block text-sm font-medium text-ink">
            Meeting type
          </label>
          <select id="meeting_type" className="input-field mt-1 rounded-md" {...register('meeting_type')}>
            {MEETING_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="outcome" className="block text-sm font-medium text-ink">
            Outcome
          </label>
          <select id="outcome" className="input-field mt-1 rounded-md" {...register('outcome')}>
            <option value="">Not set yet</option>
            {MEETING_OUTCOMES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Field id="location_or_link" label="Location or meeting link" error={errors.location_or_link?.message} {...register('location_or_link')} />
      <Field id="next_action" label="Next action" error={errors.next_action?.message} {...register('next_action')} />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea id="notes" rows={3} className="input-field mt-1 rounded-md" {...register('notes')} />
      </div>

      {formError ? (
        <p className="border border-red-200 bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save meeting' : 'Log meeting'}
        </Button>
      </div>
    </form>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }

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
