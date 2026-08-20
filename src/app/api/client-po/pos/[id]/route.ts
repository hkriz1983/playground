import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { formatPoGraph, includePoRelations } from '@/lib/clientPoEngine';

const prisma = new PrismaClient();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const po = await prisma.clientPoHeader.findUnique({
      where: { id },
      include: includePoRelations
    });
    if (!po) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }
    return NextResponse.json(formatPoGraph(po));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch PO' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { client: clientName, project: projectName, poNumber, poDate, deliveryDate, status, items, milestones, totalBasic, totalTax, totalOrderValue, termsRaw, creditDays, retentionMonths, notes } = body;

    const existing = await prisma.clientPoHeader.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Purchase Order not found' }, { status: 404 });
    }

    let clientObj = await prisma.clientPoClient.findUnique({ where: { name: clientName.trim() } });
    if (!clientObj) {
      clientObj = await prisma.clientPoClient.create({ data: { name: clientName.trim(), creditDays: Number(creditDays) || 30 } });
    }

    let projectObj = null;
    if (projectName && projectName.trim()) {
      projectObj = await prisma.clientPoProject.findFirst({
        where: { clientId: clientObj.id, name: projectName.trim() }
      });
      if (!projectObj) {
        projectObj = await prisma.clientPoProject.create({
          data: { clientId: clientObj.id, name: projectName.trim() }
        });
      }
    }

    await prisma.$transaction([
      prisma.clientPoItem.deleteMany({ where: { poId: id } }),
      prisma.clientPoMilestone.deleteMany({ where: { poId: id } }),
      prisma.clientPoHeader.update({
        where: { id },
        data: {
          poNumber: poNumber.trim(),
          clientId: clientObj.id,
          projectId: projectObj?.id || null,
          poDate: poDate ? new Date(poDate) : existing.poDate,
          deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
          status: status || existing.status,
          totalBasic: Number(totalBasic) || 0,
          totalTax: Number(totalTax) || 0,
          totalOrderValue: Number(totalOrderValue) || 0,
          termsRaw: termsRaw || '',
          creditDays: Number(creditDays) || 30,
          retentionMonths: Number(retentionMonths) || 12,
          notes: notes || '',
          items: {
            create: (items || []).map((it: any, idx: number) => ({
              itemIndex: idx,
              desc: it.desc || `Item ${idx + 1}`,
              uom: it.uom || 'NUM',
              qty: Number(it.qty) || 0,
              unitPrice: Number(it.unitPrice) || 0,
              value: (Number(it.qty) || 0) * (Number(it.unitPrice) || 0)
            }))
          },
          milestones: {
            create: (milestones || []).map((m: any) => ({
              label: m.label || '',
              mode: m.mode || 'percent',
              value: Number(m.value) || 0,
              basis: m.basis || ''
            }))
          }
        }
      }),
      prisma.clientPoHistory.create({
        data: {
          poId: id,
          type: 'edit',
          text: `Purchase Order ${poNumber} details updated.`
        }
      })
    ]);

    const updated = await prisma.clientPoHeader.findUnique({
      where: { id },
      include: includePoRelations
    });

    return NextResponse.json(formatPoGraph(updated));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update PO' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    await prisma.clientPoHeader.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Purchase Order deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete PO' }, { status: 500 });
  }
}
