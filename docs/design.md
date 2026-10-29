# Quiz de Cifras — Design

Data: 2026-10-29

## Intenção e porquê

App pessoal de estudo de música, pra usar no celular. O usuário toca a música no Spotify (fora do app) e, enquanto escuta, responde um quiz: em cada passo o app pergunta qual é o próximo acorde da cifra e mostra 2, 3 ou 4 opções. O usuário toca a resposta na hora em que quiser, porque já conhece as músicas e sabe o momento. **O app não controla tempo nem sincroniza com o áudio.**

O objetivo é treinar o ouvido e memorizar a harmonia das músicas que o usuário já estuda. Precisa ser simples, bonito e divertido, com cara de joguinho, e não de ferramenta.

## Objetivos

- Colar uma cifra copiada do Cifra Club e transformar em música jogável.
- Editar a cifra de um jeito visual e fácil de entender (ordem de frases e estrofes, acordes).
- Jogar o quiz acorde a acorde, com retorno imediato de acerto ou erro.
- Funcionar offline depois de instalado no celular.
- Fazer backup e restaurar as músicas.

## Não-objetivos

- Tocar áudio dentro do app, integrar com o Spotify ou com qualquer player.
- Sincronizar o quiz com o tempo da música.
- Buscar cifras pela internet ou por link (o Cifra Club bloqueia acesso do navegador, e o texto da página teria os mesmos problemas de ordem).
- Reconhecer acordes a partir do áudio.
- Contas, login, servidor, sincronização entre aparelhos.
- Editar a letra.

## Anti-objetivos (seria fracasso mesmo funcionando)

- Visual de formulário/planilha. Precisa parecer um jogo: botões grandes, cores, feedback claro.
- Opções do quiz com acordes que não estão na música. O usuário usa cifras simplificadas e quer que as opções venham **só** dos acordes da própria cifra.
- Perder as músicas sem jeito de recuperar (por isso existe o backup).

## Restrições

- Uso principal: celular, na vertical, com toque. Precisa funcionar bem em tela de ~360px de largura.
- Offline depois da primeira abertura (PWA com service worker + manifest, instalável pela opção "Adicionar à tela inicial").
- Hospedagem: **GitHub Pages** (decisão do usuário). O usuário precisa de uma conta no GitHub. O plano deve incluir os passos de publicação.
- Sem etapa de build: HTML, CSS e JavaScript puros (decisão minha, confirmada pelo usuário). Bibliotecas pequenas via CDN são aceitáveis só se ficarem no cache do service worker. A preferência é por nenhuma.
- Dados guardados no próprio aparelho (localStorage ou IndexedDB, a critério do builder).

## Formato da entrada (cifra do Cifra Club)

O usuário copia o texto da página. Exemplo (formato real, letra inventada):

```
                       Am
ABRI A JANELA DO QUARTO
Am                     F#m
...VI O SOL NASCER LÁ FORA
F                   Em
...CAFÉ QUENTE NA MESA
Bm       E
...BOM DIA...BOM DIA

Am
...PEGUEI A ESTRADA CEDO
```

Características:
- Linha de acordes logo acima da linha de letra. A posição horizontal (coluna) do acorde indica a sílaba em que ele entra.
- Estrofes separadas por linha em branco.
- Às vezes uma linha de letra sem acordes em cima (linhas sem acorde nenhum).
- Às vezes uma linha de acordes sem letra embaixo (ex.: final com `F E Am`).
- Pode ter marcações como `[Intro]`, `[Refrão]`, `(2x)`, linhas de tablatura e cabeçalho (título, artista, "Tom: G"). As cifras do usuário costumam vir **sem** marcações de seção e sem a ordem completa da música. Por isso o editor é essencial.
- Acordes possíveis: `Am`, `F#m`, `G/B`, `F7M`, `C#m7(b5)`, `D4`, `E7`, `Bb`, `Gm`, `A9`, etc.

