import { Decimal } from "decimal.js";
import {
  AccountType,
  ApprovalStatus,
  AssetStatus,
  BudgetStatus,
  CashAccountType,
  CashTransactionStatus,
  CashTransactionType,
  ContactType,
  DepreciationMethod,
  EntryStatus,
  PayrollPeriodStatus,
  POSSessionStatus,
  ProductionIssueStatus,
  ProductionOrderStatus,
  ProductionReceiptStatus,
  ProjectStatus,
  PurchaseInvoiceStatus,
  PurchaseOrderStatus,
  PurchaseReceiveStatus,
  SalesInvoiceStatus,
  SalesOrderStatus,
  SalesReturnStatus,
  SalesShipmentStatus,
  SalaryComponentType,
  SalarySlipStatus,
  TransferStatus,
} from "../generated/prisma/client";
import { prisma } from "./utils";
import { hash } from "bcryptjs";

const m = (v: number) => new Decimal(v);

function dateAt(dayOffset: number, hour = 9) {
  const d = new Date("2026-01-01T00:00:00+07:00");
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export async function seedDemoIndonesia() {
  console.log("Seeding demo Indonesia (single branch, comprehensive)...");

  await prisma.$transaction([
    prisma.assetDisposal.deleteMany(),
    prisma.depreciationSchedule.deleteMany(),
    prisma.asset.deleteMany(),
    prisma.assetCategory.deleteMany(),
    prisma.salarySlipItem.deleteMany(),
    prisma.salarySlip.deleteMany(),
    prisma.payrollRun.deleteMany(),
    prisma.payrollPeriod.deleteMany(),
    prisma.salaryStructureItem.deleteMany(),
    prisma.salaryStructure.deleteMany(),
    prisma.salaryComponent.deleteMany(),
    prisma.employeeDetail.deleteMany(),
    prisma.productionReceiptItem.deleteMany(),
    prisma.productionReceipt.deleteMany(),
    prisma.productionIssueItem.deleteMany(),
    prisma.productionIssue.deleteMany(),
    prisma.productionOrder.deleteMany(),
    prisma.billOfMaterialItem.deleteMany(),
    prisma.billOfMaterial.deleteMany(),
    prisma.cashTransactionAllocation.deleteMany(),
    prisma.cashTransaction.deleteMany(),
    prisma.cashTransfer.deleteMany(),
    prisma.salesPayment.deleteMany(),
    prisma.purchasePayment.deleteMany(),
    prisma.salesReturnItem.deleteMany(),
    prisma.salesReturn.deleteMany(),
    prisma.purchaseReturnItem.deleteMany(),
    prisma.purchaseReturn.deleteMany(),
    prisma.salesInvoiceItem.deleteMany(),
    prisma.salesInvoice.deleteMany(),
    prisma.purchaseInvoiceItem.deleteMany(),
    prisma.purchaseInvoice.deleteMany(),
    prisma.salesShipmentItem.deleteMany(),
    prisma.salesShipment.deleteMany(),
    prisma.purchaseReceiveItem.deleteMany(),
    prisma.purchaseReceive.deleteMany(),
    prisma.salesOrderItem.deleteMany(),
    prisma.salesOrder.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.heldOrder.deleteMany(),
    prisma.pOSSession.deleteMany(),
    prisma.inventoryMovementDetail.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.priceHistory.deleteMany(),
    prisma.discount.deleteMany(),
    prisma.product.deleteMany(),
    prisma.location.deleteMany(),
    prisma.warehouse.deleteMany(),
    prisma.taxRate.deleteMany(),
    prisma.category.deleteMany(),
    prisma.unit.deleteMany(),
    prisma.budgetApproval.deleteMany(),
    prisma.budgetRevision.deleteMany(),
    prisma.budgetItem.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.project.deleteMany(),
    prisma.department.deleteMany(),
    prisma.file.deleteMany(),
    prisma.journalEntryLine.deleteMany(),
    prisma.journalEntry.deleteMany(),
    prisma.defaultAccount.deleteMany(),
    prisma.cashAccount.deleteMany(),
    prisma.account.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.user.deleteMany(),
    prisma.role.deleteMany(),
    prisma.companyProfile.deleteMany(),
  ]);

  await prisma.companyProfile.create({
    data: {
      name: "PT Nusantara Rasa Digital",
      address: "Jl. Jenderal Sudirman No. 88, Jakarta Selatan, DKI Jakarta 12190",
      phone: "+62-21-5099-7788",
      email: "finance@nusantararasa.co.id",
      website: "https://nusantararasa.co.id",
      taxId: "01.234.567.8-091.000",
      currency: "IDR",
      currencySymbol: "Rp",
      locale: "id-ID",
      timezone: "Asia/Jakarta",
      dateFormat: "dd/MM/yyyy",
    },
  });

  const roleSuperadmin = await prisma.role.create({ data: { name: "superadmin", description: "Full access", permissions: ["*"] } });
  const roleManager = await prisma.role.create({ data: { name: "Manager Operasional", description: "Manager", permissions: ["dashboard.view", "sales.view", "purchase.view", "inventory.view", "reporting.view"] } });
  const roleCashier = await prisma.role.create({ data: { name: "Kasir", description: "Kasir POS", permissions: ["pos.access", "sales.create", "sales.payments", "inventory.view"] } });

  const password = await hash("Demo12345!", 10);
  const adminUser = await prisma.user.create({ data: { email: "admin@nusantararasa.co.id", name: "Admin Demo", password, roleId: roleSuperadmin.id } });
  await prisma.user.create({ data: { email: "manager@nusantararasa.co.id", name: "Rina Manager", password, roleId: roleManager.id } });
  await prisma.user.create({ data: { email: "kasir@nusantararasa.co.id", name: "Budi Kasir", password, roleId: roleCashier.id } });

  const accounts = await prisma.account.createManyAndReturn({
    data: [
      { code: "11110", name: "Bank BCA Operasional", type: AccountType.asset, isPosting: true, level: 2 },
      { code: "11120", name: "Kas Toko", type: AccountType.asset, isPosting: true, level: 2 },
      { code: "11200", name: "Piutang Usaha", type: AccountType.asset, isPosting: true, level: 2 },
      { code: "11300", name: "Persediaan Barang Dagang", type: AccountType.asset, isPosting: true, level: 2 },
      { code: "12100", name: "Aset Tetap", type: AccountType.asset, isPosting: true, level: 2 },
      { code: "12200", name: "Akumulasi Penyusutan", type: AccountType.asset, normalBalance: "credit", isPosting: true, level: 2 },
      { code: "21100", name: "Utang Usaha", type: AccountType.liability, normalBalance: "credit", isPosting: true, level: 2 },
      { code: "21200", name: "Utang PPN Keluaran", type: AccountType.liability, normalBalance: "credit", isPosting: true, level: 2 },
      { code: "21300", name: "Utang Gaji", type: AccountType.liability, normalBalance: "credit", isPosting: true, level: 2 },
      { code: "31000", name: "Modal Disetor", type: AccountType.equity, normalBalance: "credit", isPosting: true, level: 1 },
      { code: "41200", name: "Penjualan Produk", type: AccountType.revenue, normalBalance: "credit", isPosting: true, level: 2 },
      { code: "51200", name: "Harga Pokok Penjualan", type: AccountType.expense, isPosting: true, level: 2 },
      { code: "51400", name: "Beban Gaji", type: AccountType.expense, isPosting: true, level: 2 },
      { code: "51600", name: "Beban Operasional", type: AccountType.expense, isPosting: true, level: 2 },
      { code: "59000", name: "Beban Lain-lain", type: AccountType.expense, isPosting: true, level: 2 },
    ],
  });
  const byCode = (code: string) => accounts.find((a) => a.code === code)!;

  await prisma.cashAccount.createMany({
    data: [
      { name: "Kasir Cabang Jakarta", type: CashAccountType.CASH, description: "Laci kas utama", glAccountId: byCode("11120").id },
      { name: "BCA Operasional", type: CashAccountType.BANK, bankName: "Bank Central Asia", accountNumber: "1234567890", glAccountId: byCode("11110").id },
    ],
  });
  const cashDrawer = await prisma.cashAccount.findFirstOrThrow({ where: { name: "Kasir Cabang Jakarta" } });
  const bankBca = await prisma.cashAccount.findFirstOrThrow({ where: { name: "BCA Operasional" } });

  const deptOps = await prisma.department.create({ data: { name: "Operasional Toko", code: "OPS", isActive: true } });
  const deptFnc = await prisma.department.create({ data: { name: "Keuangan", code: "FNC", isActive: true } });
  const project = await prisma.project.create({
    data: {
      name: "Operasional Restoran 2026",
      code: "PRJ-RESTO-2026",
      description: "Operasional harian restoran, kitchen, dan POS",
      startDate: dateAt(0),
      endDate: dateAt(364),
      status: ProjectStatus.ACTIVE,
    },
  });

  const ppn11 = await prisma.taxRate.create({ data: { name: "PPN 11%", code: "PPN11", rate: m(11), description: "PPN Indonesia 11%" } });

  const unitPcs = await prisma.unit.create({ data: { name: "Pieces", symbol: "PCS" } });
  const unitPack = await prisma.unit.create({ data: { name: "Pack", symbol: "PCK" } });
  const unitKg = await prisma.unit.create({ data: { name: "Kilogram", symbol: "KG" } });

  const catBahan = await prisma.category.create({ data: { name: "Bahan Baku", description: "Bahan baku minuman" } });
  const catMinuman = await prisma.category.create({ data: { name: "Minuman Jadi", description: "Produk siap jual" } });
  const catKemasan = await prisma.category.create({ data: { name: "Kemasan", description: "Cup, tutup, sedotan" } });

  const warehouse = await prisma.warehouse.create({ data: { name: "Cabang Jakarta Selatan", location: "Jl. Kemang Raya No. 21, Jakarta Selatan" } });
  const locStorage = await prisma.location.create({ data: { warehouseId: warehouse.id, name: "Gudang Utama", code: "GST", type: "STORAGE" } });
  await prisma.location.create({ data: { warehouseId: warehouse.id, name: "Area Receiving", code: "RCV", type: "RECEIVING" } });

  const products = await prisma.product.createManyAndReturn({
    data: [
      { sku: "BBK-KOPI-001", name: "Biji Kopi Arabika Gayo 1kg", categoryId: catBahan.id, price: m(185000), cost: m(145000), averageCost: m(145000), minStock: 20, baseUnitId: unitKg.id, purchaseUnitId: unitKg.id, salesUnitId: unitKg.id, taxRateId: ppn11.id },
      { sku: "BBK-SUSU-001", name: "Susu UHT Full Cream 1L", categoryId: catBahan.id, price: m(22000), cost: m(17500), averageCost: m(17500), minStock: 40, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "BBK-BERAS-001", name: "Beras Premium 5kg", categoryId: catBahan.id, price: m(78000), cost: m(65000), averageCost: m(65000), minStock: 20, baseUnitId: unitPack.id, purchaseUnitId: unitPack.id, salesUnitId: unitPack.id, taxRateId: ppn11.id },
      { sku: "BBK-AYAM-001", name: "Ayam Fillet Segar 1kg", categoryId: catBahan.id, price: m(68000), cost: m(52000), averageCost: m(52000), minStock: 30, baseUnitId: unitKg.id, purchaseUnitId: unitKg.id, salesUnitId: unitKg.id, taxRateId: ppn11.id },
      { sku: "BBK-CABAI-001", name: "Cabai Merah Keriting 1kg", categoryId: catBahan.id, price: m(48000), cost: m(36000), averageCost: m(36000), minStock: 15, baseUnitId: unitKg.id, purchaseUnitId: unitKg.id, salesUnitId: unitKg.id, taxRateId: ppn11.id },
      { sku: "KMN-CUP-001", name: "Cup 16oz + Tutup", categoryId: catKemasan.id, price: m(1300), cost: m(900), averageCost: m(900), minStock: 300, baseUnitId: unitPcs.id, purchaseUnitId: unitPack.id, salesUnitId: unitPcs.id, purchaseConversionFactor: m(50), taxRateId: ppn11.id },
      { sku: "KMN-BOX-001", name: "Food Box Kraft Medium", categoryId: catKemasan.id, price: m(2100), cost: m(1500), averageCost: m(1500), minStock: 300, baseUnitId: unitPcs.id, purchaseUnitId: unitPack.id, salesUnitId: unitPcs.id, purchaseConversionFactor: m(50), taxRateId: ppn11.id },
      { sku: "PRD-KOPMILK-001", name: "Kopi Susu Gula Aren", categoryId: catMinuman.id, price: m(28000), cost: m(12000), averageCost: m(12000), minStock: 60, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-AMERICANO-001", name: "Americano Ice", categoryId: catMinuman.id, price: m(24000), cost: m(9000), averageCost: m(9000), minStock: 60, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-ES-TEH-001", name: "Es Teh Manis", categoryId: catMinuman.id, price: m(12000), cost: m(4000), averageCost: m(4000), minStock: 80, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-LEMON-001", name: "Lemon Tea", categoryId: catMinuman.id, price: m(18000), cost: m(6500), averageCost: m(6500), minStock: 70, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-NASGOR-001", name: "Nasi Goreng Spesial", categoryId: catMinuman.id, price: m(34000), cost: m(14500), averageCost: m(14500), minStock: 50, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-MIEAYAM-001", name: "Mie Ayam Komplit", categoryId: catMinuman.id, price: m(30000), cost: m(13000), averageCost: m(13000), minStock: 50, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
      { sku: "PRD-AYAMBKR-001", name: "Ayam Bakar Sambal", categoryId: catMinuman.id, price: m(39000), cost: m(18000), averageCost: m(18000), minStock: 40, baseUnitId: unitPcs.id, purchaseUnitId: unitPcs.id, salesUnitId: unitPcs.id, taxRateId: ppn11.id },
    ],
  });
  const prod = (sku: string) => products.find((p) => p.sku === sku)!;
  const finished = [
    prod("PRD-KOPMILK-001"),
    prod("PRD-AMERICANO-001"),
    prod("PRD-ES-TEH-001"),
    prod("PRD-LEMON-001"),
    prod("PRD-NASGOR-001"),
    prod("PRD-MIEAYAM-001"),
    prod("PRD-AYAMBKR-001"),
  ];
  const raw = [
    prod("BBK-KOPI-001"),
    prod("BBK-SUSU-001"),
    prod("BBK-BERAS-001"),
    prod("BBK-AYAM-001"),
    prod("BBK-CABAI-001"),
    prod("KMN-CUP-001"),
    prod("KMN-BOX-001"),
  ];

  await prisma.inventory.createMany({
    data: [
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("BBK-KOPI-001").id, quantity: 520, unitCost: m(145000), reorderPoint: 20 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("BBK-SUSU-001").id, quantity: 1400, unitCost: m(17500), reorderPoint: 40 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("BBK-BERAS-001").id, quantity: 220, unitCost: m(65000), reorderPoint: 20 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("BBK-AYAM-001").id, quantity: 280, unitCost: m(52000), reorderPoint: 30 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("BBK-CABAI-001").id, quantity: 160, unitCost: m(36000), reorderPoint: 15 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("KMN-CUP-001").id, quantity: 16000, unitCost: m(900), reorderPoint: 300 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("KMN-BOX-001").id, quantity: 12000, unitCost: m(1500), reorderPoint: 300 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-KOPMILK-001").id, quantity: 1800, unitCost: m(12000), reorderPoint: 60 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-AMERICANO-001").id, quantity: 1500, unitCost: m(9000), reorderPoint: 60 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-ES-TEH-001").id, quantity: 2200, unitCost: m(4000), reorderPoint: 80 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-LEMON-001").id, quantity: 1700, unitCost: m(6500), reorderPoint: 70 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-NASGOR-001").id, quantity: 900, unitCost: m(14500), reorderPoint: 50 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-MIEAYAM-001").id, quantity: 850, unitCost: m(13000), reorderPoint: 50 },
      { warehouseId: warehouse.id, locationId: locStorage.id, productId: prod("PRD-AYAMBKR-001").id, quantity: 700, unitCost: m(18000), reorderPoint: 40 },
    ],
  });

  const customers = await prisma.contact.createManyAndReturn({
    data: [
      { type: ContactType.CUSTOMER, name: "Walk-in Customer", email: "walkin@nusantararasa.co.id", phone: "+62-21-8000-0001", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Member Silver", email: "member.silver@nusantararasa.co.id", phone: "+62-21-8000-0002", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Member Gold", email: "member.gold@nusantararasa.co.id", phone: "+62-21-8000-0003", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Komunitas Kantor SCBD", email: "office.scbd@nusantararasa.co.id", phone: "+62-21-8000-0004", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Pelanggan Catering Harian", email: "catering.harian@nusantararasa.co.id", phone: "+62-21-8000-0005", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Pelanggan Delivery App", email: "delivery.app@nusantararasa.co.id", phone: "+62-21-8000-0006", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Pelanggan Event Akhir Pekan", email: "event.weekend@nusantararasa.co.id", phone: "+62-21-8000-0007", address: "Jakarta Selatan" },
      { type: ContactType.CUSTOMER, name: "Corporate Lunch Package", email: "corporate.lunch@nusantararasa.co.id", phone: "+62-21-8000-0008", address: "Jakarta Selatan" },
    ],
  });

  const vendors = await prisma.contact.createManyAndReturn({
    data: [
      { type: ContactType.VENDOR, name: "PT Sumber Kopi Indonesia", email: "sales@sumberkopi.co.id", phone: "+62-22-6555-8899", address: "Bandung" },
      { type: ContactType.VENDOR, name: "PT Sayur Segar Nusantara", email: "sales@sayursegar.co.id", phone: "+62-21-7600-1122", address: "Bogor" },
      { type: ContactType.VENDOR, name: "PT Protein Unggas Jaya", email: "order@unggasjaya.co.id", phone: "+62-31-4555-6677", address: "Surabaya" },
      { type: ContactType.VENDOR, name: "PT Kemasan Prima Jaya", email: "cs@kemasanprima.co.id", phone: "+62-24-7123-4567", address: "Semarang" },
      { type: ContactType.VENDOR, name: "PT Dairy Nusantara", email: "order@dairynusantara.co.id", phone: "+62-21-6111-8877", address: "Bogor" },
    ],
  });

  const employees = await prisma.contact.createManyAndReturn({
    data: [
      { type: ContactType.EMPLOYEE, name: "Andi Pratama", email: "andi.pratama@nusantararasa.co.id", phone: "+62-812-1000-2001", address: "Jakarta Selatan" },
      { type: ContactType.EMPLOYEE, name: "Siti Rahma", email: "siti.rahma@nusantararasa.co.id", phone: "+62-812-1000-2002", address: "Jakarta Selatan" },
      { type: ContactType.EMPLOYEE, name: "Rudi Hartono", email: "rudi.hartono@nusantararasa.co.id", phone: "+62-812-1000-2003", address: "Jakarta Selatan" },
      { type: ContactType.EMPLOYEE, name: "Dewi Kartika", email: "dewi.kartika@nusantararasa.co.id", phone: "+62-812-1000-2004", address: "Jakarta Selatan" },
      { type: ContactType.EMPLOYEE, name: "Fajar Nugroho", email: "fajar.nugroho@nusantararasa.co.id", phone: "+62-812-1000-2005", address: "Jakarta Selatan" },
    ],
  });

  const baseSalaries = [9000000, 6500000, 7500000, 7200000, 6100000];
  for (let i = 0; i < employees.length; i++) {
    await prisma.employeeDetail.create({
      data: {
        contactId: employees[i].id,
        joinDate: dateAt(-360 + i * 20),
        jobTitle: ["Supervisor Operasional", "Barista Senior", "Staf Keuangan", "Kasir Senior", "Barista"][i],
        department: i === 2 ? deptFnc.name : deptOps.name,
        employmentStatus: "FULL_TIME",
      },
    });
  }

  const salaryBasic = await prisma.salaryComponent.create({ data: { name: "Gaji Pokok", type: SalaryComponentType.EARNING, isTaxable: true } });
  const salaryMeal = await prisma.salaryComponent.create({ data: { name: "Tunjangan Makan", type: SalaryComponentType.EARNING, isTaxable: false } });
  const salaryBpjs = await prisma.salaryComponent.create({ data: { name: "Potongan BPJS", type: SalaryComponentType.DEDUCTION, isTaxable: false } });

  for (let i = 0; i < employees.length; i++) {
    const st = await prisma.salaryStructure.create({ data: { name: `Struktur ${employees[i].name}`, contactId: employees[i].id, baseSalary: m(baseSalaries[i]), isActive: true } });
    await prisma.salaryStructureItem.createMany({
      data: [
        { structureId: st.id, componentId: salaryBasic.id, amount: m(baseSalaries[i]) },
        { structureId: st.id, componentId: salaryMeal.id, amount: m(600000) },
        { structureId: st.id, componentId: salaryBpjs.id, amount: m(Math.round(baseSalaries[i] * 0.02)) },
      ],
    });
  }

  // Bulk Purchase flow
  for (let i = 1; i <= 90; i++) {
    const v = vendors[i % vendors.length];
    const p = raw[i % raw.length];
    const qty = 30 + (i % 50);
    const unitCost = p.cost;
    const subtotal = unitCost.mul(qty);
    const tax = subtotal.mul(0.11);
    const total = subtotal.add(tax);
    const orderDate = dateAt(i * 2, 9);

    const po = await prisma.purchaseOrder.create({
      data: {
        orderNumber: `PO-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: v.id,
        orderDate,
        expectedDate: dateAt(i * 2 + 2, 9),
        status: PurchaseOrderStatus.CLOSED,
        totalAmount: subtotal,
        departmentId: deptOps.id,
        projectId: project.id,
        createdById: adminUser.id,
        items: { create: [{ productId: p.id, quantity: qty, unitCost, totalCost: subtotal, taxRateId: ppn11.id }] },
      },
    });

    await prisma.purchaseReceive.create({
      data: {
        receiveNumber: `GRN-JKT-2026-${String(i).padStart(4, "0")}`,
        purchaseOrderId: po.id,
        contactId: v.id,
        receiveDate: dateAt(i * 2 + 1, 11),
        status: PurchaseReceiveStatus.COMPLETED,
        departmentId: deptOps.id,
        projectId: project.id,
        items: { create: [{ productId: p.id, quantity: qty }] },
      },
    });

    const pi = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: `PINV-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: v.id,
        purchaseOrderId: po.id,
        invoiceDate: dateAt(i * 2 + 1, 14),
        dueDate: dateAt(i * 2 + 31, 14),
        status: PurchaseInvoiceStatus.PAID,
        totalAmount: total,
        totalTax: tax,
        departmentId: deptOps.id,
        projectId: project.id,
        items: {
          create: [{
            description: p.name,
            quantity: qty,
            unitPrice: unitCost,
            totalPrice: subtotal,
            tax,
            taxRateId: ppn11.id,
            accountId: byCode("11300").id,
          }],
        },
      },
    });

    await prisma.purchasePayment.create({
      data: {
        paymentNumber: `PPAY-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: v.id,
        purchaseInvoiceId: pi.id,
        paymentDate: dateAt(i * 2 + 3, 10),
        amount: total,
        cashAccountId: bankBca.id,
        reference: `TRF-VENDOR-${String(i).padStart(4, "0")}`,
        departmentId: deptFnc.id,
        projectId: project.id,
      },
    });
  }

  // Bulk Sales flow
  for (let i = 1; i <= 140; i++) {
    const c = customers[i % customers.length];
    const p = finished[i % finished.length];
    const qty = 10 + (i % 40);
    const unitPrice = p.price;
    const subtotal = unitPrice.mul(qty);
    const tax = subtotal.mul(0.11);
    const total = subtotal.add(tax);
    const orderDate = dateAt(i + 5, 13);

    const so = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: c.id,
        orderDate,
        expectedDate: dateAt(i + 6, 13),
        status: SalesOrderStatus.CLOSED,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        departmentId: deptOps.id,
        projectId: project.id,
        createdById: adminUser.id,
        items: { create: [{ productId: p.id, quantity: qty, unitPrice, totalPrice: subtotal, taxRateId: ppn11.id, taxRate: m(11) }] },
      },
    });

    await prisma.salesShipment.create({
      data: {
        shipmentNumber: `SHP-JKT-2026-${String(i).padStart(4, "0")}`,
        salesOrderId: so.id,
        contactId: c.id,
        shipmentDate: dateAt(i + 6, 9),
        status: SalesShipmentStatus.COMPLETED,
        trackingNumber: `JNE-CGK-${100000 + i}`,
        carrier: i % 2 === 0 ? "JNE" : "SiCepat",
        departmentId: deptOps.id,
        projectId: project.id,
        items: { create: [{ productId: p.id, quantity: qty }] },
      },
    });

    const si = await prisma.salesInvoice.create({
      data: {
        invoiceNumber: `INV-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: c.id,
        salesOrderId: so.id,
        invoiceDate: dateAt(i + 6, 12),
        dueDate: dateAt(i + 36, 12),
        status: SalesInvoiceStatus.PAID,
        subtotal,
        totalTax: tax,
        totalAmount: total,
        balanceDue: m(0),
        departmentId: deptOps.id,
        projectId: project.id,
        items: {
          create: [{
            description: p.name,
            productId: p.id,
            quantity: qty,
            unitPrice,
            totalPrice: subtotal,
            tax,
            taxRateId: ppn11.id,
            accountId: byCode("41200").id,
          }],
        },
      },
    });

    await prisma.salesPayment.create({
      data: {
        paymentNumber: `SPAY-JKT-2026-${String(i).padStart(4, "0")}`,
        contactId: c.id,
        salesInvoiceId: si.id,
        paymentDate: dateAt(i + 7, 10),
        amount: total,
        cashAccountId: bankBca.id,
        method: "BANK_TRANSFER",
        reference: `TRF-CUST-${String(i).padStart(4, "0")}`,
        departmentId: deptFnc.id,
        projectId: project.id,
      },
    });

    if (i % 12 === 0) {
      await prisma.salesReturn.create({
        data: {
          returnNumber: `SRTN-JKT-2026-${String(i).padStart(4, "0")}`,
          contactId: c.id,
          salesOrderId: so.id,
          salesInvoiceId: si.id,
          returnDate: dateAt(i + 10, 15),
          status: SalesReturnStatus.COMPLETED,
          reason: "Kemasan rusak saat pengiriman",
          totalAmount: unitPrice.mul(2),
          departmentId: deptOps.id,
          projectId: project.id,
          items: { create: [{ productId: p.id, quantity: 2, unitPrice, totalPrice: unitPrice.mul(2) }] },
        },
      });
    }
  }

  // POS sessions and transactions
  for (let s = 1; s <= 8; s++) {
    const posSession = await prisma.pOSSession.create({
      data: {
        sessionNumber: `POS-JKT-2026-${String(s).padStart(4, "0")}`,
        cashierId: adminUser.id,
        status: POSSessionStatus.CLOSED,
        warehouseId: warehouse.id,
        openingCash: m(2000000),
        closingCash: m(2000000 + s * 500000),
        actualCash: m(2000000 + s * 500000),
        difference: m(0),
        startTime: dateAt(100 + s, 8),
        endTime: dateAt(100 + s, 22),
      },
    });

    for (let i = 1; i <= 18; i++) {
      const p = finished[(i + s) % finished.length];
      const c = customers[(i + s) % customers.length];
      const qty = 1 + (i % 4);
      const subtotal = p.price.mul(qty);
      const tax = subtotal.mul(0.11);
      const total = subtotal.add(tax);
      const no = `${s}${String(i).padStart(3, "0")}`;

      const so = await prisma.salesOrder.create({
        data: {
          orderNumber: `SO-POS-2026-${no}`,
          contactId: c.id,
          posSessionId: posSession.id,
          orderDate: dateAt(100 + s, 9 + (i % 10)),
          status: SalesOrderStatus.CLOSED,
          subtotal,
          taxAmount: tax,
          totalAmount: total,
          createdById: adminUser.id,
          departmentId: deptOps.id,
          items: { create: [{ productId: p.id, quantity: qty, unitPrice: p.price, totalPrice: subtotal, taxRateId: ppn11.id, taxRate: m(11) }] },
        },
      });

      const si = await prisma.salesInvoice.create({
        data: {
          invoiceNumber: `INV-POS-2026-${no}`,
          contactId: c.id,
          salesOrderId: so.id,
          posSessionId: posSession.id,
          invoiceDate: dateAt(100 + s, 9 + (i % 10)),
          dueDate: dateAt(100 + s, 9 + (i % 10)),
          status: SalesInvoiceStatus.PAID,
          subtotal,
          totalTax: tax,
          totalAmount: total,
          balanceDue: m(0),
          items: { create: [{ description: p.name, productId: p.id, quantity: qty, unitPrice: p.price, totalPrice: subtotal, tax, taxRateId: ppn11.id, accountId: byCode("41200").id }] },
        },
      });

      await prisma.salesPayment.create({
        data: {
          paymentNumber: `SPAY-POS-2026-${no}`,
          contactId: c.id,
          salesInvoiceId: si.id,
          posSessionId: posSession.id,
          paymentDate: dateAt(100 + s, 10 + (i % 10)),
          amount: total,
          cashAccountId: cashDrawer.id,
          method: "CASH",
          reference: `RCPT-${no}`,
        },
      });

      if (i % 7 === 0) {
        await prisma.heldOrder.create({
          data: {
            holdId: `HOLD-POS-2026-${no}`,
            userId: adminUser.id,
            customerId: c.id,
            customerName: c.name,
            items: [{ sku: p.sku, qty: 2, unitPrice: p.price.toNumber() }],
            totalAmount: p.price.mul(2),
            note: "Order tertahan saat antrean ramai",
            posSessionId: posSession.id,
          },
        });
      }
    }
  }

  // Production
  const bom = await prisma.billOfMaterial.create({
    data: {
      bomNumber: "BOM-2026-0001",
      name: "BOM Kopi Susu Gula Aren",
      productId: prod("PRD-KOPMILK-001").id,
      quantity: 10,
      isActive: true,
      items: {
        create: [
          { productId: prod("BBK-KOPI-001").id, quantity: m(1), unitCost: m(145000) },
          { productId: prod("BBK-SUSU-001").id, quantity: m(8), unitCost: m(17500) },
          { productId: prod("KMN-CUP-001").id, quantity: m(10), unitCost: m(900) },
        ],
      },
    },
  });

  for (let i = 1; i <= 30; i++) {
    const qty = 80 + (i % 60);
    const mo = await prisma.productionOrder.create({
      data: {
        orderNumber: `MO-2026-${String(i).padStart(4, "0")}`,
        billOfMaterialId: bom.id,
        productId: prod("PRD-KOPMILK-001").id,
        plannedQuantity: qty,
        producedQuantity: qty,
        startDate: dateAt(30 + i, 8),
        endDate: dateAt(30 + i, 17),
        actualStartDate: dateAt(30 + i, 8),
        actualEndDate: dateAt(30 + i, 16),
        status: ProductionOrderStatus.COMPLETED,
      },
    });

    await prisma.productionIssue.create({
      data: {
        issueNumber: `PI-2026-${String(i).padStart(4, "0")}`,
        productionOrderId: mo.id,
        issueDate: dateAt(30 + i, 10),
        status: ProductionIssueStatus.ISSUED,
        items: {
          create: [
            { productId: prod("BBK-KOPI-001").id, quantity: Math.ceil(qty / 10), unitCost: m(145000), totalCost: m(Math.ceil(qty / 10) * 145000) },
            { productId: prod("BBK-SUSU-001").id, quantity: qty, unitCost: m(17500), totalCost: m(qty * 17500) },
          ],
        },
      },
    });

    await prisma.productionReceipt.create({
      data: {
        receiptNumber: `PRC-2026-${String(i).padStart(4, "0")}`,
        productionOrderId: mo.id,
        receiptDate: dateAt(30 + i, 17),
        status: ProductionReceiptStatus.RECEIVED,
        items: { create: [{ productId: prod("PRD-KOPMILK-001").id, quantity: qty, unitCost: m(12000), totalCost: m(qty * 12000) }] },
      },
    });
  }

  // Payroll for 6 months
  for (let month = 1; month <= 6; month++) {
    const start = new Date(`2026-${String(month).padStart(2, "0")}-01T00:00:00+07:00`);
    const end = new Date(`2026-${String(month).padStart(2, "0")}-28T23:59:59+07:00`);
    const period = await prisma.payrollPeriod.create({
      data: {
        name: `Payroll ${start.toLocaleString("id-ID", { month: "long" })} 2026`,
        startDate: start,
        endDate: end,
        status: PayrollPeriodStatus.COMPLETED,
      },
    });

    let totalEarn = m(0);
    let totalDed = m(0);

    for (let i = 0; i < employees.length; i++) {
      const gross = m(baseSalaries[i] + 600000);
      const ded = m(Math.round(baseSalaries[i] * 0.02));
      totalEarn = totalEarn.add(gross);
      totalDed = totalDed.add(ded);

      const slip = await prisma.salarySlip.create({
        data: {
          periodId: period.id,
          contactId: employees[i].id,
          grossSalary: gross,
          totalDeductions: ded,
          netSalary: gross.sub(ded),
          status: SalarySlipStatus.PAID,
        },
      });

      await prisma.salarySlipItem.createMany({
        data: [
          { slipId: slip.id, componentId: salaryBasic.id, amount: m(baseSalaries[i]), type: SalaryComponentType.EARNING },
          { slipId: slip.id, componentId: salaryMeal.id, amount: m(600000), type: SalaryComponentType.EARNING },
          { slipId: slip.id, componentId: salaryBpjs.id, amount: ded, type: SalaryComponentType.DEDUCTION },
        ],
      });
    }

    await prisma.payrollRun.create({
      data: {
        periodId: period.id,
        runDate: end,
        totalEarnings: totalEarn,
        totalDeductions: totalDed,
        netPay: totalEarn.sub(totalDed),
        status: PayrollPeriodStatus.COMPLETED,
      },
    });
  }

  // Budget, approval, revisions
  const budget = await prisma.budget.create({
    data: {
      name: "Budget Operasional 2026",
      fiscalYear: 2026,
      status: BudgetStatus.APPROVED,
      departmentId: deptOps.id,
      projectId: project.id,
      isDefault: true,
      totalAmount: m(1800000000),
      createdBy: adminUser.id,
    },
  });

  await prisma.budgetItem.createMany({
    data: [
      { budgetId: budget.id, accountId: byCode("51400").id, totalAmount: m(600000000), january: m(50000000), february: m(50000000), march: m(50000000), april: m(50000000), may: m(50000000), june: m(50000000), july: m(50000000), august: m(50000000), september: m(50000000), october: m(50000000), november: m(50000000), december: m(50000000) },
      { budgetId: budget.id, accountId: byCode("51600").id, totalAmount: m(360000000), january: m(30000000), february: m(30000000), march: m(30000000), april: m(30000000), may: m(30000000), june: m(30000000), july: m(30000000), august: m(30000000), september: m(30000000), october: m(30000000), november: m(30000000), december: m(30000000) },
      { budgetId: budget.id, accountId: byCode("59000").id, totalAmount: m(120000000), january: m(10000000), february: m(10000000), march: m(10000000), april: m(10000000), may: m(10000000), june: m(10000000), july: m(10000000), august: m(10000000), september: m(10000000), october: m(10000000), november: m(10000000), december: m(10000000) },
    ],
  });

  await prisma.budgetRevision.create({ data: { budgetId: budget.id, revisionNumber: 1, description: "Penyesuaian promosi semester 2", changes: { delta: 50000000 }, createdBy: adminUser.id } });
  await prisma.budgetApproval.create({ data: { budgetId: budget.id, stage: 1, role: "Manager Operasional", status: ApprovalStatus.APPROVED, approverId: adminUser.id } });

  // Assets
  const assetCategory = await prisma.assetCategory.create({
    data: {
      name: "Mesin Kopi",
      code: "AST-MSN",
      defaultUsefulLife: 60,
      defaultMethod: DepreciationMethod.STRAIGHT_LINE,
      assetAccountId: byCode("12100").id,
      accumDepreciationAccountId: byCode("12200").id,
      depreciationExpenseAccountId: byCode("51600").id,
    },
  });

  for (let i = 1; i <= 10; i++) {
    const cost = 55000000 + i * 2500000;
    const asset = await prisma.asset.create({
      data: {
        code: `AST-2026-${String(i).padStart(4, "0")}`,
        name: `Mesin Espresso Unit ${i}`,
        purchaseDate: dateAt(i * 3, 10),
        acquisitionCost: m(cost),
        residualValue: m(5000000),
        usefulLife: 60,
        depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
        status: AssetStatus.ACTIVE,
        currentBookValue: m(cost - 1200000),
        location: "Cabang Jakarta Selatan",
        department: deptOps.name,
        assignedTo: employees[i % employees.length].name,
        categoryId: assetCategory.id,
      },
    });

    await prisma.depreciationSchedule.create({
      data: {
        assetId: asset.id,
        date: dateAt(120 + i, 23),
        amount: m(1200000),
        bookValueAfter: m(cost - 1200000),
        isPosted: true,
        postedAt: dateAt(120 + i, 23),
      },
    });
  }

  // Journal entries + cash movement summary
  for (let i = 1; i <= 180; i++) {
    const amount = m(150000 + (i % 20) * 75000);
    const isIncome = i % 2 === 0;
    const jeDate = dateAt(5 + (i % 90), 15); // keep bulk operational journals in Jan-Apr
    const cashDate = dateAt(5 + (i % 90), 16);
    const je = await prisma.journalEntry.create({
      data: {
        userId: adminUser.id,
        entryNumber: `JE-2026-${String(i).padStart(5, "0")}`,
        transactionDate: jeDate,
        description: isIncome ? "Penerimaan operasional" : "Pengeluaran operasional",
        status: EntryStatus.posted,
        postedAt: jeDate,
        lines: {
          create: isIncome
            ? [
                { accountId: byCode("11120").id, debitAmount: amount, creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id },
                { accountId: byCode("41200").id, debitAmount: m(0), creditAmount: amount, lineNumber: 2, departmentId: deptOps.id },
              ]
            : [
                { accountId: byCode("51600").id, debitAmount: amount, creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id },
                { accountId: byCode("11120").id, debitAmount: m(0), creditAmount: amount, lineNumber: 2, departmentId: deptOps.id },
              ],
        },
      },
    });

    await prisma.cashTransaction.create({
      data: {
        cashAccountId: cashDrawer.id,
        type: isIncome ? CashTransactionType.INCOME : CashTransactionType.EXPENSE,
        date: cashDate,
        reference: `CASH-2026-${String(i).padStart(5, "0")}`,
        description: isIncome ? "Kas masuk harian" : "Kas keluar harian",
        departmentId: deptOps.id,
        projectId: project.id,
        journalEntryId: je.id,
        status: CashTransactionStatus.APPROVED,
        approvedById: adminUser.id,
        approvedAt: cashDate,
        allocations: {
          create: [
            {
              accountId: isIncome ? byCode("41200").id : byCode("51600").id,
              amount,
            },
          ],
        },
      },
    });
  }

  // Current month adjustments for sensible dashboard summary (revenue > expense, AR/AP outstanding > 0)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 2, 10, 0, 0, 0);
  const monthMid = new Date(now.getFullYear(), now.getMonth(), 10, 11, 0, 0, 0);
  const monthLate = new Date(now.getFullYear(), now.getMonth(), 18, 12, 0, 0, 0);

  await prisma.journalEntry.create({
    data: {
      userId: adminUser.id,
      entryNumber: "JE-CURR-AR-2026",
      transactionDate: monthStart,
      status: EntryStatus.posted,
      postedAt: monthStart,
      description: "Penjualan kredit bulan berjalan (outstanding AR)",
      lines: {
        create: [
          { accountId: byCode("11200").id, debitAmount: m(25000000), creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id, projectId: project.id },
          { accountId: byCode("41200").id, debitAmount: m(0), creditAmount: m(25000000), lineNumber: 2, departmentId: deptOps.id, projectId: project.id },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      userId: adminUser.id,
      entryNumber: "JE-CURR-AP-2026",
      transactionDate: monthMid,
      status: EntryStatus.posted,
      postedAt: monthMid,
      description: "Tagihan vendor bulan berjalan (outstanding AP)",
      lines: {
        create: [
          { accountId: byCode("51600").id, debitAmount: m(12000000), creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id, projectId: project.id },
          { accountId: byCode("21100").id, debitAmount: m(0), creditAmount: m(12000000), lineNumber: 2, departmentId: deptOps.id, projectId: project.id },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      userId: adminUser.id,
      entryNumber: "JE-CURR-CASHSALE-2026",
      transactionDate: monthLate,
      status: EntryStatus.posted,
      postedAt: monthLate,
      description: "Penjualan tunai bulan berjalan",
      lines: {
        create: [
          { accountId: byCode("11120").id, debitAmount: m(90000000), creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id, projectId: project.id },
          { accountId: byCode("41200").id, debitAmount: m(0), creditAmount: m(90000000), lineNumber: 2, departmentId: deptOps.id, projectId: project.id },
        ],
      },
    },
  });

  await prisma.journalEntry.create({
    data: {
      userId: adminUser.id,
      entryNumber: "JE-CURR-OPEX-2026",
      transactionDate: new Date(now.getFullYear(), now.getMonth(), 22, 13, 0, 0, 0),
      status: EntryStatus.posted,
      postedAt: new Date(now.getFullYear(), now.getMonth(), 22, 13, 0, 0, 0),
      description: "Biaya operasional tunai bulan berjalan",
      lines: {
        create: [
          { accountId: byCode("51600").id, debitAmount: m(55000000), creditAmount: m(0), lineNumber: 1, departmentId: deptOps.id, projectId: project.id },
          { accountId: byCode("11120").id, debitAmount: m(0), creditAmount: m(55000000), lineNumber: 2, departmentId: deptOps.id, projectId: project.id },
        ],
      },
    },
  });

  for (let i = 1; i <= 36; i++) {
    await prisma.cashTransfer.create({
      data: {
        fromAccountId: cashDrawer.id,
        toAccountId: bankBca.id,
        amount: m(2500000 + i * 50000),
        date: dateAt(20 + i * 5, 10),
        reference: `TRF-SETOR-${String(i).padStart(4, "0")}`,
        description: "Setoran kas berkala ke bank",
        status: TransferStatus.APPROVED,
        approvedById: adminUser.id,
        approvedAt: dateAt(20 + i * 5, 10),
      },
    });
  }

  const counts = await Promise.all([
    prisma.purchaseOrder.count(), prisma.purchaseInvoice.count(), prisma.purchasePayment.count(),
    prisma.salesOrder.count(), prisma.salesInvoice.count(), prisma.salesPayment.count(),
    prisma.pOSSession.count(), prisma.heldOrder.count(), prisma.productionOrder.count(),
    prisma.payrollPeriod.count(), prisma.salarySlip.count(), prisma.journalEntry.count(),
  ]);

  console.log("Seed selesai: comprehensive single-branch dataset siap presentasi", {
    purchaseOrders: counts[0],
    purchaseInvoices: counts[1],
    purchasePayments: counts[2],
    salesOrders: counts[3],
    salesInvoices: counts[4],
    salesPayments: counts[5],
    posSessions: counts[6],
    heldOrders: counts[7],
    productionOrders: counts[8],
    payrollPeriods: counts[9],
    salarySlips: counts[10],
    journalEntries: counts[11],
  });
}
