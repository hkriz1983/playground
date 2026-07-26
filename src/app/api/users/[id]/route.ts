import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();
    const { appIds, ...restData } = body;
    
    // First update the basic user data
    const user = await prisma.user.update({
      where: { id },
      data: restData
    });
    
    // Then handle app access if appIds is provided
    if (appIds !== undefined) {
      await prisma.userAppAccess.deleteMany({
        where: { userId: id }
      });
      
      if (appIds.length > 0) {
        await prisma.userAppAccess.createMany({
          data: appIds.map((appId: string) => ({
            userId: id,
            appId
          }))
        });
      }
    }
    
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    
    await prisma.user.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
