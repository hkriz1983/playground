import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const clientId = url.searchParams.get('clientId');

    const projects = await prisma.clientPoProject.findMany({
      where: clientId ? { clientId } : undefined,
      include: {
        client: true,
        _count: { select: { pos: true } }
      },
      orderBy: { name: 'asc' }
    });

    const result = projects.map(p => ({
      id: p.id,
      clientId: p.clientId,
      clientName: p.client?.name || '',
      name: p.name,
      code: p.code || '',
      poCount: p._count.pos
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientId, name, code } = body;

    if (!clientId || !name || !name.trim()) {
      return NextResponse.json({ error: 'Client ID and Project Name are required' }, { status: 400 });
    }

    const created = await prisma.clientPoProject.create({
      data: {
        clientId,
        name: name.trim(),
        code: code ? code.trim() : null
      },
      include: { client: true }
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, code } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Project ID and Name are required' }, { status: 400 });
    }

    const updated = await prisma.clientPoProject.update({
      where: { id },
      data: {
        name: name.trim(),
        code: code ? code.trim() : null
      },
      include: { client: true }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const poCount = await prisma.clientPoHeader.count({ where: { projectId: id } });
    if (poCount > 0) {
      return NextResponse.json({ error: `Cannot delete project — ${poCount} Purchase Order(s) are linked to this project.` }, { status: 400 });
    }

    await prisma.clientPoProject.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Project deleted' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete project' }, { status: 500 });
  }
}