## Modelo de dados (conceitual)

- **Música:** título, lista de estrofes, melhor resultado (para as estrelas).
- **Estrofe:** lista de frases. Pode ter um nome opcional (ex.: "Refrão"), editável, e uma marcação "conta no jogo" (ligada por padrão, desligada na Intro).
- **Frase:** texto da letra (pode estar vazio) + lista de acordes, cada um com sua posição (coluna) relativa à letra.
- A ordem do quiz é a ordem das estrofes → frases → acordes (da esquerda pra direita), exatamente como está no editor.

## Telas

Os esboços aprovados estão em `.superpowers/brainstorm/905-1793287524/content/` (`telas.html` e `editor-v2.html`).

### 1. Minhas músicas
- Lista de músicas em cartões coloridos, com estrelas (melhor resultado).
- Seletor de dificuldade: 2, 3 ou 4 opções (lembrado entre sessões).
- Botão grande "＋ Colar cifra".
- Acesso a configurações: exportar backup, importar backup.
- Tocar numa música inicia o quiz. Precisa existir um jeito claro de abrir o editor dela e de apagar a música (apagar pede confirmação dentro do próprio app).

### 2. Colar cifra
- Campo de título + área grande de texto pra colar.
- Ao confirmar, o app interpreta o texto e abre o editor já preenchido, pra conferência.
- Linhas não reconhecidas (cabeçalho, tablatura) são descartadas ou ignoradas. O resultado aparece no editor, onde o usuário pode corrigir.

### 3. Editor (esboço `editor-v2.html`, telas A e B)
- Mostra a cifra no mesmo formato do site: acordes em cima (fonte monoespaçada, cor de destaque) e letra embaixo.
- Estrofes aparecem como blocos coloridos, com cabeçalho (nome editável), e ações de duplicar, apagar e arrastar.
- Frases podem ser arrastadas individualmente (alça ⋮⋮), inclusive de uma estrofe para outra.
- **Modo seleção:** marcar várias frases e então duplicar, mover, transformar em estrofe nova ou apagar.
- **Tocar num acorde** abre um popup pra trocar por outro acorde da música, digitar um novo, mover pra esquerda ou pra direita na frase, ou remover. Também deve ser possível adicionar um acorde numa frase.
- Adicionar estrofe nova (vazia ou cópia de uma existente).
- **Letra não é editável.**
- Desfazer (pelo menos alguns passos).
- Salvar.

### 4. Quiz (esboço `editor-v2.html`, tela C, + `telas.html`, tela 2)
- Topo: sair, nome da música, barra de progresso, "acorde X de N", placar (✅ acertos, ❌ erros, 🔥 sequência).
- **Letra visível por padrão:** mostra a frase atual com os acordes já respondidos e um **?** destacado na posição do acorde que está sendo perguntado. A frase anterior aparece apagada (opacidade baixa) acima. Os acordes seguintes da frase atual ficam escondidos.
- **Botão pra esconder/mostrar a letra** (a preferência é lembrada).
- Botões grandes (grade 2×2 ou equivalente) com as opções.
- **Opções:** o acorde correto + acordes distintos sorteados **apenas entre os acordes da própria música**. Se a música tiver menos acordes distintos do que o número escolhido, mostra menos botões. Posição do correto aleatória.
- **Acertou:** o botão fica verde.
- **Errou:** o botão tocado fica vermelho e o correto fica verde.
- Depois do retorno, o quiz avança pro próximo acorde. O usuário toca pra seguir após um erro. Depois de acerto, o avanço automático rápido é aceitável (decisão do builder, desde que não atrapalhe quem está acompanhando a música).
- **Fim:** tela de resultado (acertos/total, estrelas, maior sequência), com botões "jogar de novo" e "voltar".
- Cada acorde da sequência é uma pergunta, incluindo acordes repetidos em sequência na mesma frase.

