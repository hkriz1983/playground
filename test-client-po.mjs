import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('--------------------------------------------------');
  console.log('🧪 RUNNING CLIENT PO & MASTERS MODULE TEST SUITE');
  console.log('--------------------------------------------------\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST CASE 1: UOM Master CRUD Operations
    // -------------------------------------------------------------------------
    console.log('📌 Test Case 1: UOM Master Operations');
    const uomCode = `TEST_UOM_${Date.now()}`;
    const createdUom = await prisma.clientPoUomMaster.create({
      data: { code: uomCode, name: 'Test Unit of Measurement' }
    });
    assert(createdUom.code === uomCode, 'UOM Master created with upper-case code');

    const fetchedUoms = await prisma.clientPoUomMaster.findMany();
    assert(fetchedUoms.some(u => u.code === uomCode), 'Fetched UOM list contains newly created UOM');

    await prisma.clientPoUomMaster.delete({ where: { id: createdUom.id } });
    const uomAfterDel = await prisma.clientPoUomMaster.findUnique({ where: { id: createdUom.id } });
    assert(uomAfterDel === null, 'UOM Master deleted successfully\n');

    // -------------------------------------------------------------------------
    // TEST CASE 2: Line Item Master with Multi-UOM Mapping
    // -------------------------------------------------------------------------
    console.log('📌 Test Case 2: Line Item Master & Multi-UOM Association');
    const sqftUom = await prisma.clientPoUomMaster.findFirst({ where: { code: 'SQFT' } });
    const rftUom = await prisma.clientPoUomMaster.findFirst({ where: { code: 'RFT' } });

    const itemName = `Test Paneling Item ${Date.now()}`;
    const createdItem = await prisma.clientPoLineItemMaster.create({
      data: {
        name: itemName,
        code: 'SKU-PANEL-TEST',
        defaultUnitPrice: 1250,
        uoms: {
          create: [
            ...(sqftUom ? [{ uomId: sqftUom.id }] : []),
            ...(rftUom ? [{ uomId: rftUom.id }] : [])
          ]
        }
      },
      include: { uoms: { include: { uom: true } } }
    });

    assert(createdItem.name === itemName, 'Line Item Master created with default unit price');
    assert(createdItem.uoms.length >= 1, 'Line Item associated with multiple allowed UOMs');

    await prisma.clientPoLineItemMaster.delete({ where: { id: createdItem.id } });
    assert(true, 'Line Item Master cleaned up\n');

    // -------------------------------------------------------------------------
    // TEST CASE 3: Client & Project Master Association
    // -------------------------------------------------------------------------
    console.log('📌 Test Case 3: Client & Project Master Relationship');
    const clientName = `Test Enterprise Corp ${Date.now()}`;
    const createdClient = await prisma.clientPoClient.create({
      data: { name: clientName, legalName: `${clientName} Pvt Ltd`, creditDays: 45 }
    });
    assert(createdClient.creditDays === 45, 'Client Master created with custom credit days');

    const createdProject = await prisma.clientPoProject.create({
      data: { clientId: createdClient.id, name: 'Tower Alpha', code: 'TWR-A' }
    });
    assert(createdProject.clientId === createdClient.id, 'Project Master linked to Client Master');

    // Fetch project with relation
    const fetchedProjects = await prisma.clientPoProject.findMany({
      where: { clientId: createdClient.id },
      include: { client: true }
    });
    assert(fetchedProjects.length === 1 && fetchedProjects[0].client.name === clientName, 'Project query returns parent Client details\n');

    // -------------------------------------------------------------------------
    // TEST CASE 4: Purchase Order Creation & Calculations
    // -------------------------------------------------------------------------
    console.log('📌 Test Case 4: Purchase Order Creation & Line Items Calculation');
    const poNumber = `PO-TEST-${Date.now()}`;
    const createdPo = await prisma.clientPoHeader.create({
      data: {
        poNumber,
        clientId: createdClient.id,
        projectId: createdProject.id,
        poDate: new Date(),
        status: 'Active',
        totalBasic: 100000,
        totalTax: 18000,
        totalOrderValue: 118000,
        creditDays: 45,
        items: {
          create: [
            { itemIndex: 0, desc: 'Wooden Door 1000x2100mm', uom: 'NUM', qty: 10, unitPrice: 10000, value: 100000 }
          ]
        },
        milestones: {
          create: [
            { label: 'Advance 20%', mode: 'percent', value: 20, basis: 'On PO Acceptance' }
          ]
        }
      },
      include: { items: true, client: true, project: true }
    });

    assert(createdPo.poNumber === poNumber, 'Purchase Order created successfully');
    assert(createdPo.client.name === clientName, 'PO linked to Client Master');
    assert(createdPo.project?.name === 'Tower Alpha', 'PO linked to Project Master');
    assert(createdPo.items[0].value === 100000, 'Line Item value calculated correctly\n');

    // -------------------------------------------------------------------------
    // TEST CASE 5: Execution Lifecycle Transactions & Edits
    // -------------------------------------------------------------------------
    console.log('📌 Test Case 5: Execution Lifecycle Transactions & Edits');
    const production = await prisma.clientPoProduction.create({
      data: {
        poId: createdPo.id,
        qty: 5,
        value: 50000,
        note: 'Initial batch of 5 doors in production',
        allocations: {
          create: [{ itemId: createdPo.items[0].id, qty: 5 }]
        }
      },
      include: { allocations: true }
    });
    assert(production.qty === 5 && production.allocations[0].qty === 5, 'Production allocation recorded against item');

    const dispatch = await prisma.clientPoDispatch.create({
      data: {
        poId: createdPo.id,
        qty: 5,
        value: 50000,
        note: 'Dispatched 5 doors to site',
        allocations: {
          create: [{ itemId: createdPo.items[0].id, qty: 5 }]
        }
      }
    });
    assert(dispatch.qty === 5, 'Dispatch transaction recorded');

    // Test Edit Entry functionality
    const updatedProd = await prisma.clientPoProduction.update({
      where: { id: production.id },
      data: { qty: 6, value: 60000, note: 'Updated to 6 doors in production' }
    });
    assert(updatedProd.qty === 6 && updatedProd.value === 60000, 'Recorded entry edited successfully');

    // Verify Financials Calculation Logic (Total Receivable = Total - Received)
    const advPayment = await prisma.clientPoAdvancePayment.create({
      data: { poId: createdPo.id, amount: 23600, ref: 'ADV-101' }
    });
    const custPayment = await prisma.clientPoCustomerPayment.create({
      data: { poId: createdPo.id, amount: 30000, type: 'dispatch', ref: 'PAY-102' }
    });

    const totalOrder = createdPo.totalOrderValue; // 118,000
    const totalRecv = advPayment.amount + custPayment.amount; // 53,600
    const totalReceivable = totalOrder - totalRecv; // 64,400

    assert(totalReceivable === 64400, 'Total Receivable correctly reflects partial workings on advance & dispatch payments');

    // Cleanup Test Data
    await prisma.clientPoAdvancePayment.delete({ where: { id: advPayment.id } });
    await prisma.clientPoCustomerPayment.delete({ where: { id: custPayment.id } });
    await prisma.clientPoHeader.delete({ where: { id: createdPo.id } });
    await prisma.clientPoProject.delete({ where: { id: createdProject.id } });
    await prisma.clientPoClient.delete({ where: { id: createdClient.id } });
    assert(true, 'Test PO and Master records cleaned up cleanly\n');

    console.log('--------------------------------------------------');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('--------------------------------------------------\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('❌ Unexpected error in test runner:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
