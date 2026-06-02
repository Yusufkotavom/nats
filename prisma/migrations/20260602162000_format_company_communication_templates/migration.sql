UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Invoice*\n*Nomor:* {{doc_number}}\n*Tanggal:* {{date}}\n*Status:* {{status}}\n*Total:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n\n*Cek Detail:* {{doc_url}}'
WHERE "eventKey" = 'SALES_INVOICE_ISSUED'
  AND "template" = 'Halo {{customer_name}}, invoice {{doc_number}} sudah terbit. Total: {{amount}}. Sisa: {{remaining_amount}}. Invoice: {{doc_url}}';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Pembayaran Diterima*\n*Nomor Pembayaran:* {{doc_number}}\n*Nominal Bayar:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n\n*Cek Detail:* {{doc_url}}'
WHERE "eventKey" = 'SALES_PAYMENT_POSTED'
  AND "template" = 'Halo {{customer_name}}, pembayaran {{doc_number}} sebesar {{amount}} sudah kami terima.';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Service Diterima*\n*Nomor WO:* {{doc_number}}\n*Tanggal:* {{date}}\n*Total:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n*Estimasi:* {{target_date}}\n\n*Cek Progress:* {{doc_url}}'
WHERE "eventKey" = 'SERVICE_CREATED'
  AND "template" = 'Halo {{customer_name}}, WO {{doc_number}} sudah diterima. Total: {{amount}}. Sisa: {{remaining_amount}}.';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Service Ready*\n*Nomor WO:* {{doc_number}}\n*Status:* {{status}}\n\nBarang sudah siap dan bisa diambil.\n*Cek Progress:* {{doc_url}}'
WHERE "eventKey" = 'SERVICE_READY'
  AND "template" = 'Halo {{customer_name}}, WO {{doc_number}} sudah READY dan bisa diambil.';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Konfirmasi Biaya Service*\n*Nomor WO:* {{doc_number}}\n*Biaya:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n\n*Cek Detail:* {{doc_url}}'
WHERE "eventKey" = 'SERVICE_COST_DONE'
  AND "template" = 'Halo {{customer_name}}, konfirmasi biaya WO {{doc_number}}: {{amount}}.';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Service Selesai Diambil*\n*Nomor WO:* {{doc_number}}\n*Garansi:* {{warranty_text}}\n\nTerima kasih. Silakan simpan link ini untuk monitoring dokumen.\n*Cek Detail:* {{doc_url}}'
WHERE "eventKey" = 'SERVICE_PICKED_UP'
  AND "template" = 'Halo {{customer_name}}, WO {{doc_number}} sudah diambil. Garansi: {{warranty_text}}.';

UPDATE "CompanyCommunicationTemplate"
SET "template" = E'Halo {{customer_name}},\n\n*Pembayaran POS Berhasil*\n*Nomor:* {{doc_number}}\n*Nominal:* {{amount}}\n\n*Cek Detail:* {{doc_url}}'
WHERE "eventKey" = 'POS_PAYMENT_POSTED'
  AND "template" = 'Halo {{customer_name}}, pembayaran POS {{doc_number}} sebesar {{amount}} berhasil.';

UPDATE "CompanyProfile"
SET
  "serviceTemplateCreated" = CASE
    WHEN "serviceTemplateCreated" = 'Halo {{customer_name}}, WO {{doc_number}} sudah diterima. Total: {{amount}}. Sisa: {{remaining_amount}}.'
      THEN E'Halo {{customer_name}},\n\n*Service Diterima*\n*Nomor WO:* {{doc_number}}\n*Tanggal:* {{date}}\n*Total:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n*Estimasi:* {{target_date}}\n\n*Cek Progress:* {{doc_url}}'
    ELSE "serviceTemplateCreated"
  END,
  "serviceTemplateReady" = CASE
    WHEN "serviceTemplateReady" = 'Halo {{customer_name}}, WO {{doc_number}} sudah READY dan bisa diambil.'
      THEN E'Halo {{customer_name}},\n\n*Service Ready*\n*Nomor WO:* {{doc_number}}\n*Status:* {{status}}\n\nBarang sudah siap dan bisa diambil.\n*Cek Progress:* {{doc_url}}'
    ELSE "serviceTemplateReady"
  END,
  "serviceTemplateCostDone" = CASE
    WHEN "serviceTemplateCostDone" = 'Halo {{customer_name}}, konfirmasi biaya WO {{doc_number}}: {{amount}}.'
      THEN E'Halo {{customer_name}},\n\n*Konfirmasi Biaya Service*\n*Nomor WO:* {{doc_number}}\n*Biaya:* {{amount}}\n*Sisa Tagihan:* {{remaining_amount}}\n\n*Cek Detail:* {{doc_url}}'
    ELSE "serviceTemplateCostDone"
  END,
  "serviceTemplatePickedUp" = CASE
    WHEN "serviceTemplatePickedUp" = 'Halo {{customer_name}}, WO {{doc_number}} sudah diambil. Garansi: {{warranty_text}}.'
      THEN E'Halo {{customer_name}},\n\n*Service Selesai Diambil*\n*Nomor WO:* {{doc_number}}\n*Garansi:* {{warranty_text}}\n\nTerima kasih. Silakan simpan link ini untuk monitoring dokumen.\n*Cek Detail:* {{doc_url}}'
    ELSE "serviceTemplatePickedUp"
  END;
