import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const file = path.join(__dirname, 'mockdata', 'ficha.json');
  if (!fs.existsSync(file)) {
    console.error('Arquivo de mock não encontrado:', file);
    process.exit(1);
  }

  const body = JSON.parse(await fs.promises.readFile(file, 'utf8'));

  const url = process.env.API_URL || 'http://localhost:3000/api/fichas-tecnicas/create';

  console.log('Enviando mock para:', url);
  // Garantir slug único por execução para evitar conflitos de unique constraint
  if (body.slug_base) {
    body.slug_base = `${body.slug_base}-${Date.now()}`;
  }
  console.log('Payload:', JSON.stringify(body, null, 2));

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('\nStatus:', res.status);
    try {
      console.log('Resposta JSON:', JSON.parse(text));
    } catch {
      console.log('Resposta (texto):', text);
    }
  } catch (err) {
    console.error('Erro ao enviar requisição:', err?.message || err);
    console.error('Certifique-se de que o servidor local está rodando em http://localhost:3000');
    process.exit(1);
  }
}

main();
