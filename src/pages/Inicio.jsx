import Escudo from '../components/Escudo.jsx'

// Página inicial provisória. Na etapa 4 ela ganha próximo jogo, último resultado e destaques.
export default function Inicio() {
  return (
    <section className="relative overflow-hidden">
      {/* Fundo dividido como o escudo: metade branca, metade vermelha */}
      <div className="absolute inset-0 grid grid-cols-2" aria-hidden="true">
        <div className="bg-papel" />
        <div className="bg-sangue" />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 py-14 text-center sm:py-20">
        <Escudo className="h-44 w-44 rounded-full bg-papel p-2 shadow-[0_0_0_6px_#000] sm:h-56 sm:w-56" />
        <h1 className="mt-8 font-display text-6xl font-extrabold uppercase leading-none sm:text-8xl">
          <span className="text-preto">La </span>
          <span className="text-papel [text-shadow:0_2px_0_#000]">Plata</span>
        </h1>
        <p className="mt-3 rounded bg-preto px-3 py-1 font-display text-xl font-semibold text-papel">
          Futebol Clube, Sapiranga-RS
        </p>
      </div>

      <div className="relative bg-papel">
        <div className="mx-auto max-w-2xl px-4 py-10 text-center">
          <p className="text-lg text-texto-suave">
            Agenda, resultados, súmulas e rankings da temporada vão aparecer aqui em breve.
          </p>
        </div>
      </div>
    </section>
  )
}
