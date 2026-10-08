import { useState } from 'react'

// Gera a imagem, mostra a prévia e oferece compartilhar (celular) ou baixar.
export default function BotaoImagem({ gerar, nomeArquivo, rotulo = 'Gerar imagem para o Instagram' }) {
  const [previa, setPrevia] = useState(null) // { url, blob }
  const [gerando, setGerando] = useState(false)

  async function abrir() {
    setGerando(true)
    try {
      const canvas = await gerar()
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'))
      setPrevia({ url: URL.createObjectURL(blob), blob })
    } finally {
      setGerando(false)
    }
  }

  function fechar() {
    URL.revokeObjectURL(previa.url)
    setPrevia(null)
  }

  const arquivo = previa && new File([previa.blob], nomeArquivo, { type: 'image/png' })
  const podeCompartilhar = arquivo && navigator.canShare?.({ files: [arquivo] })

  return (
    <>
      <button onClick={abrir} disabled={gerando}
        className="rounded-md border-2 border-preto bg-papel px-4 py-2 font-display text-lg font-bold hover:bg-cimento disabled:opacity-60">
        {gerando ? 'Gerando…' : rotulo}
      </button>
      {previa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-preto/80 p-4" role="dialog" aria-modal="true" aria-label="Prévia da imagem">
          <div className="flex max-h-full w-full max-w-sm flex-col gap-3">
            <img src={previa.url} alt="Prévia da imagem gerada" className="max-h-[70vh] w-full rounded object-contain" />
            <div className="flex gap-2">
              {podeCompartilhar && (
                <button onClick={() => navigator.share({ files: [arquivo] }).catch(() => {})}
                  className="flex-1 rounded-md bg-sangue py-2.5 font-display text-lg font-bold text-papel">Compartilhar</button>
              )}
              <a href={previa.url} download={nomeArquivo}
                className="flex-1 rounded-md bg-papel py-2.5 text-center font-display text-lg font-bold">Baixar</a>
              <button onClick={fechar} className="rounded-md px-3 font-semibold text-papel">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
