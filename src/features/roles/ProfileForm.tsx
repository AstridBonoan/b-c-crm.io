import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { Profile } from '@/types/database'
import { USER_ROLES } from '@/features/roles/roles'
import { profileSchema, type ProfileFormValues } from '@/features/roles/schemas'
import { Button } from '@/components/ui/Button'

type ProfileFormProps = {
  initial: Profile
  submitting: boolean
  formError: string | null
  onSubmit: (values: ProfileFormValues) => Promise<void>
  onCancel: () => void
}

export function ProfileForm({
  initial,
  submitting,
  formError,
  onSubmit,
  onCancel,
}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: initial.full_name ?? '',
      role: initial.role,
      is_active: initial.is_active,
    },
  })

  const role = watch('role')

  useEffect(() => {
    reset({
      full_name: initial.full_name ?? '',
      role: initial.role,
      is_active: initial.is_active,
    })
  }, [initial, reset])

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-ink">
          Full name
        </label>
        <input
          id="full_name"
          className="input-field mt-1 rounded-md"
          {...register('full_name')}
        />
        {errors.full_name ? (
          <p className="mt-1 text-xs text-danger">{errors.full_name.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-ink">
          Role
        </label>
        <select id="role" className="input-field mt-1 rounded-md" {...register('role')}>
          {USER_ROLES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.title}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-ink-muted">
          {USER_ROLES.find((item) => item.value === role)?.summary}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" className="rounded border-line" {...register('is_active')} />
        Active team member
      </label>

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
          {submitting ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
