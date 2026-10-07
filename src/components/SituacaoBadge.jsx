import { SITUACOES } from '../lib/constantes.js'

export default function SituacaoBadge({ situacao = 'liberado' }) {
  const s = SITUACOES[situacao] || SITUACOES.liberado
  return (
    <span className={`${s.cor} inline-block rounded px-2 py-0.5 text-xs font-semibold text-papel`}>
      {s.rotulo}
    </span>
  )
}
