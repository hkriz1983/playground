import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    const body = await req.json();
    
    // Verify ownership
    const existing = await prisma.note.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { title, content, category, reminderAt, isCompleted } = body;

    const note = await prisma.note.update({
      where: { id: params.id },
      data: {
        title: title !== undefined ? title : existing.title,
        content: content !== undefined ? content : existing.content,
        category: category !== undefined ? category : existing.category,
        reminderAt: reminderAt !== undefined ? (reminderAt ? new Date(reminderAt) : null) : existing.reminderAt,
        isCompleted: isCompleted !== undefined ? isCompleted : existing.isCompleted,
      },
    });

    return NextResponse.json(note);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = getUserId(req);
    
    // Verify ownership
    const existing = await prisma.note.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    await prisma.note.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
