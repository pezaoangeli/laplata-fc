import { useEffect, useRef } from 'react'

// Rola a tela até o formulário sempre que ele abre (novo ou outro item em edição).
export function useRolarAte(chave) {
  const ref = useRef(null)
  useEffect(() => {
    if (chave && ref.current) ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [chave])
  return ref
}
