import { ChevronDown, Mail } from 'lucide-react'

import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { t } from '@/i18n'

const SUPPORT_EMAIL = 'support@omniroute.app'

// Частые вопросы: как устроена работа в системе, коротко и по шагам
const FAQ = [
  {
    q: 'How does a quotation become a shipment?',
    a: 'Open the quotation and press "Create shipment". Route, cargo, customer and carriers are copied over. One quotation gives one shipment.',
  },
  {
    q: 'Where do I issue an invoice to the customer?',
    a: 'Invoices are issued from the shipment: open it and use "Create invoice" in Customer payments. Payments against the invoice are recorded there too.',
  },
  {
    q: 'Who sees what?',
    a: 'Admin sees and changes everything, including the team. Accountant sees orders and invoices and records payments. Employee works with orders and does not see payments.',
  },
  {
    q: 'How are numbers like AT000001 made?',
    a: 'From the prefix in Settings → Company → Document numbers. Quotations, shipments and invoices each count from 1.',
  },
  {
    q: 'How do I add a colleague?',
    a: 'Settings → Team and roles → Add person. They get an invitation by email and set their own password.',
  },
]

export function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <PageHeader title="Support" description="Answers to common questions and how to reach us." />

      <Card>
        <CardHeader>
          <CardTitle>{t('Write to us')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {t('Describe what happened and, if you can, attach a screenshot. We answer on working days.')}
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
          >
            <Mail className="size-4" />
            {SUPPORT_EMAIL}
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Common questions')}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y text-sm">
          {FAQ.map((item) => (
            <details key={item.q} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium">
                {t(item.q)}
                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 leading-relaxed text-muted-foreground">{t(item.a)}</p>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
