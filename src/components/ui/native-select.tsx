import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

/*
 * Выпадающий список в стиле shadcn (Radix Select).
 * Раньше был обычный <select>: в тёмной теме браузер рисовал его список белым, и опций не было видно.
 * API прежний, чтобы не переписывать формы: внутрь кладём <option>, onChange получает { target: { value } }.
 */

type Option = { value: string; label: React.ReactNode; disabled?: boolean }

// Radix не разрешает пустое значение у пункта — подменяем его на служебное
const EMPTY = '__empty__'
const toRadix = (v: string) => (v === '' ? EMPTY : v)
const fromRadix = (v: string) => (v === EMPTY ? '' : v)

// Достаём пункты из <option> (в том числе из массивов и фрагментов)
function readOptions(children: React.ReactNode): Option[] {
  const out: Option[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: string | number; children?: React.ReactNode; disabled?: boolean }
    if (child.type === React.Fragment) {
      out.push(...readOptions(props.children))
      return
    }
    if (child.type !== 'option') return
    const text = React.Children.toArray(props.children).join('')
    out.push({ value: String(props.value ?? text), label: props.children, disabled: props.disabled })
  })
  return out
}

type Props = Omit<React.ComponentProps<'select'>, 'onChange' | 'value'> & {
  value?: string | number
  onChange?: (event: React.ChangeEvent<HTMLSelectElement>) => void
}

function NativeSelect({ className, children, value, onChange, id, disabled, ...props }: Props) {
  const options = readOptions(children)
  const current = String(value ?? '')
  return (
    <SelectPrimitive.Root
      value={toRadix(current)}
      disabled={disabled}
      onValueChange={(next) => {
        const v = fromRadix(next)
        // Формы читают только event.target.value
        onChange?.({
          target: { value: v },
          currentTarget: { value: v },
        } as unknown as React.ChangeEvent<HTMLSelectElement>)
      }}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-slot="native-select"
        aria-label={props['aria-label']}
        aria-invalid={props['aria-invalid']}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent py-1 pr-2.5 pl-3 text-left text-sm shadow-xs outline-none dark:bg-input/30',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-destructive data-[placeholder]:text-muted-foreground',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <SelectPrimitive.Viewport className="max-h-72 p-1">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={toRadix(o.value)}
                data-value={o.value}
                disabled={o.disabled}
                className="relative flex cursor-default items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                  <Check className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

export { NativeSelect }
