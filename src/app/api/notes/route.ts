import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter'); // 'all', 'reminders', 'completed'

    const whereClause: Record<string, unknown> = { userId };

    if (filter === 'reminders') {
      whereClause.reminderAt = { not: null };
      whereClause.isCompleted = false;
    } else if (filter === 'completed') {
      whereClause.isCompleted = true;
    }

    const notes = await prisma.note.findMany({
      where: whereClause,
      include: {
        taskHeader: true,
      },
      orderBy: filter === 'reminders' ? { reminderAt: 'asc' } : { createdAt: 'desc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const body = await req.json();
    const { title, content, category, taskHeaderId, reminderAt } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const note = await prisma.note.create({
      data: {
        userId,
        title,
        content,
        category: category || 'General',
        taskHeaderId: taskHeaderId || null,
        reminderAt: reminderAt ? new Date(reminderAt) : null,
      },
      include: {
        taskHeader: true,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}
