import { Worker, Job } from "bullmq";
import { connection } from "../queues/connection";
import { EmailJobData } from "../queues/emailQueue";
import nodemailer from "nodemailer";
import { logger } from "../utils/logger";

// Retrieve SMTP settings from environment with secure defaults
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "YuvaHub Alerts <noreply@yuvahub.xyz>";

// Initialize transporter only if credentials are provided, else fallback to mock log
let transporter: nodemailer.Transporter | null = null;
if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // True for port 465, false otherwise
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
  logger.info(`[EmailWorker] SMTP Transporter configured for host: ${smtpHost}`);
} else {
  logger.info("[EmailWorker] SMTP credentials missing. Running in simulated fallback mode.");
}

export const emailWorker = new Worker<EmailJobData>(
  "emailQueue",
  async (job: Job<EmailJobData>) => {
    const { to, subject, body, html } = job.data;
    logger.info(`[EmailWorker] Processing job ${job.id} for ${to}`);

    if (transporter) {
      // Send real email via SMTP
      try {
        await transporter.sendMail({
          from: smtpFrom,
          to,
          subject,
          text: body,
          html: html || `<div style="font-family: sans-serif; padding: 20px;">${body}</div>`
        });
        logger.info(`[EmailWorker] Successfully sent email via SMTP to ${to}`);
      } catch (smtpErr: any) {
        logger.error({ err: smtpErr, recipient: to }, "SMTP delivery failed");
        throw smtpErr; // Let BullMQ handle retry mechanism
      }
    } else {
      // Simulated email sending delay (fallback)
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      // Simulate random failure for resiliency testing (10% chance)
      if (Math.random() < 0.1) {
        throw new Error(`Simulated mock email delivery failure for job ${job.id}`);
      }
      
      logger.info(`[EmailWorker] Mock Sent: To: ${to} | Subject: ${subject} | Body: ${body}`);
    }
  },
  { connection: connection as any }
);

emailWorker.on("completed", (job) => {
  logger.info(`[EmailWorker] Job ${job.id} completed successfully`);
});

emailWorker.on("failed", (job, err) => {
  logger.error({ err, jobId: job?.id }, "Job failed");
  
  if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
    logger.error({ jobId: job.id }, "Job exhausted all retries; moving to DLQ");
  }
});

let emailWorkerErrorLogged = false;
emailWorker.on("error", (err) => {
  if (!emailWorkerErrorLogged) {
    logger.warn('[EmailWorker] Redis connection offline. Worker listening paused.');
    emailWorkerErrorLogged = true;
  }
});
