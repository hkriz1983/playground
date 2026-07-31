import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { name: email }
        ]
      }
    });

    // Force auto-heal admin user if logging in with fallback admin/admin
    if (email === 'admin' && password === 'admin') {
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: 'admin',
            email: 'admin',
            password: 'admin',
            role: 'ADMIN',
            designation: 'System Administrator',
            avatarColor: 'error',
          }
        });
      } else if (user.password !== 'admin' || !user.isActive) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            password: 'admin',
            isActive: true,
          }
        });
      }
    }

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const isHttps = req.headers.get('x-forwarded-proto') === 'https' || req.url.startsWith('https://');

    const response = NextResponse.json({ success: true, userId: user.id });
    response.cookies.set('playground_auth', user.id, {
      httpOnly: true,
      secure: isHttps,
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 1 week
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
