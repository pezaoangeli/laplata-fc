// Súmulas extraídas da conversa do grupo (23/05 a 03/10/2026) e correções de fev-mai.
// Só nomes, placares e gols, que já são públicos no site.
const G = (nome, posicao = '') => ({ nome, posicao }) // convidado novo

export const CONVIDADOS_NOVOS = [
  G('Guilherme Hold'), G('Jef', 'Goleiro'), G('Endriws'), G('Rodolfo'),
  G('Andrighetto'), G('Custódio'), G('Otávio'), G('Wesley', 'Goleiro'),
]

export const CANCELADOS = ['2026-06-20', '2026-07-11', '2026-07-18', '2026-07-25', '2026-08-01', '2026-08-22', '2026-08-29', '2026-09-19', '2026-09-26']

// Melhor em campo que faltava na planilha
export const CORRECOES_MELHOR = { '2026-03-07': ['Kauê'], '2026-03-21': ['André'] }

const P = 'Gabriel (Pezão)'
export const SUMULAS = [
  { data: '2026-05-23', adversario: ['Juventus'], local: ['CT Tiago'], horario: '14:00', placar: [1, 3],
    presentes: ['Zanata', 'Juninho', 'Janquiel', 'Mota', P, 'Felipe', 'Gabriel', 'André', 'Kauê', 'Parnoff', 'Thomas', 'Dioice'],
    gols: { Mota: 1 }, assistencias: { Juninho: 1 }, melhores: ['Mota'] },
  { data: '2026-05-30', adversario: ['Mafu'], local: ['Arena'], placar: [5, 2],
    presentes: ['Felipe', 'Zanata', 'Juninho', 'Andrighetto', 'Custódio', 'Dioice', 'Gromoski', 'Otávio', 'Wesley', 'Thomas'],
    gols: {}, assistencias: {}, melhores: [] },
  { data: '2026-06-06', adversario: ['Piá'], local: ['Arena'], placar: [2, 1],
    presentes: ['Guilherme Hold', 'André', 'Mota', 'Felipe', 'Zanata', 'Janquiel', 'Juninho', 'Parnoff', 'Andrezinho', 'Thomas', 'Dioice'],
    gols: { Juninho: 1, 'Guilherme Hold': 1 }, assistencias: {}, melhores: ['Zanata', 'Janquiel'] },
  { data: '2026-06-13', adversario: ['Largados'], local: ['CT Tiago'], horario: '14:00', placar: [2, 3],
    presentes: ['Zanata', 'Alex', P, 'Geromel', 'Juninho', 'Felipe', 'Kauê', 'André', 'Parnoff', 'Jef', 'Thomas'],
    gols: { Kauê: 1, Geromel: 1 }, assistencias: { Parnoff: 1, Kauê: 1 }, melhores: ['Geromel'] },
  { data: '2026-06-27', adversario: ['Vita C'], local: ['Arena'], placar: [7, 3],
    presentes: ['Zanata', 'Mota', 'Juninho', 'Geromel', P, 'Alex', 'Felipe', 'Endriws', 'Thomas', 'Morellato', 'Parnoff'],
    gols: { Geromel: 2, Thomas: 1, [P]: 1, Mota: 1, Juninho: 1, Parnoff: 1 }, assistencias: { Thomas: 1, Geromel: 1 }, melhores: ['Geromel'] },
  { data: '2026-07-04', adversario: ['Atlântico'], local: ['Montreal - Principal', 'Montreal Principal'], horario: '15:00', placar: [6, 3],
    presentes: ['Zanata', 'Alex', 'Geromel', 'Parnoff', 'Felipe', 'Juninho', 'Andrezinho', P, 'Morellato', 'Mota', 'Thomas', 'Gustavo'],
    gols: { Juninho: 2, Geromel: 1, Mota: 1, Felipe: 1, Parnoff: 1 }, assistencias: { Geromel: 1, Parnoff: 1, Thomas: 1 }, melhores: ['Juninho'] },
  { data: '2026-08-08', adversario: ['La Coruna'], local: ['Arena'], horario: '15:00', placar: [1, 3],
    presentes: [P, 'Zanata', 'Janquiel', 'Parnoff', 'Mota', 'Dioice', 'Felipe', 'Juninho', 'Morellato', 'Andrezinho'],
    gols: { Mota: 1 }, assistencias: {}, melhores: ['Dioice'] },
  { data: '2026-08-15', adversario: ['Original FC'], local: ['Arena'], placar: [3, 3],
    presentes: ['Janquiel', 'Felipe', 'Dioice', 'Mota', P, 'André', 'Juninho', 'Andrezinho', 'Kelvin S.', 'Zanata', 'Thomas'],
    gols: {}, assistencias: {}, melhores: [] },
  { data: '2026-09-05', adversario: ['Venom FC', 'Venon FC'], local: ['Arena'], placar: [3, 0],
    presentes: [P, 'Felipe', 'Zanata', 'Kelvin S.', 'Janquiel', 'Kauê', 'Juninho', 'André', 'Thomas'],
    gols: { [P]: 1, Kauê: 1, Juninho: 1 }, assistencias: { [P]: 2, André: 1 }, melhores: [P] },
  { data: '2026-09-12', adversario: ['L.A. Galaxy'], local: ['Sesi'], horario: '15:00', placar: [5, 5],
    presentes: ['André', 'Mota', 'Geromel', 'Morellato', 'Janquiel', P, 'Felipe', 'Andrezinho', 'Juninho', 'Dioice', 'Rodolfo', 'Zanata'],
    gols: {}, assistencias: {}, melhores: [] },
  { data: '2026-10-03', adversario: ['De Arrasto'], local: ['Cairo - São Luiz'], placar: [0, 1],
    presentes: [P, 'Morellato', 'Geromel', 'Mota', 'Janquiel', 'Zanata', 'Endriws', 'Juninho', 'Felipe', 'Dioice'],
    gols: {}, assistencias: {}, melhores: ['Janquiel'] },
]