### 5. Backup
- Exportar: baixa um arquivo `.json` com todas as músicas e preferências.
- Importar: escolhe um arquivo e pergunta se substitui tudo ou se junta com o que já existe.

## Visual

- Tema escuro (fundo roxo bem escuro), cores vivas de destaque (amarelo/laranja, rosa, azul, verde para acerto, vermelho para erro). Ver esboços.
- Fonte arredondada e amigável para a interface (os esboços usam Fredoka). Fonte monoespaçada para a cifra. As fontes precisam funcionar offline: ou ficam embutidas ou em cache, senão o app usa uma fonte do sistema.
- Botões grandes, com "sombra de botão de jogo", animações curtas de acerto e erro.
- Estrelas: decisão minha, mantida pelo usuário. Limites de estrelas a critério do builder (ex.: ≥90% = 3, ≥70% = 2, ≥40% = 1).

## Decisões tomadas após a revisão (minhas)

- **Sem campo de repetição.** Uma estrofe não tem contador "2x". Repetir é sempre duplicar, gerando uma cópia real. Ao colar a cifra, marcações como `(2x)` são expandidas automaticamente em cópias. Assim, o "N" de "acorde X de N" conta exatamente o que está no editor.
- **Cópias independentes.** Duplicar cria uma cópia sem vínculo com o original: corrigir um acorde numa cópia não altera as outras. A bandeja de "partes reutilizáveis" da `telas.html` (tela 3) foi substituída pelo editor da `editor-v2.html`.
- O nome opcional da estrofe aparece no quiz como rótulo da parte (ex.: "Refrão"). Não existe "2ª vez" automático.

## Introdução fora do jogo (decisão do usuário)

- Todos os acordes que vêm **antes da primeira linha de letra** formam a introdução. Ela aparece no editor e no quiz, mas **não vira pergunta** e não conta como acerto nem erro.
- Ao colar, o app junta essas linhas numa estrofe chamada "Intro" e marca essa estrofe como **fora do jogo**.
- (Minha decisão) Essa marcação é uma opção de qualquer estrofe ("conta no jogo" ligado/desligado), visível no editor com um selo como "não conta". A Intro já vem com ela desligada. Assim o usuário pode tirar um solo do jogo do mesmo jeito. Estrofes fora do jogo não entram no "N" de "acorde X de N".
- No quiz, ao entrar numa estrofe fora do jogo, os acordes dela aparecem sem **?**, só como referência, e o quiz segue direto pra primeira pergunta seguinte.

## Pular para uma parte da música (decisão do usuário)

- O botão ⏸ do quiz abre um menu com: **Reiniciar**, **Ir para…** (lista das estrofes, mostrando o nome e o começo da letra de cada uma), **Mostrar/esconder letra** e **Sair**.
- Escolher uma estrofe leva o quiz direto pra primeira pergunta dela.
- (Minha decisão) O placar da partida continua contando normalmente. Mas se o usuário pulou alguma parte, o resultado final mostra "partida com pulos" e **não atualiza as estrelas**, que só valem pra uma partida completa do início ao fim. Voltar para uma estrofe anterior também conta como pulo.

## Decisões que foram minhas (o usuário viu e não vetou)

- PWA em HTML/JS puro, sem build.
- Estrelas e sequência 🔥.
- Estrofes definidas pelas linhas em branco da cifra colada.
- Remover acordes repetidos não é automático: cada acorde escrito vira uma pergunta.

## Deixado para o builder

- Estrutura de arquivos, biblioteca de arrastar ou implementação própria (precisa funcionar com toque).
- localStorage ou IndexedDB.
- Detalhes do algoritmo de reconhecimento de acordes e linhas, desde que cubra os formatos listados acima.
- Animações, sons de acerto e erro (opcional, com botão de mudo se houver).
- Testes: pelo menos o reconhecimento da cifra e a geração de opções do quiz devem ter testes automatizados que rodem sem build (ex.: página de testes no navegador ou Node).
