import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { poFinancials, formatPoGraph, includePoRelations } from '@/lib/clientPoEngine';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const clients = await prisma.clientPoClient.findMany({
      include: {
        projects: true,
        pos: { include: includePoRelations }
      },
      orderBy: { name: 'asc' }
    });

    const result = clients.map(client => {
      let poCount = client.pos.length;
      let totalOrder = 0;
      let totalReceived = 0;
      let totalReceivable = 0;

      client.pos.forEach(po => {
        const formatted = formatPoGraph(po);
        const f = poFinancials(formatted);
        totalOrder += f.total;
        totalReceived += f.received;
        totalReceivable += f.receivable;
      });

      return {
        id: client.id,
        name: client.name,
        legalName: client.legalName || '',
        gstin: client.gstin || '',
        creditDays: client.creditDays || 30,
        contactPerson: client.contactPerson || '',
        email: client.email || '',
        phone: client.phone || '',
        address: client.address || '',
        poCount,
        order: totalOrder,
        received: totalReceived,
        receivable: totalReceivable,
        projects: client.projects.map(p => ({ id: p.id, name: p.name }))
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, legalName, gstin, creditDays, contactPerson, email, phone, address } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const created = await prisma.clientPoClient.create({
      data: {
        name: name.trim(),
        legalName: legalName ? legalName.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        creditDays: Number(creditDays) || 30,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null
      }
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create client' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, legalName, gstin, creditDays, contactPerson, email, phone, address } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Client ID and name are required' }, { status: 400 });
    }

    const updated = await prisma.clientPoClient.update({
      where: { id },
      data: {
        name: name.trim(),
        legalName: legalName ? legalName.trim() : null,
        gstin: gstin ? gstin.trim() : null,
        creditDays: Number(creditDays) || 30,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    const poCount = await prisma.clientPoHeader.count({ where: { clientId: id } });
    if (poCount > 0) {
      return NextResponse.json({ error: `Cannot delete client — ${poCount} Purchase Order(s) are linked to this client. Use Client Merge to combine instead.` }, { status: 400 });
    }

    await prisma.clientPoClient.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Client deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete client' }, { status: 500 });
  }
}
