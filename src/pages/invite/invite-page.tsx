import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { AuthLayout } from '@/components/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { acceptInvite, inviteInfo } from '@/data/remote'
import { t } from '@/i18n'
import { apiErrorText } from '@/lib/api'

/*
 * Ссылка-приглашение от админа компании (Settings → Team and roles).
 * Человек задаёт себе пароль и сразу входит. Эта же ссылка — сброс забытого пароля.
 */
export function InvitePage() {
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState<{ email: string; name: string; company: string }>()
  const [loadError, setLoadError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    inviteInfo(token)
      .then(setInfo)
      .catch((e: unknown) => setLoadError(t(apiErrorText(e))))
  }, [token])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (password.length < 8) return setError(t('At least 8 characters'))
    if (!/\d/.test(password) || !/[A-Za-zА-Яа-я]/.test(password))
      return setError(t('Use letters and at least one digit'))
    if (password !== confirm) return setError(t('Passwords do not match'))
    setSaving(true)
    acceptInvite(token, password)
      .then(() => navigate('/', { replace: true }))
      .catch((e: unknown) => {
        setError(t(apiErrorText(e)))
        setSaving(false)
      })
  }

  return (
    <AuthLayout tab="signin">
      <div className="px-6 pt-7 pb-6 sm:px-8">
        {loadError ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Link does not work')}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link to="/login">{t('Go to sign in')}</Link>
            </Button>
          </>
        ) : !info ? (
          <p className="text-sm text-muted-foreground">{t('Loading…')}</p>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t('Set your password')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('{name}, you are joining {company}. You will sign in with {email}.', info)}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="invite-password">{t('New password')}</Label>
                <Input
                  id="invite-password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-confirm">{t('Repeat password')}</Label>
                <Input
                  id="invite-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value)
                    setError('')
                  }}
                  className="h-11"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={saving}>
                {t('Save and sign in')}
              </Button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
