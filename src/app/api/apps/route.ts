import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const apps = await prisma.app.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(apps);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch apps' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, icon, color, appLink, github } = body;
    
    const app = await prisma.app.create({
      data: {
        name,
        description,
        icon,
        color: color || 'primary',
        appLink,
        github
      }
    });
    return NextResponse.json(app);
  } catch {
    return NextResponse.json({ error: 'Failed to create app' }, { status: 500 });
  }
}
