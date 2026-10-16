// Endereço amigável a partir do nome: "Gabriel (Pezão)" -> "gabriel-pezao"
export const slug = (nome = '') =>
  nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

export const linkJogador = (j) => `/elenco/${j?.nome ? slug(j.nome) : j?.id}`
