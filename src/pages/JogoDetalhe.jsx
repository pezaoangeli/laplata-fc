import { Link, useParams } from 'react-router-dom'
import { CORES_RESULTADO, formatarData, porId, resultado, useJogo } from '../lib/jogos.js'
import { useCollection } from '../lib/useCollection.js'

const ROTULO_RES = { V: 'Vitória', E: 'Empate', D: 'Derrota' }

export default function JogoDetalhe() {
  const { id } = useParams()
  const jogo = useJogo(id)
  const jogadores = porId(useCollection('jogadores').dados)
  const adversarios = porId(useCollection('adversarios').dados)
  const locais = porId(useCollection('locais').dados)

  if (jogo === undefined) return <p className="p-6 text-texto-suave">Carregando…</p>
  if (jogo === null) return <p className="p-6">Jogo não encontrado. <Link to="/jogos" className="underline">Ver todos os jogos</Link></p>

  const adv = adversarios[jogo.adversarioId]
  const s = jogo.sumula || {}
  const nome = (jid) => jogadores[jid]?.nome || 'Jogador removido'
  const res = resultado(jogo.placar)
  const listaContagem = (mapa = {}) =>
    Object.entries(mapa).sort((a, b) => b[1] - a[1] || nome(a[0]).localeCompare(nome(b[0]), 'pt-BR'))
  const presentes = (s.presentes || []).map((jid) => ({ id: jid, ...jogadores[jid] }))
    .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  const fixos = presentes.filter((p) => p.tipo !== 'convidado')
  const convidados = presentes.filter((p) => p.tipo === 'convidado')

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/jogos" className="text-sm font-semibold text-texto-suave hover:text-preto">Voltar para os jogos</Link>

      <header className="mt-3 overflow-hidden rounded-lg border-2 border-preto">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          <div className="bg-papel px-3 py-5 text-center font-display text-2xl font-bold sm:text-3xl">La Plata</div>
          <div className="bg-preto px-4 py-5 font-display text-4xl font-extrabold tabular-nums text-papel sm:text-5xl">
            {jogo.placar ? `${jogo.placar.nos} x ${jogo.placar.eles}` : 'x'}
          </div>
          <div className="bg-sangue px-3 py-5 text-center font-display text-2xl font-bold text-papel sm:text-3xl">{adv?.nome || 'A definir'}</div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t-2 border-preto px-3 py-2 text-sm">
          {res && <span className={`${CORES_RESULTADO[res]} rounded px-2 py-0.5 font-semibold`}>{ROTULO_RES[res]}</span>}
          <span>{formatarData(jogo.data)}{jogo.horario ? `, ${jogo.horario.replace(':00', 'h')}` : ''}</span>
          <span>{jogo.mando === 'casa' ? 'Em casa' : 'Fora'}{locais[jogo.localId] ? `, ${locais[jogo.localId].nome}` : ''}</span>
          {adv?.cidade && <span>{adv.nome} é de {adv.cidade}</span>}
        </div>
      </header>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Bloco titulo="Gols">
          {listaContagem(s.gols).map(([jid, n]) => <Item key={jid} nome={nome(jid)} valor={n > 1 ? `${n} gols` : '1 gol'} />)}
        </Bloco>
        <Bloco titulo="Assistências">
          {listaContagem(s.assistencias).map(([jid, n]) => <Item key={jid} nome={nome(jid)} valor={n > 1 ? `${n}` : ''} />)}
        </Bloco>
        <Bloco titulo={(s.melhores || []).length > 1 ? 'Melhores em campo' : 'Melhor em campo'}>
          {(s.melhores || []).map((jid) => <Item key={jid} nome={nome(jid)} />)}
        </Bloco>
        <Bloco titulo="Uniforme e água">
          {(s.uniforme || []).map((jid) => <Item key={`u${jid}`} nome={nome(jid)} valor="levou o uniforme" />)}
          {(s.agua || []).map((jid) => <Item key={`a${jid}`} nome={nome(jid)} valor="levou a água" />)}
        </Bloco>
      </div>

      <section className="mt-6">
        <h2 className="font-display text-2xl font-bold">Quem jogou ({presentes.length})</h2>
        <p className="mt-1">{fixos.map((p) => p.nome).join(', ') || 'Ninguém registrado.'}</p>
        {convidados.length > 0 && (
          <p className="mt-1 text-texto-suave">Convidados: {convidados.map((p) => p.nome).join(', ')}</p>
        )}
      </section>
    </div>
  )
}

function Bloco({ titulo, children }) {
  const vazio = !children || (Array.isArray(children) && children.flat().filter(Boolean).length === 0)
  return (
    <section>
      <h2 className="font-display text-2xl font-bold">{titulo}</h2>
      {vazio ? <p className="mt-1 text-texto-suave">Nada registrado.</p> : <ul className="mt-1 space-y-1">{children}</ul>}
    </section>
  )
}

function Item({ nome, valor }) {
  return (
    <li className="flex justify-between gap-3 border-b border-linha py-1">
      <span className="font-semibold">{nome}</span>
      {valor && <span className="text-texto-suave">{valor}</span>}
    </li>
  )
}
