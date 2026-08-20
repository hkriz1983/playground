import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const uoms = await prisma.clientPoUomMaster.findMany({
      orderBy: { code: 'asc' }
    });
    return NextResponse.json(uoms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch UOMs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name } = body;

    if (!code || !code.trim() || !name || !name.trim()) {
      return NextResponse.json({ error: 'UOM Code and Name are required' }, { status: 400 });
    }

    const created = await prisma.clientPoUomMaster.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim()
      }
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create UOM' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, code, name } = body;

    if (!id || !code || !code.trim() || !name || !name.trim()) {
      return NextResponse.json({ error: 'UOM ID, Code, and Name are required' }, { status: 400 });
    }

    const updated = await prisma.clientPoUomMaster.update({
      where: { id },
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim()
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update UOM' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'UOM ID is required' }, { status: 400 });
    }

    await prisma.clientPoUomMaster.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'UOM deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete UOM' }, { status: 500 });
  }
}
