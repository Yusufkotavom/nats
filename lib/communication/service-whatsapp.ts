export function buildServiceOrderCreatedMessage(input: {
  customerName: string;
  orderNumber: string;
  itemsSummary: string;
  totalAmount: number;
  downPaymentAmount: number;
  remainingAmount: number;
  targetDateLabel: string;
}) {
  const lines = [
    `Halo ${input.customerName},`,
    "",
    `Order service Anda sudah masuk dengan nomor ${input.orderNumber}.`,
    `Item: ${input.itemsSummary}`,
    `Total: ${input.totalAmount.toLocaleString("id-ID")}`,
  ];

  if (input.downPaymentAmount > 0) {
    lines.push(`DP diterima: ${input.downPaymentAmount.toLocaleString("id-ID")}`);
    lines.push(`Sisa pembayaran: ${input.remainingAmount.toLocaleString("id-ID")}`);
  }

  lines.push(`Target selesai: ${input.targetDateLabel}`);
  lines.push("Kami akan update progres service Anda.");

  return lines.join("\n");
}

export function buildServiceStatusUpdatedMessage(input: {
  customerName: string;
  orderNumber: string;
  status: string;
  readyToPickup: boolean;
}) {
  if (input.readyToPickup) {
    return [
      `Halo ${input.customerName},`,
      "",
      `Service ${input.orderNumber} sudah selesai dan siap diambil.`,
      "Silakan datang ke outlet kami. Terima kasih.",
    ].join("\n");
  }

  return [
    `Halo ${input.customerName},`,
    "",
    `Update service ${input.orderNumber}: status sekarang ${input.status}.`,
    "Terima kasih.",
  ].join("\n");
}

export function buildServicePaymentReceivedMessage(input: {
  customerName: string;
  orderNumber: string;
  paymentAmount: number;
  remainingAmount: number;
}) {
  return [
    `Halo ${input.customerName},`,
    "",
    `Pembayaran untuk service ${input.orderNumber} sudah kami terima.`,
    `Nominal diterima: ${input.paymentAmount.toLocaleString("id-ID")}`,
    `Sisa pembayaran: ${input.remainingAmount.toLocaleString("id-ID")}`,
    "Terima kasih.",
  ].join("\n");
}
