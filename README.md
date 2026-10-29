# Quiz de Cifras 🎸

App de estudo para treinar o ouvido. Você dá play na música no Spotify e, a cada acorde, escolhe entre 2, 3 ou 4 opções qual é o próximo. Acertou fica verde, errou fica vermelho.

## Como usar

1. Copie a cifra no Cifra Club e toque em **＋ Colar cifra**.
2. Confira no editor. Lá você pode arrastar frases e estrofes, duplicar, apagar, trocar acordes e marcar estrofes que **não contam** no jogo (a Intro já vem marcada).
3. Toque na música pra jogar. No ⏸ dá pra pular pra qualquer estrofe, reiniciar e esconder a letra.

As músicas ficam salvas **só no aparelho**. Em ⚙️ você exporta e importa um backup (.json). Faça isso de vez em quando.

## Instalar no celular

- **Android (Chrome):** abra o link, menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial").
- **iPhone (Safari):** abra o link, botão Compartilhar → **Adicionar à Tela de Início**.

Depois da primeira abertura, o app funciona sem internet.

## Desenvolvimento

Não tem build nem dependências. É só HTML, CSS e JavaScript.

```bash
npm test                         # testes da lógica (Node 24+)
npx http-server -c-1 -p 8080 .   # servir localmente
```

**Ao mudar qualquer arquivo do app, troque o número de `CACHE` em `sw.js`** (ex.: `cifraquiz-v2`). Senão os celulares continuam usando a versão antiga guardada.
