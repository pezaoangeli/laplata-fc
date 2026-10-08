import { useState } from 'react'
import { Timestamp, collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase.js'

const COLECOES = ['jogadores', 'adversarios', 'adversariosPrivado', 'locais', 'jogos', 'premiacoes', 'admins']
// admins não é restaurado: as regras só permitem criar admins pelo console
const RESTAURAVEIS = COLECOES.filter((c) => c !== 'admins')

// Datas do Firestore viram texto no arquivo e voltam a ser datas na restauração
const paraJSON = (v) =>
  v instanceof Timestamp ? { __data: v.toDate().toISOString() }
  : Array.isArray(v) ? v.map(paraJSON)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, paraJSON(x)]))
  : v
const deJSON = (v) =>
  v && typeof v === 'object' && !Array.isArray(v) && '__data' in v ? Timestamp.fromDate(new Date(v.__data))
  : Array.isArray(v) ? v.map(deJSON)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deJSON(x)]))
  : v

export default function Backup() {
  const [estado, setEstado] = useState('')
  const [resumo, setResumo] = useState(null)
  const [arquivo, setArquivo] = useState(null)
  const [confirmacao, setConfirmacao] = useState('')
  const [estadoRest, setEstadoRest] = useState('')

  async function baixar() {
    setEstado('gerando')
    try {
      const dados = {}
      for (const c of COLECOES) {
        const snap = await getDocs(collection(db, c))
        dados[c] = Object.fromEntries(snap.docs.map((d) => [d.id, paraJSON(d.data())]))
      }
      const agora = new Date()
      const carimbo = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}-${String(agora.getHours()).padStart(2, '0')}${String(agora.getMinutes()).padStart(2, '0')}`
      const blob = new Blob([JSON.stringify({ versao: 1, geradoEm: agora.toISOString(), dados }, null, 1)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `laplata-backup-${carimbo}.json`
      a.click()
      URL.revokeObjectURL(url)
      setResumo(Object.fromEntries(COLECOES.map((c) => [c, Object.keys(dados[c]).length])))
      setEstado('feito')
    } catch {
      setEstado('erro')
    }
  }

  async function lerArquivo(e) {
    setEstadoRest('')
    const f = e.target.files?.[0]
    if (!f) return setArquivo(null)
    try {
      const json = JSON.parse(await f.text())
      if (!json.dados) throw new Error()
      setArquivo(json)
    } catch {
      setArquivo(null)
      setEstadoRest('Esse arquivo não parece um backup do site.')
    }
  }

  async function restaurar() {
    setEstadoRest('restaurando')
    try {
      const ops = []
      for (const c of RESTAURAVEIS)
        for (const [id, d] of Object.entries(arquivo.dados[c] || {})) ops.push([c, id, deJSON(d)])
      for (let i = 0; i < ops.length; i += 400) {
        const lote = writeBatch(db)
        ops.slice(i, i + 400).forEach(([c, id, d]) => lote.set(doc(db, c, id), d))
        await lote.commit()
      }
      setEstadoRest(`Restauração concluída: ${ops.length} registros gravados.`)
      setConfirmacao('')
    } catch {
      setEstadoRest('A restauração falhou no meio. Tente de novo com o mesmo arquivo; registros já gravados são apenas regravados.')
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-4xl font-bold">Backup</h1>
      <p className="mt-2">
        Baixa um arquivo com tudo do site: jogadores, adversários (com o controle interno e os contatos), campos, jogos com súmulas,
        premiações e a lista de admins.
      </p>
      <p className="mt-2 rounded bg-cautela/10 px-3 py-2 text-sm">
        O arquivo tem dados sensíveis, como contatos e motivos de "não marcar". Guarde num lugar privado e não compartilhe em grupos.
      </p>
      <button onClick={baixar} disabled={estado === 'gerando'}
        className="mt-4 rounded-md bg-sangue px-5 py-2.5 font-display text-xl font-bold text-papel hover:bg-sangue-escuro disabled:opacity-60">
        {estado === 'gerando' ? 'Gerando…' : 'Baixar backup'}
      </button>
      {estado === 'feito' && (
        <p className="mt-3 text-sm" role="status">
          Backup baixado: {Object.entries(resumo).map(([c, n]) => `${n} em ${c}`).join(', ')}.
        </p>
      )}
      {estado === 'erro' && <p className="mt-3 font-semibold text-sangue-escuro" role="alert">Não foi possível gerar o backup. Confira se as regras do Firestore foram publicadas.</p>}

      <hr className="my-8 border-linha" />

      <h2 className="font-display text-3xl font-bold">Restaurar um backup</h2>
      <p className="mt-2 text-texto-suave">
        Use só se algo for apagado ou estragado. Cada registro do arquivo volta a ser como estava no backup.
        Registros criados depois do backup não são apagados. A lista de admins não é restaurada por aqui.
      </p>
      <input type="file" accept="application/json,.json" onChange={lerArquivo} className="mt-3 block text-sm" aria-label="Arquivo de backup" />
      {arquivo && (
        <div className="mt-3 rounded-lg border-2 border-sangue bg-papel p-3">
          <p className="text-sm">
            Backup de {new Date(arquivo.geradoEm).toLocaleString('pt-BR')}:{' '}
            {RESTAURAVEIS.map((c) => `${Object.keys(arquivo.dados[c] || {}).length} em ${c}`).join(', ')}.
          </p>
          <label className="rotulo mt-3" htmlFor="conf">Para confirmar, digite RESTAURAR</label>
          <input id="conf" className="campo" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} />
          <button onClick={restaurar} disabled={confirmacao !== 'RESTAURAR' || estadoRest === 'restaurando'}
            className="mt-3 rounded-md bg-preto px-4 py-2 font-display text-lg font-bold text-papel disabled:opacity-40">
            {estadoRest === 'restaurando' ? 'Restaurando…' : 'Restaurar'}
          </button>
        </div>
      )}
      {estadoRest && estadoRest !== 'restaurando' && <p className="mt-3 text-sm" role="status">{estadoRest}</p>}
    </div>
  )
}
