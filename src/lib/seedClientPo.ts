import { PrismaClient } from '@prisma/client';

export async function seedClientPoData(prisma: PrismaClient) {
  const count = await prisma.clientPoHeader.count();
  if (count > 0) return; // Already seeded

  const samplePOs = [
    {
      poNumber: '742200206',
      client: 'Auro Realty Private Limited',
      project: 'Kohinoor — Tower B3',
      poDate: new Date('2022-12-29'),
      deliveryDate: new Date('2023-01-31'),
      status: 'Active',
      totalBasic: 26217084,
      totalTax: 4719074,
      totalOrderValue: 30936158,
      termsRaw: '20% advance / 60% post-delivery / 15% post-installation / 5% retention (12mo)',
      creditDays: 30,
      retentionMonths: 12,
      notes: 'Seeded from original PDF (LOA ref ARPL/KOHINOOR/LOA/2022-23/099).',
      items: [
        { itemIndex: 0, desc: 'D-Main Door 1200x2400mm', uom: 'EA', qty: 26, unitPrice: 41345, value: 1074970 },
        { itemIndex: 1, desc: 'D-Main Door 1200x2400mm', uom: 'EA', qty: 164, unitPrice: 39999, value: 6559836 },
        { itemIndex: 2, desc: 'DW2-Main Door 1200x2400+600x1950mm', uom: 'EA', qty: 6, unitPrice: 55880, value: 335280 },
        { itemIndex: 3, desc: 'DW2-Main Door 1200x2400+600x1950mm', uom: 'EA', qty: 31, unitPrice: 52810, value: 1637110 },
        { itemIndex: 4, desc: 'D1-Bed Room Door 1000x2100mm', uom: 'EA', qty: 683, unitPrice: 12326, value: 8418658 },
        { itemIndex: 5, desc: 'D2-Toilet Door 800x2100mm', uom: 'EA', qty: 685, unitPrice: 11958, value: 8191230 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    },
    {
      poNumber: '742200207',
      client: 'Auro Realty Private Limited',
      project: 'Kohinoor — Tower B5',
      poDate: new Date('2022-12-29'),
      deliveryDate: new Date('2023-01-31'),
      status: 'Active',
      totalBasic: 39597539,
      totalTax: 7127560,
      totalOrderValue: 46725099,
      termsRaw: '20% advance / 60% post-delivery / 15% post-installation / 5% retention (12mo)',
      creditDays: 30,
      retentionMonths: 12,
      notes: 'Seeded from original PDF (LOA ref ARPL/KOHINOOR/LOA/2022-23/079C).',
      items: [
        { itemIndex: 0, desc: 'D-Main Door 1200x2400mm', uom: 'EA', qty: 32, unitPrice: 41345, value: 1323040 },
        { itemIndex: 1, desc: 'D-Main Door 1200x2400mm', uom: 'EA', qty: 201, unitPrice: 39999, value: 8039799 },
        { itemIndex: 2, desc: 'D1-Bed Room Door 1000x2100mm', uom: 'EA', qty: 932, unitPrice: 12326, value: 11487832 },
        { itemIndex: 3, desc: 'D1-Kitchen Door 1000x2100mm', uom: 'EA', qty: 115, unitPrice: 12326, value: 1417490 },
        { itemIndex: 4, desc: 'D2-Toilet Door 800x2100mm', uom: 'EA', qty: 968, unitPrice: 11958, value: 11575344 },
        { itemIndex: 5, desc: 'D2-Servant Room Entry Door 800x2100mm', uom: 'EA', qty: 118, unitPrice: 11958, value: 1411044 },
        { itemIndex: 6, desc: 'D2-Servant Room Toilet Door 800x2100mm', uom: 'EA', qty: 118, unitPrice: 11958, value: 1411044 },
        { itemIndex: 7, desc: 'D3-Servant Room→Utility Door 750x2400mm', uom: 'EA', qty: 118, unitPrice: 12680, value: 1496240 },
        { itemIndex: 8, desc: 'D6-Kitchen Door 900x2100mm', uom: 'EA', qty: 118, unitPrice: 12167, value: 1435706 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    },
    {
      poNumber: '6000007274',
      client: 'Auro Realty Private Limited',
      project: 'Kohinoor Phase 02',
      poDate: new Date('2024-03-05'),
      deliveryDate: new Date('2024-04-15'),
      status: 'Active',
      totalBasic: 27014461,
      totalTax: 4862602.98,
      totalOrderValue: 31877063.98,
      termsRaw: '20% advance / 60% post-delivery (3-4 wks) / balance after installation / 5% retention (12mo)',
      creditDays: 30,
      retentionMonths: 12,
      notes: '',
      items: [
        { itemIndex: 0, desc: 'D-Main Door (GF–5th Floor) 1200x2400mm', uom: 'NUM', qty: 32, unitPrice: 41345, value: 1323040 },
        { itemIndex: 1, desc: 'D-Main Door (6th Floor & above) 1200x2400mm', uom: 'NUM', qty: 207, unitPrice: 39999, value: 8279793 },
        { itemIndex: 2, desc: 'D1-Bed Room Door 1000x2100mm', uom: 'NUM', qty: 717, unitPrice: 12326, value: 8837742 },
        { itemIndex: 3, desc: 'D2-Toilet Door 800x2100mm', uom: 'NUM', qty: 717, unitPrice: 11958, value: 8573886 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    },
    {
      poNumber: '6000018660',
      client: 'Auro Realty Private Limited',
      project: 'Kohinoor Phase 03',
      poDate: new Date('2025-07-14'),
      deliveryDate: new Date('2025-07-30'),
      status: 'Active',
      totalBasic: 26597261,
      totalTax: 4787506.98,
      totalOrderValue: 31384767.98,
      termsRaw: 'Payable immediately, due net',
      creditDays: 30,
      retentionMonths: 12,
      notes: '',
      items: [
        { itemIndex: 0, desc: 'Door, Wooden, 1200x2400mm — D-Main', uom: 'NUM', qty: 20, unitPrice: 41345, value: 826900 },
        { itemIndex: 1, desc: 'Door, Wooden, 1200x2400mm — D-Main', uom: 'NUM', qty: 141, unitPrice: 39999, value: 5639859 },
        { itemIndex: 2, desc: 'Door, Wooden, 1000x2100mm — D1-Bed Room', uom: 'NUM', qty: 684, unitPrice: 12326, value: 8430984 },
        { itemIndex: 3, desc: 'Door, Wooden, 800x2100mm — D2-Toilet Room', uom: 'NUM', qty: 808, unitPrice: 11958, value: 9662064 },
        { itemIndex: 4, desc: 'Door, Wooden, 750x2400mm — D3-Servant Room', uom: 'NUM', qty: 82, unitPrice: 12680, value: 1039760 },
        { itemIndex: 5, desc: 'Door, Wooden, 900x2100mm — D6-Kitchen', uom: 'NUM', qty: 82, unitPrice: 12167, value: 997694 }
      ],
      milestones: [
        { label: 'Full payment — payable immediately, due net', mode: 'percent', value: 100, basis: 'On invoice' }
      ]
    },
    {
      poNumber: '6000015993',
      client: 'Aurobindo Tattva Township Developers LLP',
      project: 'ATTDL Sansa County Phase 01',
      poDate: new Date('2025-03-06'),
      deliveryDate: new Date('2025-03-31'),
      status: 'Active',
      totalBasic: 44599314,
      totalTax: 8027876.52,
      totalOrderValue: 52627190.52,
      termsRaw: '20% advance / 60% post-delivery / balance after installation / 5% retention (12mo)',
      creditDays: 30,
      retentionMonths: 12,
      notes: '',
      items: [
        { itemIndex: 0, desc: 'Door, Wooden, 750x2100mm', uom: 'NUM', qty: 381, unitPrice: 9506, value: 3621786 },
        { itemIndex: 1, desc: 'Door, Wooden, 800x2100mm, with threshold', uom: 'NUM', qty: 381, unitPrice: 9856, value: 3755136 },
        { itemIndex: 2, desc: 'Door, Wooden, 1000x2400mm', uom: 'NUM', qty: 381, unitPrice: 20952, value: 7982712 },
        { itemIndex: 3, desc: 'Door, Wooden, 800x2100mm — D2', uom: 'NUM', qty: 1330, unitPrice: 9506, value: 12642980 },
        { itemIndex: 4, desc: 'Door, Wooden, 900x2100mm — D1', uom: 'NUM', qty: 1711, unitPrice: 9700, value: 16596700 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    },
    {
      poNumber: '6000020744',
      client: 'Auro Realty Private Limited',
      project: 'Pearl Phase 01',
      poDate: new Date('2025-09-25'),
      deliveryDate: new Date('2025-10-30'),
      status: 'Active',
      totalBasic: 34859160,
      totalTax: 6274648.80,
      totalOrderValue: 41133808.80,
      termsRaw: 'As per Annexure',
      creditDays: 30,
      retentionMonths: 12,
      notes: 'ASSUMPTION: no explicit split printed on this PO — mirrored the standard 20/60/15/5 terms used on sibling Pearl/Kohinoor POs.',
      items: [
        { itemIndex: 0, desc: 'Door, Wooden, 1000x2400+125x45mm — Bedroom/Dress', uom: 'NUM', qty: 464, unitPrice: 26960, value: 12509440 },
        { itemIndex: 1, desc: 'Door, Wooden, 1000x2400+90x45mm — Bedroom/Landscape', uom: 'NUM', qty: 232, unitPrice: 25185, value: 5842920 },
        { itemIndex: 2, desc: 'Door, Wooden, 850x2400mm — Toilet', uom: 'NUM', qty: 580, unitPrice: 23620, value: 13699600 },
        { itemIndex: 3, desc: 'Door, Wooden, 800x2100mm — Servant', uom: 'NUM', qty: 116, unitPrice: 12100, value: 1403600 },
        { itemIndex: 4, desc: 'Door, Wooden, 800x2100mm — Servant Toilet', uom: 'NUM', qty: 116, unitPrice: 12100, value: 1403600 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    },
    {
      poNumber: '6000025888',
      client: 'Auro Realty Private Limited',
      project: 'Pearl Phase 01',
      poDate: new Date('2026-05-11'),
      deliveryDate: new Date('2026-05-27'),
      status: 'Active',
      totalBasic: 10145650,
      totalTax: 1826217,
      totalOrderValue: 11971867,
      termsRaw: 'As per Annexure',
      creditDays: 30,
      retentionMonths: 12,
      notes: 'ASSUMPTION: no explicit split printed on this PO — mirrored standard terms.',
      items: [
        { itemIndex: 0, desc: 'Door, Wooden, 1800x2400mm, Double Leaf', uom: 'NUM', qty: 58, unitPrice: 55825, value: 3237850 },
        { itemIndex: 1, desc: 'Door, Wooden, 1800x2400mm, Double Leaf', uom: 'NUM', qty: 58, unitPrice: 57900, value: 3358200 },
        { itemIndex: 2, desc: 'Door, Wooden, 1000x2400mm, Single Leaf', uom: 'NUM', qty: 116, unitPrice: 30600, value: 3549600 }
      ],
      milestones: [
        { label: 'Advance against ABG/PDC', mode: 'percent', value: 20, basis: 'On PO acceptance' },
        { label: 'Post-delivery (3–4 weeks from invoice)', mode: 'percent', value: 60, basis: 'On delivery' },
        { label: 'After installation & certification', mode: 'percent', value: 15, basis: 'On installation bill certification' },
        { label: 'Retention', mode: 'percent', value: 5, basis: '12 months after completion' }
      ]
    }
  ];

  for (const po of samplePOs) {
    let clientObj = await prisma.clientPoClient.findUnique({ where: { name: po.client } });
    if (!clientObj) {
      clientObj = await prisma.clientPoClient.create({
        data: { name: po.client, creditDays: po.creditDays }
      });
    }

    let projectObj = await prisma.clientPoProject.findFirst({
      where: { clientId: clientObj.id, name: po.project }
    });
    if (!projectObj && po.project) {
      projectObj = await prisma.clientPoProject.create({
        data: { clientId: clientObj.id, name: po.project }
      });
    }

    const createdPo = await prisma.clientPoHeader.create({
      data: {
        poNumber: po.poNumber,
        clientId: clientObj.id,
        projectId: projectObj?.id || null,
        poDate: po.poDate,
        deliveryDate: po.deliveryDate,
        status: po.status,
        totalBasic: po.totalBasic,
        totalTax: po.totalTax,
        totalOrderValue: po.totalOrderValue,
        termsRaw: po.termsRaw,
        creditDays: po.creditDays,
        retentionMonths: po.retentionMonths,
        notes: po.notes,
        items: {
          create: po.items.map(it => ({
            itemIndex: it.itemIndex,
            desc: it.desc,
            uom: it.uom,
            qty: it.qty,
            unitPrice: it.unitPrice,
            value: it.value
          }))
        },
        milestones: {
          create: po.milestones.map(m => ({
            label: m.label,
            mode: m.mode,
            value: m.value,
            basis: m.basis
          }))
        },
        retentionState: {
          create: {
            started: false,
            amount: 0,
            periodMonths: po.retentionMonths
          }
        }
      }
    });

    await prisma.clientPoHistory.create({
      data: {
        poId: createdPo.id,
        type: 'create',
        text: `Purchase Order ${po.poNumber} created.`
      }
    });
  }

  // Seed UOM Masters if empty
  const uomCount = await prisma.clientPoUomMaster.count();
  if (uomCount === 0) {
    const defaultUoms = [
      { code: 'NUM', name: 'Numbers / Count' },
      { code: 'EA', name: 'Each' },
      { code: 'SQFT', name: 'Square Feet' },
      { code: 'RFT', name: 'Running Feet' },
      { code: 'NOS', name: 'Numbers' },
      { code: 'KG', name: 'Kilograms' },
      { code: 'MT', name: 'Metric Tonne' },
      { code: 'SET', name: 'Set' },
      { code: 'DAY', name: 'Day' },
      { code: 'HR', name: 'Hour' }
    ];

    for (const u of defaultUoms) {
      await prisma.clientPoUomMaster.create({ data: u });
    }
  }

  // Seed Line Item Masters if empty
  const itemMasterCount = await prisma.clientPoLineItemMaster.count();
  if (itemMasterCount === 0) {
    const allUoms = await prisma.clientPoUomMaster.findMany();
    const uomMap = new Map(allUoms.map(u => [u.code, u.id]));
    const defaultItems = [
      { name: 'D-Main Door 1200x2400mm', code: 'DOOR-MAIN-120', price: 41345, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'D1-Bed Room Door 1000x2100mm', code: 'DOOR-BED-100', price: 12326, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'D2-Toilet Door 800x2100mm', code: 'DOOR-TOILET-80', price: 11958, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'DW2-Main Door 1200x2400+600x1950mm', code: 'DOOR-DW2-120', price: 55880, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'D3-Servant Room Door 750x2400mm', code: 'DOOR-SERV-75', price: 12680, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'D6-Kitchen Door 900x2100mm', code: 'DOOR-KIT-90', price: 12167, uomCodes: ['EA', 'NUM', 'SET'] },
      { name: 'Teak Wood Veneer Paneling', code: 'PANEL-VENEER', price: 450, uomCodes: ['SQFT', 'RFT'] },
      { name: 'Hardwood Door Frame 100x50mm', code: 'FRAME-HW-100', price: 850, uomCodes: ['RFT', 'NUM'] }
    ];

    for (const item of defaultItems) {
      const uomIds = item.uomCodes.map(code => uomMap.get(code)).filter(Boolean) as string[];
      await prisma.clientPoLineItemMaster.create({
        data: {
          name: item.name,
          code: item.code,
          defaultUnitPrice: item.price,
          uoms: {
            create: uomIds.map(uomId => ({ uomId }))
          }
        }
      });
    }
  }
}

