import { useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { ADVERSARIOS, JOGADORES, LOCAIS } from '../../data/seed.js'
import { JOGOS_2026 } from '../../data/jogos2026.js'
import { JOGOS_2027 } from '../../data/jogos2027.js'

// Adiciona só o que ainda não existe (compara pelo nome), então pode ser rodado mais de uma vez sem duplicar.
async function importarCadastros() {
  const nomesExistentes = async (colecao) =>
    new Set((await getDocs(collection(db, colecao))).docs.map((d) => (d.data().nome || '').toLowerCase()))

  const [jog, adv, loc] = await Promise.all([
    nomesExistentes('jogadores'),
    nomesExistentes('adversarios'),
    nomesExistentes('locais'),
  ])

  const lote = writeBatch(db)
  const agora = serverTimestamp()
  const resultado = { jogadores: 0, adversarios: 0, locais: 0 }

  for (const j of JOGADORES) {
    if (jog.has(j.nome.toLowerCase())) continue
    lote.set(doc(collection(db, 'jogadores')), { posicao: '', ativo: true, ...j, criadoEm: agora, atualizadoEm: agora })
    resultado.jogadores++
  }
  for (const a of ADVERSARIOS) {
    if (adv.has(a.nome.toLowerCase())) continue
    const ref = doc(collection(db, 'adversarios'))
    lote.set(ref, { cidade: '', ...a, atualizadoEm: agora })
    lote.set(doc(db, 'adversariosPrivado', ref.id), { situacao: 'liberado', motivos: [], observacao: '', atualizadoEm: agora })
    resultado.adversarios++
  }
  for (const l of LOCAIS) {
    if (loc.has(l.nome.toLowerCase())) continue
    lote.set(doc(collection(db, 'locais')), { cidade: '', ...l, atualizadoEm: agora })
    resultado.locais++
  }

  await lote.commit()
  return resultado
}


// Importa o calendário 2026 com as súmulas da planilha. Cada jogo tem um ID fixo (imp-AAAA-MM-DD),
// então rodar de novo não duplica nem sobrescreve o que já foi editado no site.
async function importarJogos(lista) {
  const ler = async (c) => (await getDocs(collection(db, c))).docs.map((d) => ({ id: d.id, ...d.data() }))
  const [jogadores, adversarios, locais, jogos] = await Promise.all([ler('jogadores'), ler('adversarios'), ler('locais'), ler('jogos')])
  const mapa = (lista) => Object.fromEntries(lista.map((i) => [(i.nome || '').toLowerCase(), i.id]))
  const idJog = mapa(jogadores), idAdv = mapa(adversarios), idLoc = mapa(locais)
  const existentes = new Set(jogos.map((j) => j.id))

  const lote = writeBatch(db)
  const agora = serverTimestamp()
  const faltando = { jogadores: [], adversarios: [], locais: [] }

  const garantir = (nome, ids, colecao, extra, lista) => {
    if (!nome) return null
    const chave = nome.toLowerCase()
    if (!ids[chave]) {
      const ref = doc(collection(db, colecao))
      lote.set(ref, { nome, ...extra, atualizadoEm: agora })
      if (colecao === 'adversarios')
        lote.set(doc(db, 'adversariosPrivado', ref.id), { situacao: 'liberado', motivos: [], observacao: '', atualizadoEm: agora })
      ids[chave] = ref.id
      lista.push(nome)
    }
    return ids[chave]
  }
  const jog = (n) => garantir(n, idJog, 'jogadores', { tipo: 'convidado', posicao: '', ativo: true }, faltando.jogadores)
  const mapaIds = (m) => Object.fromEntries(Object.entries(m).map(([n, v]) => [jog(n), v]))

  let criados = 0
  for (const j of lista) {
    const id = `imp-${j.data}`
    if (existentes.has(id)) continue
    const s = j.sumula
    lote.set(doc(db, 'jogos', id), {
      data: j.data,
      temporada: Number(j.data.slice(0, 4)),
      horario: j.horario,
      mando: j.mando,
      status: j.status,
      tipo: j.tipo || 'jogo',
      titulo: j.titulo || '',
      adversarioId: garantir(j.adversario, idAdv, 'adversarios', { cidade: '' }, faltando.adversarios),
      localId: garantir(j.local, idLoc, 'locais', { cidade: '' }, faltando.locais),
      placar: j.placar || null,
      sumula: s
        ? {
            presentes: s.presentes.map(jog),
            gols: mapaIds(s.gols),
            assistencias: mapaIds(s.assistencias),
            melhores: s.melhores.map(jog),
            uniforme: s.uniforme.map(jog),
            agua: s.agua.map(jog),
          }
        : null,
      criadoEm: agora,
      atualizadoEm: agora,
    })
    criados++
  }
  await lote.commit()
  return { criados, ignorados: lista.length - criados, faltando }
}

// Recebe uma lista colada pelo admin (nunca fica no código do site).
// Time existente (mesmo nome): atualiza só os campos informados. Time novo: é criado.
async function importarControle(lista) {
  const advs = (await getDocs(collection(db, 'adversarios'))).docs.map((d) => ({ id: d.id, ...d.data() }))
  const porNome = Object.fromEntries(advs.map((a) => [(a.nome || '').toLowerCase(), a.id]))
  const lote = writeBatch(db)
  const agora = serverTimestamp()
  const res = { atualizados: [], criados: [] }
  for (const item of lista) {
    const nome = (item.nome || '').trim()
    if (!nome) continue
    let id = porNome[nome.toLowerCase()]
    const publico = { atualizadoEm: agora }
    if (item.cidade) publico.cidade = item.cidade
    if (!id) {
      id = doc(collection(db, 'adversarios')).id
      lote.set(doc(db, 'adversarios', id), { nome, cidade: item.cidade || '', atualizadoEm: agora })
      res.criados.push(nome)
    } else {
      lote.set(doc(db, 'adversarios', id), publico, { merge: true })
      res.atualizados.push(nome)
    }
    const priv = { atualizadoEm: agora }
    for (const c of ['situacao', 'motivos', 'observacao', 'contatoNome', 'contatoTelefone'])
      if (item[c] !== undefined) priv[c] = item[c]
    lote.set(doc(db, 'adversariosPrivado', id), { situacao: 'liberado', motivos: [], ...priv }, { merge: true })
  }
  await lote.commit()
  return res
}

export default function Importar() {
  const [estado, setEstado] = useState('parado') // parado | importando | feito | erro
  const [resultado, setResultado] = useState(null)
  const [textoControle, setTextoControle] = useState('')
  const [estadoCtrl, setEstadoCtrl] = useState('')
  async function rodarControle() {
    let lista
    try {
      lista = JSON.parse(textoControle)
      if (!Array.isArray(lista)) throw new Error()
    } catch {
      return setEstadoCtrl('O texto colado não está no formato esperado. Copie de novo, inteiro, o bloco que recebeu.')
    }
    setEstadoCtrl('importando')
    try {
      const r = await importarControle(lista)
      setEstadoCtrl(`Pronto: ${r.atualizados.length} times atualizados${r.criados.length ? ` e ${r.criados.length} criados (${r.criados.join(', ')})` : ''}.`)
      setTextoControle('')
    } catch {
      setEstadoCtrl('A importação falhou. Confira se você está logada com uma conta admin.')
    }
  }
  const [estado27, setEstado27] = useState('parado')
  const [res27, setRes27] = useState(null)
  async function rodar27() {
    setEstado27('importando')
    try { setRes27(await importarJogos(JOGOS_2027)); setEstado27('feito') } catch { setEstado27('erro') }
  }
  const [estadoJogos, setEstadoJogos] = useState('parado')
  const [resJogos, setResJogos] = useState(null)

  async function rodarJogos() {
    setEstadoJogos('importando')
    try {
      setResJogos(await importarJogos(JOGOS_2026))
      setEstadoJogos('feito')
    } catch {
      setEstadoJogos('erro')
    }
  }

  async function rodar() {
    setEstado('importando')
    try {
      setResultado(await importarCadastros())
      setEstado('feito')
    } catch {
      setEstado('erro')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl font-bold">Importar dados</h1>
      <p className="mt-2">
        Traz os cadastros da planilha e do calendário de 2026: {JOGADORES.length} jogadores, {ADVERSARIOS.length} adversários
        e {LOCAIS.length} campos. Quem já estiver cadastrado com o mesmo nome é ignorado, então dá para rodar de novo sem duplicar.
      </p>
      <p className="mt-2 text-texto-suave">
        Todos os adversários entram como liberados e sem cidade. Depois é só completar pela aba Adversários.
      </p>

      <button onClick={rodar} disabled={estado === 'importando'}
        className="mt-5 rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
        {estado === 'importando' ? 'Importando…' : 'Importar cadastros'}
      </button>

      {estado === 'feito' && (
        <p className="mt-4 rounded-md bg-papel p-3" role="status">
          Importação concluída: {resultado.jogadores} jogadores, {resultado.adversarios} adversários e {resultado.locais} campos adicionados.
        </p>
      )}
      {estado === 'erro' && (
        <p className="mt-4 font-semibold text-sangue-escuro" role="alert">
          A importação falhou. Confira se seu login é admin e se as regras do Firestore foram publicadas.
        </p>
      )}

      <hr className="my-8 border-linha" />

      <h2 className="font-display text-3xl font-bold">Jogos de 2026</h2>
      <p className="mt-2">
        Traz os {JOGOS_2026.length} sábados do calendário de 2026, com as súmulas dos {JOGOS_2026.filter((j) => j.sumula).length} jogos
        registrados na planilha (até 16/05). Rode depois de importar os cadastros.
      </p>
      <p className="mt-2 text-texto-suave">
        Jogos já importados são ignorados, então nada que você editou no site é sobrescrito.
      </p>
      <button onClick={rodarJogos} disabled={estadoJogos === 'importando'}
        className="mt-5 rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
        {estadoJogos === 'importando' ? 'Importando…' : 'Importar jogos de 2026'}
      </button>
      {estadoJogos === 'feito' && (
        <div className="mt-4 rounded-md bg-papel p-3" role="status">
          <p>Importação concluída: {resJogos.criados} jogos adicionados{resJogos.ignorados ? `, ${resJogos.ignorados} já existiam` : ''}.</p>
          {Object.entries(resJogos.faltando).filter(([, l]) => l.length).map(([tipo, l]) => (
            <p key={tipo} className="text-sm text-texto-suave">Também foram criados em {tipo}: {l.join(', ')}.</p>
          ))}
        </div>
      )}
      {estadoJogos === 'erro' && (
        <p className="mt-4 font-semibold text-sangue-escuro" role="alert">
          A importação falhou. Confira se você está logada com uma conta admin e tente de novo.
        </p>
      )}

      <hr className="my-8 border-linha" />

      <h2 className="font-display text-3xl font-bold">Calendário de 2027</h2>
      <p className="mt-2">
        Traz os {JOGOS_2027.length} sábados de 2027 da planilha da organização: {JOGOS_2027.filter((j) => j.adversario).length} jogos marcados,
        {' '}{JOGOS_2027.filter((j) => !j.adversario && !j.tipo).length} datas livres, o Grenal e a Confraternização.
        Times e campos novos são cadastrados automaticamente.
      </p>
      <button onClick={rodar27} disabled={estado27 === 'importando'}
        className="mt-5 rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
        {estado27 === 'importando' ? 'Importando…' : 'Importar calendário de 2027'}
      </button>
      {estado27 === 'feito' && (
        <div className="mt-4 rounded-md bg-papel p-3" role="status">
          <p>Importação concluída: {res27.criados} datas adicionadas{res27.ignorados ? `, ${res27.ignorados} já existiam` : ''}.</p>
          {Object.entries(res27.faltando).filter(([, l]) => l.length).map(([tipo, l]) => (
            <p key={tipo} className="text-sm text-texto-suave">Também foram criados em {tipo}: {l.join(', ')}.</p>
          ))}
        </div>
      )}
      {estado27 === 'erro' && (
        <p className="mt-4 font-semibold text-sangue-escuro" role="alert">A importação falhou. Confira se você está logada com uma conta admin e tente de novo.</p>
      )}

      <hr className="my-8 border-linha" />

      <h2 className="font-display text-3xl font-bold">Controle de adversários (colar dados)</h2>
      <p className="mt-2">
        Para cadastrar vários times de uma vez, com situação, motivos, observação e contato. Cole o bloco de dados e importe.
        Esses dados vão direto para a parte do banco que só admins leem e não ficam no código do site.
      </p>
      <textarea rows={6} className="campo mt-3 font-mono text-xs" value={textoControle} onChange={(e) => { setTextoControle(e.target.value); setEstadoCtrl('') }}
        placeholder='[{"nome": "Time", "situacao": "nao_marcar", "motivos": ["briga"], "contatoNome": "Fulano", "contatoTelefone": "999999999"}]'
        aria-label="Dados dos adversários" />
      <button onClick={rodarControle} disabled={!textoControle.trim() || estadoCtrl === 'importando'}
        className="mt-3 rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
        {estadoCtrl === 'importando' ? 'Importando…' : 'Importar controle'}
      </button>
      {estadoCtrl && estadoCtrl !== 'importando' && <p className="mt-3" role="status">{estadoCtrl}</p>}
    </div>
  )
}
