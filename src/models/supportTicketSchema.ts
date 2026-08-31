/**
 * Support Ticket Schema — Pure TypeScript (no Mongoose dependency)
 */

export type TicketPriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type TicketStatus = 'RESOLVED' | 'IN_PROGRESS' | 'PENDING_ADMIN';

export interface ISupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  studentName: string;
  priority: TicketPriority;
  status: TicketStatus;
  aiSuggestedSolution?: string;
  createdAt: string;
  updatedAt: string;
}

const TICKET_PRIORITIES: readonly TicketPriority[] = ['HIGH', 'MEDIUM', 'LOW'];
const TICKET_STATUSES: readonly TicketStatus[] = ['RESOLVED', 'IN_PROGRESS', 'PENDING_ADMIN'];

export function createSupportTicket(
  partial: Pick<ISupportTicket, 'ticketNumber' | 'subject' | 'category' | 'studentName'> &
    Partial<Omit<ISupportTicket, 'ticketNumber' | 'subject' | 'category' | 'studentName'>>,
): ISupportTicket {
  const now = new Date().toISOString();
  return {
    id: partial.id ?? `st_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    ticketNumber: partial.ticketNumber,
    subject: partial.subject,
    category: partial.category,
    studentName: partial.studentName,
    priority: partial.priority ?? 'MEDIUM',
    status: partial.status ?? 'IN_PROGRESS',
    aiSuggestedSolution: partial.aiSuggestedSolution,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  };
}

export function isValidTicketPriority(value: string): value is TicketPriority {
  return (TICKET_PRIORITIES as readonly string[]).includes(value);
}

export function isValidTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function validateSupportTicket(
  data: Record<string, unknown>,
): { valid: true; ticket: ISupportTicket } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (typeof data.ticketNumber !== 'string' || data.ticketNumber.trim().length === 0) errors.push('ticketNumber is required');
  if (typeof data.subject !== 'string' || data.subject.trim().length === 0) errors.push('subject is required');
  if (typeof data.category !== 'string' || data.category.trim().length === 0) errors.push('category is required');
  if (typeof data.studentName !== 'string' || data.studentName.trim().length === 0) errors.push('studentName is required');

  if (data.priority !== undefined && !isValidTicketPriority(String(data.priority))) {
    errors.push(`priority must be one of: ${TICKET_PRIORITIES.join(', ')}`);
  }
  if (data.status !== undefined && !isValidTicketStatus(String(data.status))) {
    errors.push(`status must be one of: ${TICKET_STATUSES.join(', ')}`);
  }

  if (errors.length > 0) return { valid: false, errors };

  return {
    valid: true,
    ticket: createSupportTicket({
      ticketNumber: data.ticketNumber as string,
      subject: data.subject as string,
      category: data.category as string,
      studentName: data.studentName as string,
      priority: data.priority as TicketPriority | undefined,
      status: data.status as TicketStatus | undefined,
      aiSuggestedSolution: data.aiSuggestedSolution as string | undefined,
    }),
  };
}
