import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { formatPoGraph, includePoRelations } from '@/lib/clientPoEngine';

const prisma = new PrismaClient();

const MODEL_MAP: Record<string, string> = {
  advancePayments: 'clientPoAdvancePayment',
  productions: 'clientPoProduction',
  dispatches: 'clientPoDispatch',
  invoices: 'clientPoInvoice',
  customerPayments: 'clientPoCustomerPayment',
  installations: 'clientPoInstallation',
  installationInvoices: 'clientPoInstallInvoice'
};

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const poId = params.id;
    const body = await req.json();
    const { arrayName, entryId, ...fields } = body;

    const modelName = MODEL_MAP[arrayName];
    if (!modelName || !(prisma as any)[modelName]) {
      return NextResponse.json({ error: 'Invalid ledger array' }, { status: 400 });
    }

    const updateData: any = {};
    if (fields.date) updateData.date = new Date(fields.date);
    if (fields.dueDate) updateData.dueDate = new Date(fields.dueDate);
    if (fields.amount !== undefined) updateData.amount = Number(fields.amount) || 0;
    if (fields.value !== undefined) updateData.value = Number(fields.value) || 0;
    if (fields.qty !== undefined) updateData.qty = Number(fields.qty) || 0;
    if (fields.ref !== undefined) updateData.ref = fields.ref;
    if (fields.type !== undefined) updateData.type = fields.type;
    if (fields.note !== undefined) updateData.note = fields.note;

    await (prisma as any)[modelName].update({
      where: { id: entryId },
      data: updateData
    });

    await prisma.clientPoHistory.create({
      data: { poId, type: 'edit', text: `Edited a ${arrayName} entry.` }
    });

    const updatedPo = await prisma.clientPoHeader.findUnique({
      where: { id: poId },
      include: includePoRelations
    });

    return NextResponse.json(formatPoGraph(updatedPo));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const poId = params.id;
    const url = new URL(req.url);
    const arrayName = url.searchParams.get('arrayName');
    const entryId = url.searchParams.get('entryId');

    if (!arrayName || !entryId) {
      return NextResponse.json({ error: 'arrayName and entryId are required' }, { status: 400 });
    }

    const modelName = MODEL_MAP[arrayName];
    if (!modelName || !(prisma as any)[modelName]) {
      return NextResponse.json({ error: 'Invalid ledger array' }, { status: 400 });
    }

    await (prisma as any)[modelName].delete({ where: { id: entryId } });

    await prisma.clientPoHistory.create({
      data: { poId, type: 'edit', text: `Deleted a ${arrayName} entry.` }
    });

    const updatedPo = await prisma.clientPoHeader.findUnique({
      where: { id: poId },
      include: includePoRelations
    });

    return NextResponse.json(formatPoGraph(updatedPo));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete entry' }, { status: 500 });
  }
}
