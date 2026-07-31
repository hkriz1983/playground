import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { ensureDefaultApps } from '@/lib/ensureDefaultApps';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get('playground_auth')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Auto-seed default apps & user access if missing
    await ensureDefaultApps(prisma, userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        appAccess: {
          include: {
            app: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role === 'ADMIN') {
      const allApps = await prisma.app.findMany({ orderBy: { createdAt: 'desc' } });
      return NextResponse.json(allApps);
    }

    const myApps = user.appAccess.map(access => access.app);
    return NextResponse.json(myApps);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
