// Supabase Edge Function: contact-email
//
// Sends an email (via Resend) whenever a new row lands in `inquiries`.
// Wire this up in the Supabase Dashboard: Database → Webhooks → New webhook
//   - Table: inquiries
//   - Events: Insert
//   - Type: Supabase Edge Function → contact-email
//
// Deploy: supabase functions deploy contact-email
// Secrets needed (Project Settings → Edge Functions → Secrets, or `supabase secrets set`):
//   RESEND_API_KEY   — from resend.com
//   CONTACT_TO_EMAIL — Joey's Gmail address, where inquiries should land
//   CONTACT_FROM_EMAIL — a Resend-verified sender, e.g. inquiries@cajunbingosupply.com

Deno.serve(async (req) => {
  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400 });
  }

  const record = payload.record;
  if (!record) {
    return new Response(JSON.stringify({ error: "No record in payload" }), { status: 400 });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const toEmail = Deno.env.get("CONTACT_TO_EMAIL");
  const fromEmail = Deno.env.get("CONTACT_FROM_EMAIL");

  const orderItems = Array.isArray(record.order_items) ? record.order_items : null;
  const isOrder = orderItems && orderItems.length > 0;

  const subject = isOrder
    ? `New order from ${record.name} — Cajun Bingo Supply`
    : `New inquiry from ${record.name} — Cajun Bingo Supply`;

  const orderSection = isOrder
    ? [
        "Order:",
        ...orderItems.map((item: { name: string; form_label?: string; quantity: number }) =>
          `  - ${item.quantity} x ${item.name}${item.form_label ? ` (${item.form_label})` : ""}`
        ),
        "",
      ]
    : [];

  const body = [
    `Name: ${record.name}`,
    `Email: ${record.email}`,
    record.phone ? `Phone: ${record.phone}` : null,
    !isOrder && record.product_id ? `Product: ${record.product_id}` : null,
    "",
    ...orderSection,
    isOrder ? "Comments:" : "Message:",
    record.message || "(none)",
  ].filter(Boolean).join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      reply_to: record.email,
      subject,
      text: body,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(JSON.stringify({ error: `Resend error: ${errText}` }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
