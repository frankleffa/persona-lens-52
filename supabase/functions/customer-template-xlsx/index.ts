// ─────────────────────────────────────────────────────────────
// customer-template-xlsx — Generates a downloadable XLSX template
// for bulk customer import. The columns exactly match what the
// import-customers-xlsx function expects.
// ─────────────────────────────────────────────────────────────

import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const headers = [
    "email",
    "name",
    "phone",
    "event_name",
    "value",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "fbclid",
  ];

  const exampleRow = [
    "cliente@exemplo.com",
    "João Silva",
    "+5511999999999",
    "Purchase",
    "150.00",
    "facebook",
    "cpc",
    "nome-da-campanha",
    "",
    "",
    "",
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  ws["!cols"] = [
    { wch: 30 }, // email
    { wch: 20 }, // name
    { wch: 18 }, // phone
    { wch: 16 }, // event_name
    { wch: 12 }, // value
    { wch: 14 }, // utm_source
    { wch: 14 }, // utm_medium
    { wch: 28 }, // utm_campaign
    { wch: 20 }, // utm_content
    { wch: 16 }, // utm_term
    { wch: 24 }, // fbclid
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clientes");

  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const uint8 = new Uint8Array(buffer);

  return new Response(uint8, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="modelo_importacao_clientes.xlsx"`,
    },
  });
});
