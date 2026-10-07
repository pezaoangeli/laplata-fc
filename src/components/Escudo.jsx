import { useState } from 'react'

// Usa public/escudo.png. Enquanto o arquivo não existir, mostra um círculo com "LP".
export default function Escudo({ className = 'h-10 w-10' }) {
  const [falhou, setFalhou] = useState(false)
  if (falhou) {
    return (
      <span
        className={`${className} inline-flex items-center justify-center rounded-full bg-sangue font-display font-extrabold text-papel`}
        aria-label="Escudo do La Plata F.C."
      >
        LP
      </span>
    )
  }
  return (
    <img
      src="/escudo.png"
      alt="Escudo do La Plata F.C."
      className={`${className} object-contain`}
      onError={() => setFalhou(true)}
    />
  )
}
