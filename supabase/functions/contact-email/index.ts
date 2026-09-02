// Supabase Edge Function: contact-email
//
// Sends an email (via Resend) and a text reminder (via Twilio) whenever a
// new row lands in `inquiries`.
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
//   TWILIO_ACCOUNT_SID  — from twilio.com console
//   TWILIO_AUTH_TOKEN   — from twilio.com console
//   TWILIO_FROM_NUMBER  — the Twilio phone number texts are sent from, e.g. +15551234567
//   CONTACT_TO_PHONE    — Joey's cell number, e.g. +13379626584
//
// Email and SMS are sent independently — if one fails the other still goes
// out, and the response reports both outcomes.

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

  const emailRes = await fetch("https://api.resend.com/emails", {
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

  const emailError = emailRes.ok ? null : `Resend error: ${await emailRes.text()}`;

  // Short SMS summary — a nudge to go check email, not the full message.
  const itemsSummary = isOrder
    ? orderItems.map((item: { name: string; form_label?: string; quantity: number }) =>
        `${item.quantity}x ${item.name}`
      ).join(", ")
    : null;

  const rawSmsBody = isOrder
    ? `Cajun Bingo Supply: New order from ${record.name} — ${itemsSummary}. Check your email for details.`
    : `Cajun Bingo Supply: New message from ${record.name}: "${record.message || "(no message)"}" Check your email.`;

  // Keep it to one SMS segment's worth of plain-text characters.
  const smsBody = rawSmsBody.length > 300 ? rawSmsBody.slice(0, 297) + "..." : rawSmsBody;

  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
  const toPhone = Deno.env.get("CONTACT_TO_PHONE");

  const smsRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: twilioFrom ?? "", To: toPhone ?? "", Body: smsBody }),
    }
  );

  const smsError = smsRes.ok ? null : `Twilio error: ${await smsRes.text()}`;

  if (emailError && smsError) {
    return new Response(JSON.stringify({ error: { email: emailError, sms: smsError } }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, emailError, smsError }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
