import twilio from 'twilio';

export async function enviarWhatsAppPedido(para: string, mensagem: string, urlPDF?: string) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    if (!accountSid || !authToken || !from) {
      console.warn('Twilio não configurado. Variáveis de ambiente ausentes.');
      return false;
    }
    const client = twilio(accountSid, authToken);
    // Formatar número para formato internacional
    const numeroFormatado = para.startsWith('+') ? para : `+55${para.replace(/\D/g, '')}`;

    // Enviar mensagem
    const message = await client.messages.create({
      from: `whatsapp:${from}`,
      to: `whatsapp:${numeroFormatado}`,
      body: mensagem,
      mediaUrl: urlPDF ? [urlPDF] : undefined,
    });

    console.log('Mensagem WhatsApp enviada:', message.sid);
    return true;
  } catch (err) {
    // Narrow de erro para log seguro
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Erro ao enviar WhatsApp:', msg);
    return false;
  }
}
