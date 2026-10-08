import { CORES_RESULTADO, formatarData, resultado, situacaoJogo, tipoJogo } from '../lib/jogos.js'

const ROTULO_SITUACAO = {
  cancelado: 'Cancelado',
  aguardando: 'Aguardando súmula',
  agendado: '',
}

// Uma linha do calendário. "acoes" permite ao painel colocar botões no fim.
export default function LinhaJogo({ jogo, adversario, local, acoes, destaque = false }) {
  const sit = situacaoJogo(jogo)
  const res = resultado(jogo.placar)
  return (
    <div className={`flex items-center gap-3 px-3 py-3 ${sit === 'cancelado' ? 'opacity-50' : ''} ${destaque ? 'bg-sangue/5' : ''}`}>
      <div className="w-20 shrink-0">
        <p className="font-display text-lg font-bold leading-tight">{formatarData(jogo.data, { diaSemana: false })}</p>
        <p className="text-sm text-texto-suave">{jogo.horario ? jogo.horario.replace(':00', 'h') : 'horário a definir'}</p>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${sit === 'cancelado' ? 'line-through' : ''}`}>
          {tipoJogo(jogo) === 'jogo' ? adversario?.nome || 'Adversário a definir' : jogo.titulo || 'Evento'}
          {tipoJogo(jogo) !== 'jogo' && <span className="ml-2 rounded bg-sangue px-1.5 py-0.5 align-middle text-xs font-semibold text-papel">{jogo.tipo === 'interno' ? 'interno' : 'evento'}</span>}
        </p>
        <p className="truncate text-sm text-texto-suave">
          {tipoJogo(jogo) === 'evento' ? (local ? local.nome : 'Local a definir') : `${jogo.mando === 'casa' ? 'Em casa' : 'Fora'}${local ? `, ${local.nome}` : ''}`}
          {adversario?.cidade ? ` (time de ${adversario.cidade})` : ''}
        </p>
      </div>
      {sit === 'realizado' && jogo.placar ? (
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold tabular-nums">{jogo.placar.nos} x {jogo.placar.eles}</span>
          <span className={`${CORES_RESULTADO[res]} inline-flex h-7 w-7 items-center justify-center rounded font-display font-bold`}>{res}</span>
        </div>
      ) : (
        ROTULO_SITUACAO[sit] && <span className="text-right text-sm font-semibold text-texto-suave">{ROTULO_SITUACAO[sit]}</span>
      )}
      {acoes}
    </div>
  )
}
