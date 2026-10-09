import { InfoField } from '@/components/info-field'
import { SectionCard } from '@/components/section-card'
import { TransportModeLabel } from '@/components/transport-mode'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatWeight } from '@/lib/format'
import { movementLabels } from '@/types/logistics'
import type { Quotation } from '@/types/quotation'

// Вкладка General: поля со слайда 3 презентации, сгруппированы по смыслу
export function QuotationGeneralTab({ quotation: q }: { quotation: Quotation }) {
  const totalPieces = q.cargo.reduce((sum, line) => sum + line.pieces, 0)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
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
          <InfoField label="Port of departure">{q.portOfDeparture}</InfoField>
          <InfoField label="Port of delivery">{q.portOfDelivery}</InfoField>
          <InfoField label="Incoterms">{q.incoterm}</InfoField>
          <InfoField label="Movement">{movementLabels[q.movement]}</InfoField>
        </div>
      </SectionCard>

      <SectionCard title="Transport">
        <div className="grid grid-cols-2 gap-4">
          <InfoField label="Mode">
            <TransportModeLabel mode={q.mode} />
          </InfoField>
          <InfoField label="Type">{q.equipment}</InfoField>
          <InfoField label="Number">{q.transportQuantity}</InfoField>
          <InfoField label="Nature of goods">{q.natureOfGoods}</InfoField>
          <InfoField label="Gross weight">{formatWeight(q.weightKg)}</InfoField>
          <InfoField label="Volume">{q.volumeM3} m³</InfoField>
          <InfoField label="Chargeable weight (CWT)">
            {q.chargeableWeightKg ? formatWeight(q.chargeableWeightKg) : '—'}
          </InfoField>
        </div>
      </SectionCard>

      <SectionCard title="Cargo" className="lg:col-span-3 [&>div:last-child]:p-0">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Pieces</TableHead>
              <TableHead>Package type</TableHead>
              <TableHead>Nature of goods</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead className="text-right">Weight</TableHead>
              <TableHead className="pr-5 text-right">Volume</TableHead>
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
              <TableCell className="pl-5 tabular-nums">{totalPieces}</TableCell>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right tabular-nums">{formatWeight(q.weightKg)}</TableCell>
              <TableCell className="pr-5 text-right tabular-nums">{q.volumeM3} m³</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </SectionCard>
    </div>
  )
}
