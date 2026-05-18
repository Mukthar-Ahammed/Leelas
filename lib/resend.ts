import { Resend } from "resend";

function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");
}

export const resend = {
  emails: {
    send: (args: Parameters<Resend["emails"]["send"]>[0]) => getResend().emails.send(args),
  },
};

export type EmailAttachment = { content: Buffer; filename: string };

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
  attachments?: EmailAttachment[]
): Promise<{ success: boolean }> {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Leelas <orders@leelas.in>",
      to,
      subject,
      html: htmlBody,
      attachments: attachments?.map((a) => ({
        content: a.content,
        filename: a.filename,
      })),
    });
    return { success: true };
  } catch (err) {
    console.error("[Resend] Failed to send email:", err);
    return { success: false };
  }
}

// ─── Legacy single-use helpers (kept for auth flows) ─────────────────────────

export async function sendOrderConfirmation(to: string, orderId: string) {
  return sendEmail(
    to,
    `Order Confirmed – #${orderId.slice(-8).toUpperCase()} | Leelas`,
    `<p>Your order <strong>#${orderId.slice(-8).toUpperCase()}</strong> has been confirmed. Thank you for choosing Leelas!</p>`
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Leelas <orders@leelas.in>",
    to,
    subject: "Reset your Leelas password",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
  });
}
