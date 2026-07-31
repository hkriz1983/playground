import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: {
        appAccess: {
          include: {
            app: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform into frontend format
    const transformed = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuCYAeW_UdyODdhmluH-K-kNo3oMENoI9zm3pPhUxJPC4R24gSpRGhCep1sr8gyrMaSXDS6tWCjmaQ6_gZrlw-Y6KtUagoAR7lPzR8m00HRaGqtxW91aC7FvLbSi9MIW8f5kOS914FIfaxZlux7OUpOSj2hnZu6pPcv7oPE3XdzcNeRq8EeGKpdPOuxl3u3D4IrmTvCtHkcsJ4pJddr6sMrH5cPCtHbxrruJvUsLg7Yn8Kh1hn5VFq5riJhqm-ULXVNQbysZYQ5Z8IVt",
      avatarColor: u.avatarColor,
      isActive: u.isActive,
      role: u.role,
      designation: u.designation,
      apps: u.appAccess.map(a => a.app.name)
    }));

    return NextResponse.json(transformed);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, role, designation, avatarColor, appIds } = body;
    
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password,
        role: role || 'USER',
        designation: designation || null,
        avatarColor: avatarColor || 'primary',
        ...(appIds && appIds.length > 0 ? {
          appAccess: {
            create: appIds.map((id: string) => ({ appId: id }))
          }
        } : {})
      }
    });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
