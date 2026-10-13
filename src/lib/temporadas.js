// Temporadas que aparecem nos seletores: de 2022 (primeiro ano do La Plata) até o ano que vem.
export const PRIMEIRA_TEMPORADA = 2022
export const temporadaAtual = () => new Date().getFullYear()
export const listaTemporadas = () => {
  const anos = []
  for (let a = temporadaAtual() + 1; a >= PRIMEIRA_TEMPORADA; a--) anos.push(a)
  return anos
}
