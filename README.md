# La Plata F.C. — site

React + Vite + Tailwind CSS + Firebase (Firestore, Authentication e Hosting).

## Etapa 1: base e cadastros

### 1. Criar o projeto no Firebase (console.firebase.google.com)
1. **Adicionar projeto**, por exemplo `laplatafc` (o ID do projeto vira o endereço `laplatafc.web.app`).
2. **Authentication > Começar > Google**: ativar, escolher o e-mail de suporte e salvar.
3. Cada admin entra no site uma vez com **Entrar com Google**. A tela mostra o código (UID) da conta.
4. **Firestore Database > Criar banco**: modo produção, região `southamerica-east1 (São Paulo)`.
5. **Firestore > Iniciar coleção** `admins`: para cada usuário, crie um documento cujo **ID é o UID** dele
   (o código mostrado na tela de login, ou a coluna UID em Authentication > Usuários) e um campo `nome` (texto).
6. **Configurações do projeto > Seus apps > Web (</>)**: registrar o app e copiar os valores do `firebaseConfig`.

### 2. Rodar no computador
```bash
npm install
cp .env.example .env.local     # no Windows: copy .env.example .env.local
# preencha o .env.local com os valores do passo 1.6
npm run dev
```
Abra o endereço que aparecer, entre com seu e-mail e senha e vá em **Painel > Importar dados**.

### 3. Escudo
Salve a imagem do escudo como `public/escudo.png` (de preferência quadrada e com fundo transparente).

### 4. Publicar
```bash
npm install -g firebase-tools   # só na primeira vez
firebase login
firebase use --add              # escolha o projeto e dê o apelido "default"
firebase deploy --only firestore:rules
npm run deploy
```

## Estrutura dos dados
| Coleção | Quem lê | Campos |
|---|---|---|
| `jogadores` | todos | nome, posicao, tipo (fixo/convidado), ativo |
| `adversarios` | todos | nome, cidade |
| `adversariosPrivado` | **só admin** | situacao (liberado/cautela/nao_marcar), motivos[], observacao (mesmo ID do adversário) |
| `locais` | todos | nome, cidade |
| `jogos` | todos | data, temporada, horario, mando (casa/fora), localId, adversarioId, status (agendado/realizado/cancelado), placar {nos, eles}, sumula {presentes[], gols{id:n}, assistencias{id:n}, melhores[], uniforme[], agua[]} |
| `admins` | o próprio usuário | nome (ID = UID do login) |
