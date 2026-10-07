import { useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'
import { ADVERSARIOS, JOGADORES, LOCAIS } from '../../data/seed.js'

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

export default function Importar() {
  const [estado, setEstado] = useState('parado') // parado | importando | feito | erro
  const [resultado, setResultado] = useState(null)

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
    </div>
  )
}
