import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { seedClientPoData } from '@/lib/seedClientPo';

const prisma = new PrismaClient();

export async function POST() {
  try {
    await seedClientPoData(prisma);
    return NextResponse.json({ success: true, message: 'Seeded default Client PO data.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to seed data' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.$transaction([
      prisma.clientPoHistory.deleteMany(),
      prisma.clientPoRetentionState.deleteMany(),
      prisma.clientPoInstallInvoiceAllocation.deleteMany(),
      prisma.clientPoInstallInvoice.deleteMany(),
      prisma.clientPoInstallationAllocation.deleteMany(),
      prisma.clientPoInstallation.deleteMany(),
      prisma.clientPoCustomerPayment.deleteMany(),
      prisma.clientPoInvoiceAllocation.deleteMany(),
      prisma.clientPoInvoice.deleteMany(),
      prisma.clientPoDispatchAllocation.deleteMany(),
      prisma.clientPoDispatch.deleteMany(),
      prisma.clientPoProductionAllocation.deleteMany(),
      prisma.clientPoProduction.deleteMany(),
      prisma.clientPoAdvancePayment.deleteMany(),
      prisma.clientPoMilestone.deleteMany(),
      prisma.clientPoItem.deleteMany(),
      prisma.clientPoHeader.deleteMany(),
      prisma.clientPoProject.deleteMany(),
      prisma.clientPoClient.deleteMany()
    ]);
    return NextResponse.json({ success: true, message: 'All PO module data flushed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to flush PO data' }, { status: 500 });
  }
}
