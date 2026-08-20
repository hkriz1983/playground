import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fmt, computeLifecycle, addDays, todayISO, formatPoGraph, includePoRelations } from '@/lib/clientPoEngine';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const { id: poId, stage } = params;
    const body = await req.json();

    const rawPo = await prisma.clientPoHeader.findUnique({
      where: { id: poId },
      include: includePoRelations
    });
    if (!rawPo) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    const poGraph = formatPoGraph(rawPo);
    const date = body.date || todayISO();

    if (stage === 'advance') {
      const amount = Number(body.amount) || 0;
      if (amount <= 0) return NextResponse.json({ error: 'Valid advance amount required' }, { status: 400 });

      await prisma.clientPoAdvancePayment.create({
        data: {
          poId,
          date: new Date(date),
          amount,
          ref: body.ref || '',
          note: body.note || ''
        }
      });
      await prisma.clientPoHistory.create({
        data: { poId, type: 'advance', text: `Advance received: ${fmt(amount)}${body.note ? ' — ' + body.note : ''}.` }
      });
    }
    else if (stage === 'production') {
      const { qty, value, note, allocations } = body;
      const prodValue = Number(value) || 0;
      const prodQty = Number(qty) || 0;

      await prisma.clientPoProduction.create({
        data: {
          poId,
          date: new Date(date),
          qty: prodQty,
          value: prodValue,
          note: note || '',
          allocations: Array.isArray(allocations) ? {
            create: allocations.map((a: any) => {
              const item = rawPo.items.find(it => it.itemIndex === a.itemIndex);
              return {
                itemId: item?.id || rawPo.items[0]?.id,
                qty: Number(a.qty) || 0
              };
            })
          } : undefined
        }
      });

      await prisma.clientPoHistory.create({
        data: { poId, type: 'prod', text: `Production release recorded: ${fmt(prodValue)}${prodQty ? ' for ' + prodQty + ' unit(s)' : ''}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'dispatch') {
      const { qty, value, note, allocations } = body;
      const dispValue = Number(value) || 0;
      const dispQty = Number(qty) || 0;

      await prisma.clientPoDispatch.create({
        data: {
          poId,
          date: new Date(date),
          qty: dispQty,
          value: dispValue,
          note: note || '',
          allocations: Array.isArray(allocations) ? {
            create: allocations.map((a: any) => {
              const item = rawPo.items.find(it => it.itemIndex === a.itemIndex);
              return {
                itemId: item?.id || rawPo.items[0]?.id,
                qty: Number(a.qty) || 0
              };
            })
          } : undefined
        }
      });

      await prisma.clientPoHistory.create({
        data: { poId, type: 'dispatch', text: `Material dispatched: ${fmt(dispValue)}${dispQty ? ' for ' + dispQty + ' unit(s)' : ''}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'invoice') {
      const { qty, value, note, dueDate, allocations } = body;
      const invValue = Number(value) || 0;
      const invQty = Number(qty) || 0;
      const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(addDays(date, rawPo.creditDays || 30)!);

      await prisma.clientPoInvoice.create({
        data: {
          poId,
          date: new Date(date),
          qty: invQty,
          value: invValue,
          dueDate: calculatedDueDate,
          note: note || '',
          allocations: Array.isArray(allocations) ? {
            create: allocations.map((a: any) => {
              const item = rawPo.items.find(it => it.itemIndex === a.itemIndex);
              return {
                itemId: item?.id || rawPo.items[0]?.id,
                qty: Number(a.qty) || 0
              };
            })
          } : undefined
        }
      });

      await prisma.clientPoHistory.create({
        data: { poId, type: 'invoice', text: `Dispatch invoice generated: ${fmt(invValue)}${invQty ? ' for ' + invQty + ' unit(s)' : ''}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'payment') {
      const { amount, type, ref, note } = body;
      const payAmt = Number(amount) || 0;
      if (payAmt <= 0) return NextResponse.json({ error: 'Valid payment amount required' }, { status: 400 });

      if (type === 'advance') {
        await prisma.clientPoAdvancePayment.create({
          data: { poId, date: new Date(date), amount: payAmt, ref: ref || '', note: note || '' }
        });
      } else {
        await prisma.clientPoCustomerPayment.create({
          data: { poId, date: new Date(date), amount: payAmt, type: type || 'dispatch', ref: ref || '', note: note || '' }
        });
      }

      await prisma.clientPoHistory.create({
        data: { poId, type: 'payment', text: `Payment received against ${type || 'dispatch'}: ${fmt(payAmt)}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'installation') {
      const { qty, note, allocations } = body;
      const instQty = Number(qty) || 0;

      await prisma.clientPoInstallation.create({
        data: {
          poId,
          date: new Date(date),
          qty: instQty,
          note: note || '',
          allocations: Array.isArray(allocations) ? {
            create: allocations.map((a: any) => {
              const item = rawPo.items.find(it => it.itemIndex === a.itemIndex);
              return {
                itemId: item?.id || rawPo.items[0]?.id,
                qty: Number(a.qty) || 0
              };
            })
          } : undefined
        }
      });

      await prisma.clientPoHistory.create({
        data: { poId, type: 'install', text: `Installation recorded: Qty ${instQty}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'install-invoice') {
      const { qty, value, note, dueDate, allocations } = body;
      const invValue = Number(value) || 0;
      const invQty = Number(qty) || 0;
      const calculatedDueDate = dueDate ? new Date(dueDate) : new Date(addDays(date, rawPo.creditDays || 30)!);

      await prisma.clientPoInstallInvoice.create({
        data: {
          poId,
          date: new Date(date),
          qty: invQty,
          value: invValue,
          dueDate: calculatedDueDate,
          note: note || '',
          allocations: Array.isArray(allocations) ? {
            create: allocations.map((a: any) => {
              const item = rawPo.items.find(it => it.itemIndex === a.itemIndex);
              return {
                itemId: item?.id || rawPo.items[0]?.id,
                qty: Number(a.qty) || 0
              };
            })
          } : undefined
        }
      });

      await prisma.clientPoHistory.create({
        data: { poId, type: 'install-invoice', text: `Installation invoice generated: ${fmt(invValue)}${invQty ? ' for ' + invQty + ' unit(s)' : ''}${note ? ' — ' + note : ''}.` }
      });
    }
    else if (stage === 'retention-release') {
      if (!rawPo.retentionState) {
        return NextResponse.json({ error: 'Retention has not started' }, { status: 400 });
      }
      await prisma.clientPoRetentionState.update({
        where: { poId },
        data: { released: true, releasedDate: new Date() }
      });
      await prisma.clientPoHistory.create({
        data: { poId, type: 'retention', text: `Retention Released: ${fmt(rawPo.retentionState.amount)}.` }
      });
    }
    else {
      return NextResponse.json({ error: 'Unknown lifecycle stage' }, { status: 400 });
    }

    const updatedRawPo = await prisma.clientPoHeader.findUnique({
      where: { id: poId },
      include: includePoRelations
    });
    const updatedGraph = formatPoGraph(updatedRawPo);
    const calc = computeLifecycle(updatedGraph);

    if (calc.completionConditionsMet && !updatedRawPo?.retentionState?.started) {
      const startDate = new Date();
      const releaseDate = new Date();
      releaseDate.setMonth(releaseDate.getMonth() + (updatedRawPo?.retentionMonths || 12));

      await prisma.clientPoRetentionState.upsert({
        where: { poId },
        update: {
          started: true,
          startDate,
          amount: calc.retentionTargetValue,
          releaseDate
        },
        create: {
          poId,
          started: true,
          startDate,
          amount: calc.retentionTargetValue,
          periodMonths: updatedRawPo?.retentionMonths || 12,
          releaseDate
        }
      });

      await prisma.clientPoHistory.create({
        data: {
          poId,
          type: 'retention',
          text: `Retention Started — ${fmt(calc.retentionTargetValue)} held, release due ${releaseDate.toISOString().slice(0, 10)}.`
        }
      });
    }

    const finalPo = await prisma.clientPoHeader.findUnique({
      where: { id: poId },
      include: includePoRelations
    });

    return NextResponse.json(formatPoGraph(finalPo));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to record lifecycle transaction' }, { status: 500 });
  }
}
