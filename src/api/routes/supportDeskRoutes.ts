import { Router, Request, Response } from 'express';

const router = Router();

interface TicketPayload {
  subject: string;
  category: string;
  studentName: string;
  priority?: string;
}

class SupportDeskService {
  private tickets = [
    {
      id: 'tkt-101',
      ticketNumber: 'YUH-2026-8901',
      subject: 'Scholarship Grant Disbursement Status Delay',
      category: 'SCHOLARSHIP_DISBURSEMENT',
      studentName: 'Sarah Jenkins',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
    },
  ];

  public getTickets() {
    return this.tickets;
  }

  public createTicket(payload: TicketPayload) {
    const newTicket = {
      id: `tkt_${Math.random().toString(36).substr(2, 9)}`,
      ticketNumber: `YUH-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: payload.subject,
      category: payload.category,
      studentName: payload.studentName,
      priority: payload.priority || 'MEDIUM',
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
    };
    this.tickets.push(newTicket);
    return newTicket;
  }
}

const supportService = new SupportDeskService();

router.get('/support/tickets', (req: Request, res: Response) => {
  res.json({ success: true, data: supportService.getTickets() });
});

router.post('/support/tickets', (req: Request, res: Response) => {
  const result = supportService.createTicket(req.body);
  res.json({ success: true, data: result });
});

export default router;
