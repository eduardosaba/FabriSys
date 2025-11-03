import nodemailer from 'nodemailer';

// Configuração do transportador de email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarEmailPedido(
  to: string,
  assunto: string,
  html: string,
  anexoPDF?: Buffer
) {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject: assunto,
      html,
      attachments: anexoPDF
        ? [
            {
              filename: 'pedido-compra.pdf',
              content: anexoPDF,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });

    console.log('Email enviado:', info.messageId);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
}
