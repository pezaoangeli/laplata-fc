export const POSICOES = ['Goleiro', 'Defesa', 'Ala', 'Meio-campo', 'Ataque']

export const SITUACOES = {
  liberado: { rotulo: 'Liberado', cor: 'bg-liberado' },
  cautela: { rotulo: 'Com cautela', cor: 'bg-cautela' },
  nao_marcar: { rotulo: 'Não marcar', cor: 'bg-bloqueado' },
  parado: { rotulo: 'Time parado', cor: 'bg-texto-suave' },
}

// Situações que exigem motivo (time parado não é problema de comportamento)
export const PEDE_MOTIVO = ['cautela', 'nao_marcar']

export const MOTIVOS = {
  bate: 'Bate muito',
  briga: 'Brigas ou confusão',
  perigoso: 'Perigoso',
  reclama: 'Reclama demais (falta, choradeira)',
  desorganizado: 'Desorganizados',
  outro: 'Outro',
}

// Telefone em link do WhatsApp. Sem DDD, assume 51.
export function linkWhatsApp(telefone) {
  const d = (telefone || '').replace(/\D/g, '')
  if (!d) return null
  const completo = d.length <= 9 ? `5551${d}` : d.length <= 11 ? `55${d}` : d
  return `https://wa.me/${completo}`
}
