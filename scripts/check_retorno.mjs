#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_KEY (ou NEXT_PUBLIC_SUPABASE_*) no ambiente');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const argv = process.argv.slice(2);
const cmd = argv[0];

async function listarPendentes(pdvLocalId) {
  const { data, error } = await supabase
    .from('envios_historico')
    .select('*')
    .eq('local_origem_id', pdvLocalId)
    .eq('status', 'retorno_pendente')
    .order('enviado_em', { ascending: false })
    .limit(50);
  if (error) return console.error('Erro listarPendentes:', error);
  console.log(JSON.stringify(data, null, 2));
}

async function verificarEnvio(envioId) {
  const { data, error } = await supabase.from('envios_historico').select('*').eq('id', envioId).maybeSingle();
  if (error) return console.error('Erro verificarEnvio:', error);
  console.log(JSON.stringify(data, null, 2));
}

async function verificarEstoque(prodId, pdvLocalId, fabLocalId) {
  const { data, error } = await supabase
    .from('estoque_produtos')
    .select('local_id,produto_id,quantidade,updated_at')
    .in('local_id', [pdvLocalId, fabLocalId])
    .eq('produto_id', prodId);
  if (error) return console.error('Erro verificarEstoque:', error);
  console.log(JSON.stringify(data, null, 2));
}

async function verificarMovimentacoes(prodId, pdvLocalId, fabLocalId) {
  const { data, error } = await supabase
    .from('movimentacoes_estoque')
    .select('id,produto_id,local_id,quantidade,tipo,observacao,created_at')
    .eq('produto_id', prodId)
    .in('local_id', [pdvLocalId, fabLocalId])
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return console.error('Erro verificarMovimentacoes:', error);
  console.log(JSON.stringify(data, null, 2));
}

async function confirmarRetorno(envioId, userId) {
  const { data, error } = await supabase.rpc('confirmar_retorno_fabrica', { p_envio_id: envioId, p_recebedor: userId });
  if (error) return console.error('Erro confirmarRetorno:', error);
  console.log('Resultado:', data);
}

async function rejeitarRetorno(envioId, userId, motivo) {
  const { data, error } = await supabase.rpc('rejeitar_retorno_fabrica', { p_envio_id: envioId, p_recebedor: userId, p_motivo: motivo });
  if (error) return console.error('Erro rejeitarRetorno:', error);
  console.log('Resultado:', data);
}

async function help() {
  console.log('Uso:
  node scripts/check_retorno.mjs pendentes <PDV_LOCAL_ID>
  node scripts/check_retorno.mjs envio <ENVIO_ID>
  node scripts/check_retorno.mjs estoque <PROD_ID> <PDV_LOCAL_ID> <FAB_LOCAL_ID>
  node scripts/check_retorno.mjs movs <PROD_ID> <PDV_LOCAL_ID> <FAB_LOCAL_ID>
  node scripts/check_retorno.mjs confirmar <ENVIO_ID> <USER_ID>
  node scripts/check_retorno.mjs rejeitar <ENVIO_ID> <USER_ID> [motivo]
');
}

(async () => {
  try {
    switch (cmd) {
      case 'pendentes':
        await listarPendentes(argv[1]);
        break;
      case 'envio':
        await verificarEnvio(argv[1]);
        break;
      case 'estoque':
        await verificarEstoque(argv[1], argv[2], argv[3]);
        break;
      case 'movs':
        await verificarMovimentacoes(argv[1], argv[2], argv[3]);
        break;
      case 'confirmar':
        await confirmarRetorno(argv[1], argv[2]);
        break;
      case 'rejeitar':
        await rejeitarRetorno(argv[1], argv[2], argv[3] || '');
        break;
      default:
        await help();
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
