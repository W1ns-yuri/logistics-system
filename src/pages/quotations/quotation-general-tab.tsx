import { InfoField } from '@/components/info-field'
import { SectionCard } from '@/components/section-card'
import { TransportModeLabel } from '@/components/transport-mode'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cargoTotals, upgradeQuotationCargo, weightsDiffer } from '@/lib/cargo'
import { formatWeight } from '@/lib/format'
import { movementLabels, needsPorts } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'
import { t } from '@/i18n'
import { terminalLabels } from '@/lib/terminals'

// Вкладка General: поля со слайда 3 презентации, сгруппированы по смыслу
export function QuotationGeneralTab({ quotation }: { quotation: Quotation }) {
  const q = upgradeQuotationCargo(quotation)
  const cargo = cargoTotals(q.cargo)
  const perUnit = q.weightPerUnitKg ?? q.weightKg

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3">
      <SectionCard title="Customer">
        <div className="space-y-4">
          <InfoField label="Quotation #">
            <span className="font-medium">{q.reference}</span>
          </InfoField>
          <InfoField label="Customer">
            <div className="font-medium">{q.customer}</div>
            <div className="text-sm text-muted-foreground">{q.customerAddress}</div>
          </InfoField>
          <InfoField label="Contact person">{q.contactPerson}</InfoField>
        </div>
      </SectionCard>

      <SectionCard title="Route">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Pick up location">{q.collectionAddress}</InfoField>
          <InfoField label="Delivery location">{q.deliveryAddress}</InfoField>
          {(needsPorts(q.mode, q.movement) || q.portOfDeparture || q.portOfDelivery) && (
            <>
              <InfoField label={terminalLabels(q.mode).from}>{q.portOfDeparture}</InfoField>
              <InfoField label={terminalLabels(q.mode).to}>{q.portOfDelivery}</InfoField>
            </>
          )}
          <InfoField label="Incoterms">{q.incoterm}</InfoField>
          <InfoField label="Movement">{t(movementLabels[q.movement])}</InfoField>
        </div>
      </SectionCard>

      <SectionCard title="Transport">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Mode">
            <TransportModeLabel mode={q.mode} />
          </InfoField>
          <InfoField label="Equipment">{q.equipment}</InfoField>
          <InfoField label="Quantity">{q.transportQuantity}</InfoField>
          <InfoField label="Nature of goods">{q.natureOfGoods}</InfoField>
          <InfoField label="Weight per unit">{formatWeight(perUnit)}</InfoField>
          <InfoField label="Gross weight">
            {q.transportQuantity > 1 ? `${q.transportQuantity} × ${formatWeight(perUnit)} = ` : ''}
            {formatWeight(q.weightKg)}
          </InfoField>
          <InfoField label="Volume">{q.volumeM3 != null ? `${q.volumeM3} m³` : ''}</InfoField>
          {(q.mode === 'air' || !!q.chargeableWeightKg) && (
            <InfoField label="Chargeable weight, kg">
              {q.chargeableWeightKg ? formatWeight(q.chargeableWeightKg) : '—'}
            </InfoField>
          )}
        </div>
      </SectionCard>

      {q.cargo.length > 0 && (
        <SectionCard title="Cargo" className="lg:col-span-3 [&>div:last-child]:p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">{t('Pieces')}</TableHead>
                <TableHead>{t('Package type')}</TableHead>
                <TableHead>{t('Nature of goods')}</TableHead>
                <TableHead>{t('Dimensions')}</TableHead>
                <TableHead className="text-right">{t('Weight')}</TableHead>
                <TableHead className="pr-5 text-right">{t('Volume')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.cargo.map((line, index) => (
                <TableRow key={index}>
                  <TableCell className="pl-5 tabular-nums">{line.pieces}</TableCell>
                  <TableCell>{line.packageType}</TableCell>
                  <TableCell>{line.natureOfGoods}</TableCell>
                  <TableCell className="text-muted-foreground">{line.dimensions}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatWeight(line.weightKg)}</TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">{line.volumeM3} m³</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell className="pl-5 tabular-nums">{cargo.pieces}</TableCell>
                <TableCell colSpan={3}>
                  {t('Total cargo')}
                  {weightsDiffer(cargo.weightKg, q.weightKg) && (
                    <span className="ml-2 text-xs font-normal text-warning-text">
                      {t('Differs from the transport weight ({kg})', { kg: formatWeight(q.weightKg) })}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatWeight(cargo.weightKg)}</TableCell>
                <TableCell className="pr-5 text-right tabular-nums">{cargo.volumeM3} m³</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </SectionCard>
      )}
    </div>
  )
}
