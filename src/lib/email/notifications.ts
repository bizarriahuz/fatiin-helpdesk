import "server-only";
import { priorityLabel, ticketCategoryLabel, ticketStatusLabel, ticketTypeLabel } from "@/lib/helpdesk-labels";

type NotificationResult = "sent" | "not_configured" | "failed";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type TicketSummary = {
  subject: string;
  category: string;
  ticketType: string;
  priority: string;
  requesterEmail: string;
};

const resendEndpoint = "https://api.resend.com/emails";

async function sendEmail(message: EmailMessage): Promise<NotificationResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!apiKey || !from || !appBaseUrl) {
    return "not_configured";
  }

  try {
    const response = await fetch(resendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error("Email provider rejected a helpdesk notification", response.status);
      return "failed";
    }

    return "sent";
  } catch {
    console.error("Could not reach the email provider for a helpdesk notification");
    return "failed";
  }
}

export async function notifyHelpdeskOfNewTicket(
  ticket: TicketSummary,
): Promise<NotificationResult> {
  const to = process.env.HELPDESK_NOTIFICATION_EMAIL;
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!to || !appBaseUrl) {
    return "not_configured";
  }

  const ticketUrl = `${appBaseUrl}/staff/queue`;
  const safeSubject = escapeHtml(ticket.subject);
  const safeCategory = escapeHtml(ticketCategoryLabel(ticket.category));
  const safeTicketType = escapeHtml(ticketTypeLabel(ticket.ticketType));
  const safePriority = escapeHtml(priorityLabel(ticket.priority));
  const safeRequester = escapeHtml(ticket.requesterEmail);

  return sendEmail({
    to,
    subject: `New ticket: ${ticket.subject}`,
    text: `A new ticket was submitted.\n\n${ticket.subject}\nType: ${ticketTypeLabel(ticket.ticketType)}\nPriority: ${priorityLabel(ticket.priority)}\nCategory: ${ticketCategoryLabel(ticket.category)}\nFrom: ${ticket.requesterEmail}\n\nReview tickets: ${ticketUrl}`,
    html: `<p>A new ticket was submitted.</p><h2>${safeSubject}</h2><p>Type: ${safeTicketType}<br>Priority: <strong>${safePriority}</strong><br>Category: ${safeCategory}<br>From: ${safeRequester}</p><p><a href="${escapeHtml(ticketUrl)}">Review tickets</a></p>`,
  });
}

export async function notifyRequesterOfStatusChange(ticket: {
  id: string;
  subject: string;
  requesterEmail: string;
  status: string;
}): Promise<NotificationResult> {
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!appBaseUrl) {
    return "not_configured";
  }

  const ticketUrl = `${appBaseUrl}/staff/tickets/${ticket.id}`;
  const safeSubject = escapeHtml(ticket.subject);
  const statusLabel = ticketStatusLabel(ticket.status);
  const safeStatus = escapeHtml(statusLabel);

  return sendEmail({
    to: ticket.requesterEmail,
    subject: `Helpdesk request update: ${ticket.subject}`,
    text: `The status of your helpdesk request has changed to ${statusLabel}.\n\n${ticket.subject}\n\nView your request: ${ticketUrl}`,
    html: `<p>The status of your helpdesk request has changed.</p><h2>${safeSubject}</h2><p>New status: <strong>${safeStatus}</strong></p><p><a href="${escapeHtml(ticketUrl)}">View your request</a></p>`,
  });
}

export async function notifyTicketMessage(input: {
  id: string;
  subject: string;
  requesterEmail: string | null;
  authorIsStaff: boolean;
}): Promise<NotificationResult> {
  const recipient = input.authorIsStaff ? input.requesterEmail : process.env.HELPDESK_NOTIFICATION_EMAIL;
  const appBaseUrl = process.env.APP_BASE_URL?.replace(/\/$/, "");
  if (!recipient || !appBaseUrl) return "not_configured";

  const ticketUrl = `${appBaseUrl}/staff/tickets/${input.id}`;
  const safeSubject = escapeHtml(input.subject);
  const senderLabel = input.authorIsStaff ? "Helpdesk staff" : "The requester";
  return sendEmail({
    to: recipient,
    subject: `New reply on helpdesk request: ${input.subject}`,
    text: `${senderLabel} added a message to this support request.\n\n${input.subject}\n\nView the conversation: ${ticketUrl}`,
    html: `<p>${senderLabel} added a message to this support request.</p><h2>${safeSubject}</h2><p><a href="${escapeHtml(ticketUrl)}">View the conversation</a></p>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

