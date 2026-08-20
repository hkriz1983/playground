import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const items = await prisma.clientPoLineItemMaster.findMany({
      include: {
        uoms: {
          include: { uom: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const result = items.map(item => ({
      id: item.id,
      name: item.name,
      code: item.code || '',
      defaultUnitPrice: item.defaultUnitPrice || 0,
      uoms: item.uoms.map(iu => ({
        id: iu.uom.id,
        code: iu.uom.code,
        name: iu.uom.name
      }))
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch Line Item Masters' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, defaultUnitPrice, uomIds } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Item Name is required' }, { status: 400 });
    }

    const created = await prisma.clientPoLineItemMaster.create({
      data: {
        name: name.trim(),
        code: code ? code.trim() : null,
        defaultUnitPrice: Number(defaultUnitPrice) || 0,
        uoms: Array.isArray(uomIds) && uomIds.length > 0 ? {
          create: uomIds.map((uomId: string) => ({ uomId }))
        } : undefined
      },
      include: {
        uoms: { include: { uom: true } }
      }
    });

    return NextResponse.json({
      id: created.id,
      name: created.name,
      code: created.code || '',
      defaultUnitPrice: created.defaultUnitPrice || 0,
      uoms: created.uoms.map(iu => ({
        id: iu.uom.id,
        code: iu.uom.code,
        name: iu.uom.name
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create Line Item Master' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, code, defaultUnitPrice, uomIds } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Item ID and Name are required' }, { status: 400 });
    }

    // Delete existing uom relations for this item
    await prisma.clientPoLineItemUom.deleteMany({ where: { itemId: id } });

    const updated = await prisma.clientPoLineItemMaster.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim() : null,
        defaultUnitPrice: Number(defaultUnitPrice) || 0,
        uoms: Array.isArray(uomIds) && uomIds.length > 0 ? {
          create: uomIds.map((uomId: string) => ({ uomId }))
        } : undefined
      },
      include: {
        uoms: { include: { uom: true } }
      }
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      code: updated.code || '',
      defaultUnitPrice: updated.defaultUnitPrice || 0,
      uoms: updated.uoms.map(iu => ({
        id: iu.uom.id,
        code: iu.uom.code,
        name: iu.uom.name
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update Line Item Master' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Line Item Master ID is required' }, { status: 400 });
    }

    await prisma.clientPoLineItemMaster.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Line Item Master deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete Line Item Master' }, { status: 500 });
  }
}
