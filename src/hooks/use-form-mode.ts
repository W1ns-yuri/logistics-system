import { useState } from 'react'
import { useSearchParams } from 'react-router'

// Окно создания/редактирования. ?new=1 (из меню «New» в шапке) сразу открывает создание,
// даже если мы уже на этой странице.
export function useFormMode() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [state, setMode] = useState<'new' | 'edit'>()
  const mode = searchParams.get('new') ? 'new' : state
  const close = () => {
    setMode(undefined)
    if (searchParams.get('new')) setSearchParams({}, { replace: true })
  }
  return { mode, setMode, close }
}
