import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { formatPoGraph, includePoRelations } from '@/lib/clientPoEngine';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const rawPos = await prisma.clientPoHeader.findMany({
      include: includePoRelations,
      orderBy: { createdAt: 'desc' }
    });
    const formatted = rawPos.map(formatPoGraph);
    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch POs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client: clientName, project: projectName, poNumber, poDate, deliveryDate, status, items, milestones, totalBasic, totalTax, totalOrderValue, termsRaw, creditDays, retentionMonths, notes } = body;

    if (!clientName || !poNumber) {
      return NextResponse.json({ error: 'Client name and PO Number are required' }, { status: 400 });
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

    const created = await prisma.clientPoHeader.create({
      data: {
        poNumber: poNumber.trim(),
        clientId: clientObj.id,
        projectId: projectObj?.id || null,
        poDate: poDate ? new Date(poDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        status: status || 'Active',
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
        },
        retentionState: {
          create: {
            started: false,
            amount: 0,
            periodMonths: Number(retentionMonths) || 12
          }
        },
        history: {
          create: {
            type: 'create',
            text: `Purchase Order ${poNumber} created.`
          }
        }
      },
      include: includePoRelations
    });

    return NextResponse.json(formatPoGraph(created));
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create PO' }, { status: 500 });
  }
}
