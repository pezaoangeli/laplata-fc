import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase.js'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const comoData = (iso) => new Date(`${iso}T12:00:00`)

export const hojeISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatarData(iso, { diaSemana = true } = {}) {
  const d = comoData(iso)
  const base = `${String(d.getDate()).padStart(2, '0')}/${MESES[d.getMonth()]}`
  return diaSemana ? `${DIAS[d.getDay()]}, ${base}` : base
}

export const nomeMes = (iso) => MESES_LONGOS[comoData(iso).getMonth()]

// Tipos: 'jogo' (padrão), 'interno' (ex.: Grenal) e 'evento' (ex.: Confraternização)
export const tipoJogo = (j) => j.tipo || 'jogo'
export const ehJogo = (j) => tipoJogo(j) === 'jogo'
export function nomeConfronto(j, adversarios) {
  if (tipoJogo(j) !== 'jogo') return j.titulo || (j.tipo === 'interno' ? 'Jogo interno' : 'Evento')
  return adversarios[j.adversarioId]?.nome || 'Adversário a definir'
}

export function resultado(placar) {
  if (!placar) return null
  if (placar.nos > placar.eles) return 'V'
  if (placar.nos < placar.eles) return 'D'
  return 'E'
}

export const CORES_RESULTADO = {
  V: 'bg-liberado text-papel',
  E: 'bg-texto-suave text-papel',
  D: 'bg-sangue text-papel',
}

// Situação que aparece para quem vê o jogo
export function situacaoJogo(jogo) {
  if (jogo.status === 'realizado') return 'realizado'
  if (jogo.status === 'cancelado') return 'cancelado'
  if (jogo.data < hojeISO()) return 'aguardando'
  return 'agendado'
}

export const ordenarJogos = (jogos) =>
  [...jogos].sort((a, b) => (a.data + (a.horario || '')).localeCompare(b.data + (b.horario || '')))

export function agruparPorMes(jogos) {
  const grupos = []
  for (const j of ordenarJogos(jogos)) {
    const mes = nomeMes(j.data)
    if (!grupos.length || grupos.at(-1).mes !== mes) grupos.push({ mes, jogos: [] })
    grupos.at(-1).jogos.push(j)
  }
  return grupos
}

export function useJogos(temporada) {
  const [jogos, setJogos] = useState([])
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    setCarregando(true)
    return onSnapshot(
      query(collection(db, 'jogos'), where('temporada', '==', Number(temporada))),
      (snap) => {
        setJogos(ordenarJogos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
        setCarregando(false)
      },
      () => setCarregando(false)
    )
  }, [temporada])
  return { jogos, carregando }
}

export function useTodosJogos() {
  const [jogos, setJogos] = useState([])
  const [carregando, setCarregando] = useState(true)
  useEffect(
    () => onSnapshot(collection(db, 'jogos'), (snap) => {
      setJogos(ordenarJogos(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      setCarregando(false)
    }, () => setCarregando(false)),
    []
  )
  return { jogos, carregando }
}

export function useJogo(id) {
  const [jogo, setJogo] = useState(undefined) // undefined = carregando, null = não existe
  useEffect(() => onSnapshot(doc(db, 'jogos', id), (d) => setJogo(d.exists() ? { id: d.id, ...d.data() } : null)), [id])
  return jogo
}

// Transforma lista em mapa id -> item
export const porId = (lista) => Object.fromEntries(lista.map((i) => [i.id, i]))
