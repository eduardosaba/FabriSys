import { twilio } from 'twilio';

// Configuração do cliente Twilio
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function enviarWhatsAppPedido(para: string, mensagem: string, urlPDF?: string) {
  try {
    // Formatar número para formato internacional
    const numeroFormatado = para.startsWith('+') ? para : `+55${para.replace(/\D/g, '')}`;

    // Enviar mensagem
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${numeroFormatado}`,
      body: mensagem,
      mediaUrl: urlPDF ? [urlPDF] : undefined,
    });

    console.log('Mensagem WhatsApp enviada:', message.sid);
    return true;
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return false;
  }
}
