import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface SendEmailPayload {
  to?: string;
  subject?: string;
  body?: string;
  clientName?: string;
  studioName?: string;
  milestonePercent?: number;
  bookingUrl?: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildEmailHtml(payload: Required<Pick<SendEmailPayload, 'subject' | 'body' | 'clientName' | 'studioName'>> & {
  milestonePercent: number;
  bookingUrl?: string;
}): string {
  const safeStudio = escapeHtml(payload.studioName);
  const safeClient = escapeHtml(payload.clientName);
  const safeBody = escapeHtml(payload.body).replace(/\n/g, '<br />');
  const safeUrl = payload.bookingUrl ? escapeHtml(payload.bookingUrl) : '';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #1e293b;">
      <div style="padding: 24px 28px; background: linear-gradient(135deg, #064e3b 0%, #0f172a 100%); border-bottom: 1px solid #1e293b;">
        <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: #34d399; font-weight: 700;">
          Cartão Fidelidade · Marco de ${payload.milestonePercent}%
        </div>
        <h1 style="margin: 8px 0 0; font-size: 20px; color: #ffffff;">${safeStudio}</h1>
      </div>
      <div style="padding: 28px;">
        <p style="margin: 0 0 12px; font-size: 15px; color: #e2e8f0;">Olá, <strong>${safeClient}</strong>!</p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #cbd5e1;">${safeBody}</p>
        ${
          safeUrl
            ? `<a href="${safeUrl}" style="display: inline-block; padding: 12px 20px; background: #10b981; color: #022c22; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 10px;">Agendar Novo Serviço</a>`
            : ''
        }
      </div>
      <div style="padding: 16px 28px; background: #020617; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b;">
        Notificação automática do programa de fidelidade de ${safeStudio}.
      </div>
    </div>
  `;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      emailProvider: process.env.RESEND_API_KEY
        ? 'resend'
        : process.env.EMAIL_WEBHOOK_URL
        ? 'webhook'
        : 'unconfigured',
    });
  });

  app.post('/api/loyalty-notifications/send-email', async (req: Request, res: Response) => {
    const body = (req.body || {}) as SendEmailPayload;
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const textBody = typeof body.body === 'string' ? body.body.trim() : '';
    const clientName = typeof body.clientName === 'string' ? body.clientName.trim() : 'Cliente';
    const studioName = typeof body.studioName === 'string' ? body.studioName.trim() : 'Studio';
    const milestonePercent = Number(body.milestonePercent) || 50;
    const bookingUrl =
      typeof body.bookingUrl === 'string' && body.bookingUrl.trim()
        ? body.bookingUrl.trim()
        : process.env.APP_URL || '';

    if (!to || !to.includes('@')) {
      res.status(400).json({
        delivered: false,
        reason: 'missing_email',
        detail: 'Cliente sem endereço de e-mail válido cadastrado.',
      });
      return;
    }

    if (!subject || !textBody) {
      res.status(400).json({
        delivered: false,
        reason: 'invalid_payload',
        detail: 'Assunto e conteúdo do e-mail são obrigatórios.',
      });
      return;
    }

    const html = buildEmailHtml({
      subject,
      body: textBody,
      clientName,
      studioName,
      milestonePercent,
      bookingUrl,
    });

    const resendKey = process.env.RESEND_API_KEY?.trim();
    const webhookUrl = process.env.EMAIL_WEBHOOK_URL?.trim();

    if (resendKey) {
      try {
        const fromAddress = process.env.EMAIL_FROM?.trim() || `${studioName} <onboarding@resend.dev>`;
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [to],
            subject,
            text: textBody,
            html,
          }),
        });

        const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
        if (!response.ok) {
          res.status(502).json({
            delivered: false,
            reason: 'provider_error',
            detail: data?.message || `Resend retornou HTTP ${response.status}`,
          });
          return;
        }

        res.json({
          delivered: true,
          provider: 'resend',
          messageId: data?.id || null,
          detail: `E-mail enviado via Resend para ${to}.`,
        });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao conectar ao provedor de e-mail.';
        res.status(502).json({
          delivered: false,
          reason: 'network_error',
          detail: message,
        });
        return;
      }
    }

    if (webhookUrl) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to,
            subject,
            text: textBody,
            html,
            clientName,
            studioName,
            milestonePercent,
          }),
        });

        if (!response.ok) {
          res.status(502).json({
            delivered: false,
            reason: 'webhook_error',
            detail: `Webhook retornou HTTP ${response.status}`,
          });
          return;
        }

        res.json({
          delivered: true,
          provider: 'webhook',
          detail: `E-mail despachado via Webhook para ${to}.`,
        });
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha no envio via webhook.';
        res.status(502).json({
          delivered: false,
          reason: 'network_error',
          detail: message,
        });
        return;
      }
    }

    res.json({
      delivered: false,
      reason: 'smtp_not_configured',
      detail: 'Provedor SMTP/Resend não configurado no servidor (.env). E-mail preparado no registro de disparos.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
