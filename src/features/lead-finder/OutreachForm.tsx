import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import {
  OUTREACH_METHODS,
  OUTREACH_RESULTS,
  outreachSchema,
  type OutreachFormValues,
} from '@/features/lead-finder/schemas'

type OutreachFormProps = {
  submitting: boolean
  formError: string | null
  onSubmit: (values: OutreachFormValues) => Promise<void>
  onCancel: () => void
}

export function OutreachForm({ submitting, formError, onSubmit, onCancel }: OutreachFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OutreachFormValues>({
    resolver: zodResolver(outreachSchema),
    defaultValues: {
      method: 'email',
      contacted_at: new Date().toISOString().slice(0, 10),
      result: 'no_response',
      next_follow_up_at: '',
      notes: '',
    },
  })

  const method = watch('method')

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <p className="text-sm font-medium text-ink">Contact method</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {OUTREACH_METHODS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${
                method === item.value
                  ? 'bg-btn-primary-bg text-btn-primary-fg'
                  : 'border border-line bg-surface-elevated text-ink hover:bg-surface-muted'
              }`}
              onClick={() => setValue('method', item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input type="hidden" {...register('method')} />
      </div>

      <div>
        <label htmlFor="contacted_at" className="block text-sm font-medium text-ink">
          Date contacted
        </label>
        <input
          id="contacted_at"
          type="date"
          className="input-field mt-1 rounded-md"
          {...register('contacted_at')}
        />
        {errors.contacted_at ? (
          <p className="mt-1 text-xs text-danger">{errors.contacted_at.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="result" className="block text-sm font-medium text-ink">
          Result
        </label>
        <select id="result" className="input-field mt-1 rounded-md" {...register('result')}>
          {OUTREACH_RESULTS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="next_follow_up_at" className="block text-sm font-medium text-ink">
          Next follow-up
        </label>
        <input
          id="next_follow_up_at"
          type="date"
          className="input-field mt-1 rounded-md"
          {...register('next_follow_up_at')}
        />
      </div>

      <div>
        <label htmlFor="outreach_notes" className="block text-sm font-medium text-ink">
          Notes
        </label>
        <textarea
          id="outreach_notes"
          rows={3}
          className="input-field mt-1 rounded-md"
          placeholder="Sent intro email about website rebuild."
          {...register('notes')}
        />
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
          {submitting ? 'Saving…' : 'Save outreach'}
        </Button>
      </div>
    </form>
  )
}
