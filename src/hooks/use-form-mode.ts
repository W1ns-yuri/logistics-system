import { useState } from 'react'
import { useSearchParams } from 'react-router'

import { usePermissions } from '@/data/auth'

// Окно создания/редактирования. ?new=1 (из меню «New» в шапке) сразу открывает создание,
// даже если мы уже на этой странице. Кому создавать нельзя (бухгалтер, лицензия истекла), ссылка ничего не открывает
export function useFormMode() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { canEditOrders } = usePermissions()
  const [state, setMode] = useState<'new' | 'edit'>()
  const mode = searchParams.get('new') && canEditOrders ? 'new' : state
  const close = () => {
    setMode(undefined)
    if (searchParams.get('new')) setSearchParams({}, { replace: true })
  }
  return { mode, setMode, close }
}
