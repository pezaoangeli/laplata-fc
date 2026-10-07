import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase.js'

// Escuta uma coleção em tempo real e devolve os documentos ordenados por nome
// (ordenação no navegador para respeitar acentos: Álvaro antes de Bruno).
export function useCollection(nome, { ativo = true } = {}) {
  const [dados, setDados] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!ativo) return
    return onSnapshot(
      collection(db, nome),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        docs.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
        setDados(docs)
        setCarregando(false)
      },
      (e) => {
        setErro(e)
        setCarregando(false)
      }
    )
  }, [nome, ativo])

  return { dados, carregando, erro }
}
