import { useMemo, useState } from 'react'
import { useTodosJogos } from '../lib/jogos.js'
import { montarPremios, usePremiacoesManuais } from '../lib/premiacoes.js'
import { imagemPremiacoes } from '../lib/imagem.js'
import { temporadaAtual } from '../lib/temporadas.js'
import { useCollection } from '../lib/useCollection.js'
import SeletorTemporada from '../components/SeletorTemporada.jsx'
import BotaoImagem from '../components/BotaoImagem.jsx'

export default function Premiacoes() {
  const [temporada, setTemporada] = useState(temporadaAtual())
  const [convidados, setConvidados] = useState(false)
  const { jogos, carregando } = useTodosJogos()
  const { dados: jogadores } = useCollection('jogadores')
  const manuais = usePremiacoesManuais(temporada)

  const premios = useMemo(
    () => montarPremios({ jogos: jogos.filter((j) => j.temporada === temporada), jogadores, manuais, incluirConvidados: convidados }),
    [jogos, jogadores, manuais, temporada, convidados]
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-5xl font-extrabold">Premiações</h1>
        <SeletorTemporada valor={temporada} onChange={setTemporada} />
      </div>
      <p className="mt-1 text-texto-suave">Calculadas a partir das súmulas. Valem só os fixos, a não ser que você inclua os convidados.</p>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={convidados} onChange={(e) => setConvidados(e.target.checked)} />
        Incluir convidados
      </label>

      {carregando ? <p className="mt-6 text-texto-suave">Carregando…</p> : (
        <>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {premios.map((p) => (
              <li key={p.titulo} className="overflow-hidden rounded-lg border-2 border-preto">
                <p className="bg-sangue px-3 py-1.5 font-display text-lg font-bold text-papel">{p.titulo}</p>
                <div className="px-3 py-3">
                  <p className="font-display text-3xl font-extrabold leading-tight">{p.nomes.join(', ') || 'Ninguém ainda'}</p>
                  {p.valor && <p className="text-texto-suave">{p.valor}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <BotaoImagem nomeArquivo={`laplata-premiacoes-${temporada}.png`}
              gerar={() => imagemPremiacoes({ temporada, premios: premios.filter((p) => p.nomes.length) })} />
          </div>
        </>
      )}
    </div>
  )
}
