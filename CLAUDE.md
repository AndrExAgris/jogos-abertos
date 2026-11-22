# Jogos Abertos

Este arquivo é a referência do projeto para o Claude Code. Leia inteiro antes de qualquer tarefa. O planejamento já foi feito: as decisões abaixo são fixas, salvo quando o André pedir outra coisa.

## O que é

**Jogos Abertos** (nome temporário) é uma coleção de minijogos simples e conhecidos, em português do Brasil, com regras que todo mundo já sabe (Sudoku, Minas, paciência, xadrez...) e dificuldades interessantes. Um visual único para todos, jogável sozinho ou a dois no mesmo aparelho.

O mesmo código vira duas entregas:

1. **Site**: um container Docker com nginx servindo o app web (PWA), rodando no servidor do André.
2. **App Android**: APK gerado com Capacitor, publicado nos releases do GitHub e instalado pelo **Obtainium** em dois celulares (Galaxy S20 FE e Galaxy A24). Tem que funcionar totalmente offline.

Uso pessoal, código aberto sob GPL-3.0.

## Decisões fixas

| Tema | Decisão |
| --- | --- |
| Nome | Jogos Abertos (temporário). Repositório no GitHub: `AndrExAgris/jogos-abertos` |
| Pasta local | `Projeto Jogo` (esta pasta é a raiz do repositório) |
| Licença | GPL-3.0. Código de terceiros só se for MIT, BSD, ISC, Apache 2.0, LGPL ou GPL |
| Idioma | Só português do Brasil (interface, textos, README, mensagens de commit podem ser em português) |
| Stack | TypeScript + Vite + Svelte; PWA; monorepo com pnpm workspaces |
| UI | Design system **Open Design** (CSS próprio do André). Sem Ionic, sem outro kit de componentes |
| Android | Capacitor 8 (minSdk 24, target SDK 36). APK universal, sem divisão por ABI |
| Servidor | Só arquivos estáticos: nginx em Docker, com docker-compose e Makefile |
| Progresso | Salvo no aparelho (IndexedDB), com exportar e importar em arquivo |
| Backend | Nenhum na v1 |
| Escopo da v1 | Versão básica de todos os jogos do catálogo; ajustes vêm com o tempo |
| Jogos para 2 | Só 2 jogadores no mesmo aparelho na v1; IA fica para depois |
| Configurações por jogo | Decididas com o André durante o desenvolvimento: pergunte antes de inventar |

Nunca usar: cruzadas de jornal ou revista, quadros de filmes, imagens ou dados sem licença aberta, assets de CDN.

## Primeira sessão: o que fazer agora

Monte a base e um jogo de ponta a ponta. Não implemente o catálogo inteiro ainda. Ao terminar cada passo, marque na seção "Estado atual" no fim deste arquivo.

1. **Git e GitHub**: `git init`, branch `main`, criar o repositório `AndrExAgris/jogos-abertos` com `gh` (perguntar ao André se público ou privado antes de criar; o padrão sugerido é público, por causa do Obtainium).
2. **Arquivos de raiz**: `LICENSE` com o texto completo da GPL-3.0, `README.md` em português (o que é, como rodar o site, como instalar o APK pelo Obtainium), `CREDITS.md` (tabela: item, autor, licença, link), `.gitignore` (Node, Android/Gradle, Docker, `*.keystore`, `*.jks`, `.env`), `.editorconfig`.
3. **Monorepo** com pnpm workspaces na estrutura da seção Arquitetura.
4. **Open Design**: copiar para `packages/ui/open-design/` os arquivos `tokens.css`, `components/bundle.css` e a pasta `fonts/` inteira (com as licenças em `assets/Licencas/`), sem editar. O André baixou e descompactou o Open Design dentro da pasta `Code`, ao lado desta pasta (provavelmente `../OpenDesign` ou nome parecido). Procure lá; se não achar, pergunte o caminho. Leia o `README.md` do Open Design e siga as regras dele.
5. **App web** (`apps/web`): Svelte + Vite, PWA instalável com service worker que coloca em cache todos os assets (o app tem que abrir sem internet). Tela inicial com a lista de jogos por grupo, tela de configurações (tema só muda aqui), salvamento em IndexedDB com exportar e importar.
6. **Docker**: `docker/Dockerfile` multi-stage (build com Node + pnpm, serve com nginx), `docker/nginx.conf` com fallback para SPA e cache correto do service worker, `docker-compose.yml` na raiz.
7. **Makefile** na raiz, com estes alvos (é o padrão dos projetos do André):
   - `up`: sobe o container (build se necessário)
   - `down`: para e remove o container
   - `restart`: down + up
   - `clean`: remove container, imagem e volumes do projeto
   - `update`: `git pull` + rebuild + up
   - `logs`: segue os logs
   - `status`: mostra o estado do container
   - Extras úteis: `dev` (servidor de desenvolvimento), `test`, `apk` (build local do APK de debug)
8. **Android** (Capacitor 8 dentro de `apps/web`): projeto `android/` versionado, `appId` `io.github.andrexagris.jogosabertos`, nome do app "Jogos Abertos".
9. **CI no GitHub Actions**:
   - `ci.yml`: em cada push e PR, lint, typecheck, testes dos núcleos e build web.
   - `release.yml`: ao criar uma tag `vX.Y.Z`, gerar o APK de release assinado e anexar ao release do GitHub com nome estável `jogos-abertos-vX.Y.Z.apk`. O `versionCode` cresce a cada release (derivar da tag). A chave de assinatura vem dos secrets do repositório (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`).
   - Explique ao André, passo a passo, como gerar a keystore uma única vez com `keytool`, guardar um backup fora do repositório e cadastrar os secrets. Sem a mesma chave sempre, o Android não aceita atualização e o Obtainium para de funcionar.
10. **Primeiro jogo completo: Minas** (primeira jogada sempre segura, sem precisar chutar), para validar núcleo, interface, salvamento, PWA, Docker e APK.
11. **Protótipo de medição**: usar o gerador do Mines do Simon Tatham (compilar o C para WebAssembly ou portar para TypeScript) e registrar no README o tempo de geração. Esse caminho define como os outros geradores do Tatham serão usados.
12. Primeiro release `v0.1.0` para o André testar a instalação pelo Obtainium nos dois celulares.

## Arquitetura

Cada jogo tem um núcleo de lógica pura (regras, gerador, solucionador, testes), sem interface, separado da camada visual.

```text
Projeto Jogo/                (raiz do repositório jogos-abertos)
  apps/
    web/                     Svelte + Vite (PWA) e projeto Capacitor (android/)
  packages/
    contrato/                tipos comuns dos jogos
    ui/                      componentes Svelte sobre o Open Design (+ open-design/)
    nucleo-grade/            Sudoku, Minas, Lâmpadas, Tendas, Pontes...
    nucleo-cartas/           baralho, paciências, Blackjack
    nucleo-dados/            General, Dado do Mentiroso
    nucleo-palavras/         cruzadas, roda de letras, Termo
    nucleo-trivia/           trivia e filme por pistas
    nucleo-tabuleiro/        jogos para 2
    nucleo-estado/           Resta Um, Water Sort, desbloqueio, setas, desembaraço
    geo/                     jogos de geografia
  tools/
    dados/                   scripts que montam os bancos a partir das fontes abertas
    lotes/                   geração em lote no computador (Sudoku combinado, cruzadas)
  data/                      bancos gerados (JSON), cada um com arquivo de licença ao lado
  docker/
  docker-compose.yml  Makefile  LICENSE  CREDITS.md  README.md  CLAUDE.md
```

Contrato comum (ponto de partida; ajuste se precisar):

```ts
export interface Jogo<Estado, Jogada, Config> {
  id: string;
  nome: string;
  novo(config: Config, semente: string): Estado;   // mesma semente, mesmo jogo
  jogadasValidas?(estado: Estado): Jogada[];
  jogar(estado: Estado, jogada: Jogada): Estado;   // imutável, facilita desfazer
  resultado(estado: Estado): 'andamento' | 'vitoria' | 'derrota' | 'empate';
  serializar(estado: Estado): string;
  desserializar(texto: string): Estado;
}
```

- Sementes permitem repetir partidas e ter desafio do dia.
- Geradores pesados rodam em Web Worker.
- Desfazer por pilha de estados.
- Uma partida em andamento por jogo, mais estatísticas e recordes, no IndexedDB.
- Testes unitários (Vitest) em todos os núcleos.

## Visual: Open Design

Siga o `README.md` do Open Design. Resumo do que vale aqui:

- `<html lang="pt-BR" data-theme="escuro" data-primaria="laranja" data-secundaria="teal">`, densidade `equilibrada`.
- Carregar `tokens.css` e depois `bundle.css`. Fontes locais: Geist na interface, Literata só em leitura longa (regras completas dos jogos), JetBrains Mono em valores técnicos.
- Nunca usar cor de destaque pelo nome: só `primaria`, `secundaria` e as cores de estado, sempre por variável.
- Cantos de 8 px, sem pílulas; botões com relevo; um botão principal (laranja) por tela.
- Secundária (teal) para etiquetas, categorias e para o segundo jogador.
- Celular: navegação inferior (com "Mais" abrindo uma página). Desktop: navegação lateral. Configurações sempre no lugar que o README indica.
- Tema (sistema, claro, escuro) só muda nas configurações. Nada de botão de sol e lua no cabeçalho.
- Ícones: Tabler Icons (outline), SVG inline copiado para o projeto.
- Peças próprias dos jogos (tabuleiro, célula, carta, teclado) viram classes com prefixo `ja-`, usando só variáveis do sistema.

Estados de célula nos puzzles:

- Linha, coluna e caixa da seleção: fundo `superficie` (cinza neutro), nunca tom de laranja.
- Célula selecionada: fundo `primaria-fundo` com anel `primaria-texto`.
- Número dado: `texto`. Número do jogador: `primaria-texto`.
- Erro: só o número, em `erro-texto` e sublinhado. A célula nunca é preenchida de vermelho.

## Plataformas

| Item | Valor |
| --- | --- |
| Galaxy S20 FE | Última versão: Android 13. É o limite inferior |
| Galaxy A24 | Android 16 |
| Capacitor 8 | minSdk 24, target SDK 36, WebView Chrome 60+ |
| Tamanho do APK | Meta: 10 a 20 MB com tudo dentro (offline) |
| Distribuição | Releases do GitHub; o Obtainium lê a tag e baixa o `.apk` anexado |

## Catálogo da v1

Implemente motor por motor; o primeiro jogo de cada grupo destrava os outros. 1P = sozinho; 2P = dois no mesmo aparelho.

| Motor | Jogos | Notas |
| --- | --- | --- |
| Grade | Minas, Sudoku (padrão e com regras combinadas), Lâmpadas (Akari), Tele (Sumplete), Tendas, Pontes (Hashi), Kings (Queens), Mosaico, Linkar números (Numberlink) | Minas sem chute |
| Números | Alvo com 6 números | 4 operações para chegar ao alvo |
| Palavras | Palavras cruzadas, Roda de letras, Termo (com Dueto e Quarteto) | Respostas sem acento nem cedilha |
| Conhecimento | Trivia por categorias, Filme por pistas | Mesmo banco de dados |
| Geografia | Globle, Globle Capitals, Worldle, Flagle, De que país é a bandeira, Travle, Countryle | Base de países única |
| Cartas | Klondike (1 e 3 cartas), Spider (1, 2 e 4 naipes), FreeCell, Pirâmide, TriPeaks/Golf, Blackjack | Um baralho, várias regras |
| Dados | General (Yahtzee), Dado do Mentiroso | No Mentiroso, cada um espia os próprios dados na sua vez |
| Estado | Resta Um (tabuleiros fixos, sem gerador), Water Sort, Desbloqueio (Rush Hour/Klotski), Setas (plano e cubo), Desembaraço | Gerar embaralhando a partir do resolvido |
| Tabuleiro 2P | Connect 4, Trilha, Damas (regra brasileira), Reversi, Xadrez, Go (9×9, 13×13, 19×19), Ludo (2 a 4), Jogo Real de Ur, Sinuca 8 bolas | Sem IA na v1 |

**Trivia**: estilo do jogo de tabuleiro Quest, sem tabuleiro. Aparecem as 6 categorias (Mundo, Artes e Entretenimento, Sociedade, Ciência e Tecnologia, Esporte e Lazer, Variedades); o jogador escolhe uma e sai uma pergunta dela. Antes de responder, aposta quantos pontos quer ganhar ou perder. Cinema e TV fica dentro de Artes e Entretenimento, com poucas perguntas abstratas sobre arte. Brasil pode ser uma sétima categoria opcional. Modos: 1P (recorde) e 2P ou mais (alternando).

**Filme por pistas**: adivinhar o filme com até 6 pistas reveladas aos poucos (ano, gênero, país, diretor, elenco principal, prêmio), com autocompletar a partir da lista de filmes do banco.

Depois da v1 (só se o André pedir): Nonograma, Kakuro, KenKen, Takuzu, Futoshiki, Slitherlink, Nurikabe, Hitori, Charada de Einstein, 2048, 24, Quebra-cabeça de 15, Caça-palavras, Soletra, Contexto, Mapa mudo, Truco, Copas, Farkle, Lights Out, Mahjong, Sokoban, Torre de Hanói, Jogo da velha supremo, Mancala, Pontinhos, Gomoku, Batalha naval e IA para os jogos de 2.

## Motores e geradores

### Coleção do Simon Tatham (MIT)

Porte os geradores úteis da Simon Tatham's Portable Puzzle Collection (https://www.chiark.greenend.org.uk/~sgtatham/puzzles/): só a parte de geração, com a interface feita no Open Design. Todo puzzle gerado lá tem solução sem chute.

| Nosso jogo | Tatham |
| --- | --- |
| Minas | Mines |
| Lâmpadas | Light Up |
| Tendas | Tents |
| Pontes | Bridges |
| Mosaico | Mosaic |
| Desembaraço | Untangle |
| Resta Um | Pegs (só os tabuleiros fixos) |

Outros motores abertos podem ser portados se a licença for compatível com GPL-3.0, sempre com crédito. Kings, Linkar números, Tele, Water Sort, Desbloqueio e Setas precisam de gerador próprio; os de estado saem embaralhando a partir do resolvido, com dificuldade pelo número mínimo de movimentos (BFS).

### Onde gerar

| Jogo | Onde |
| --- | --- |
| Sudoku padrão | Banco do Sudoku Exchange (https://sudokuexchange.com/puzzle-bank/, sem copyright): cerca de mil jogos em cada uma de 5 faixas da nota do Sukaku Explainer |
| Sudoku com regras combinadas | Lote no computador (`tools/lotes`) para combinações pré-definidas; no celular, combinação livre com limite de tempo e o banco como reserva |
| Palavras cruzadas (grade compacta) | Lote no computador |
| Todo o resto | No celular, na hora |

### Sudoku com regras combinadas

O foco do Sudoku são puzzles difíceis com várias regras ao mesmo tempo (o padrão quase não vai ser jogado). Regras da v1:

- Pares de células: anti-rei, anti-cavalo, não consecutivo, Kropki (branco: consecutivos; preto: um é o dobro do outro), XV (X: somam 10; V: somam 5), par e ímpar.
- Regiões: diagonais (X), killer (cage com soma, sem repetição).
- Linhas: termômetro (crescente do bulbo à ponta), seta (soma da seta = círculo), palíndromo, German whispers (vizinhos diferem 5 ou mais; nunca tem 5), renban (conjunto de dígitos consecutivos, qualquer ordem).
- Fora da grade: little killer (soma da diagonal indicada).

Referências: Interactive Sudoku Solver (https://github.com/sigh/Interactive-Sudoku-Solver, MIT, JavaScript, conta soluções e checa unicidade), SudokuSolver do Rangsk (https://github.com/dclamage/SudokuSolver, GPL-3.0, C#, caminho lógico com técnicas humanas) e bcrist/sudoku (https://github.com/bcrist/sudoku, MIT).

Receita do gerador:

1. Modelar a grade como células mais uma lista de restrições, cada uma com seu propagador de candidatos.
2. Gerar uma solução que respeite as regras globais escolhidas. Sem solução no tempo limite, marcar a combinação como inviável e avisar (há combinações sem solução, como X + anti-cavalo + anti-rei + não consecutivo + grupos disjuntos).
3. Adicionar pistas de regra coerentes com a solução (cages, linhas, pontos), uma por vez, priorizando a que mais corta candidatos, até a contagem de soluções dar 1. Com regras globais fortes quase não precisa de dígito dado (o Miracle Sudoku tem solução única com dois).
4. Minimizar: tentar tirar cada pista e cada dígito dado, mantendo a unicidade.
5. Unicidade: contagem com limite 2 (propagação + ramificação); no lote, conferir também com SAT (achar solução, proibir, procurar outra).
6. Dificuldade por solucionador de técnicas humanas: fácil (singles e propagação direta), médio (pares e combinações de soma), difícil (X-wing e interação entre regras), extremo (cadeias curtas). Rejeitar o que exige chute.

### Palavras cruzadas

Problema de restrições: cada espaço é uma variável, as palavras do banco são os valores.

1. Indexar as palavras por tamanho e por (posição, letra) com conjuntos de bits.
2. Preencher primeiro o espaço com menos candidatos; testar palavras por pontuação (tem dica boa, é frequente, não repetida).
3. Depois de cada palavra, recalcular os espaços que cruzam; sem candidato, voltar.
4. Estourou o tempo: recomeçar com outra semente ou outro modelo de grade.
5. Nota de dificuldade pela frequência das palavras e pelo tipo de dica.

Formatos: layout livre (gerado no celular, sempre fecha) e depois grade compacta de 5×5 a 9×9 com modelos de casas pretas (gerada em lote). Cruzadinha direta (dica dentro da casa) fica para depois.

## Dados

Bancos montados por scripts em `tools/dados/` a partir de fontes abertas; resultado em `data/`, com a licença de cada fonte ao lado. Regra de ouro do conteúdo: **qualquer pessoa de qualquer lugar do Brasil tem que conseguir responder**. Nada que só é famoso numa cidade, num estado ou só nos Estados Unidos.

### Palavras e dicas

| Fonte | Uso | Licença |
| --- | --- | --- |
| pythonprobr/palavras (https://github.com/pythonprobr/palavras) | Palavras válidas (filtrar nomes próprios e raras) | MPL-2.0 |
| Dicionário do teclado do Android (AOSP LatinIME, pt_BR) | Frequência de uso; respostas do Termo | Apache 2.0 (conferir no arquivo) |
| Dicionário Aberto | Definições (dicionário antigo; reescrever) | Domínio público |
| OpenWordNet-PT | Sinônimos | Aberta (conferir no repositório) |
| Wikcionário, via Wiktextract (https://github.com/tatuylonen/wiktextract) | Definições e sinônimos atuais | CC BY-SA |
| Wikidata | Nomes próprios, fatos para dicas e perguntas | CC0 |

Dicas: modelos a partir dos fatos do Wikidata para nomes próprios ("Capital do Peru", "Pintor de Guernica"); sinônimo ou definição encurtada para palavras comuns; reescrita em lote para deixar cada dica curta e atual; revisão por amostragem. Respostas sem acento nem cedilha. Estimativa: 25 a 40 mil palavras comuns com dica.

### Nomes próprios: só os realmente famosos

Meta de cerca de 3 mil nomes próprios no total (pessoas, lugares, empresas e marcas, obras). Qualquer época e área (pintores, cantores, influenciadores, políticos, presidentes do Brasil, atletas, cientistas, "o primeiro a fazer algo grande"), desde que a fama seja nacional ou mundial. Filtro a calibrar mostrando amostras ao André:

1. Famosos no mundo: muitos sitelinks no Wikidata (começar com corte em torno de 40).
2. Famosos no Brasil: artigo na Wikipédia em português, alguns sitelinks em outras línguas e audiência alta na Wikipédia em português.
3. Excluir cargos e categorias locais (vereadores, deputados estaduais, personalidades de uma cidade) e classificar cada nome restante em "conhecido no Brasil inteiro?", com revisão humana dos duvidosos.
4. Exigir rótulo e descrição em português.

### Trivia

1. Banco principal: perguntas por modelo a partir do Wikidata, já em português ("Quem pintou X?", "Qual é a capital de X?", "Quem dirigiu o filme X?"), com opções erradas do mesmo tipo e o mesmo filtro de fama.
2. Complemento traduzido: OpenTriviaQA (https://github.com/uberspot/OpenTriviaQA, cerca de 49,6 mil perguntas, CC BY-SA 4.0) e Open Trivia DB (https://opentdb.com, CC BY-SA 4.0).
3. Filtrar antes de traduzir: identificar as entidades de cada pergunta, checar no Wikidata se têm artigo em português e fama suficiente, e descartar o que só um americano saberia (ligas, programas de TV, política local) e perguntas muito abstratas sobre arte.
4. Encaixar cada pergunta numa das 6 categorias. Tradução de banco CC BY-SA continua CC BY-SA: esse banco fica em arquivo separado, com a licença e os créditos.

### Filme por pistas

Filmes do Wikidata com rótulo em português e fama mundial, com ano (P577), gênero (P136), país (P495), diretor (P57), elenco (P161) e prêmios (P166). Os mesmos filmes alimentam a trivia.

### Países

| Base | Fonte | Licença |
| --- | --- | --- |
| Formas dos países | Natural Earth 1:110m | Domínio público |
| Capitais, vizinhos, população, ISO | mledoze/countries (https://github.com/mledoze/countries) | ODbL 1.0 (atribuição; base derivada sob ODbL) |
| Bandeiras | flag-icons (https://github.com/lipis/flag-icons) | MIT |

## Licenças, créditos e assets

- Código: GPL-3.0; código de terceiros só com licença compatível, mantendo os avisos de copyright.
- Dados: cada banco em `data/` com arquivo de licença ao lado; CC BY-SA e ODbL em arquivos separados, com atribuição.
- `CREDITS.md` atualizado no mesmo commit em que qualquer asset, dado ou código de terceiros entra.

| Asset | Pacote | Licença |
| --- | --- | --- |
| Bandeiras | flag-icons (formato 4:3) | MIT |
| Baralho | CardMeister (https://github.com/cardmeister/cardmeister.github.io); alternativas: Vector Playing Cards de Byron Knoll (CC0), SVG-cards (LGPL-2.1) | Unlicense |
| Peças de xadrez | Cburnett | GPLv2 ou posterior |
| Peças, dados, fichas | Kenney Board Game Pack (https://kenney.nl/assets/boardgame-pack) | CC0 |
| Ícones de jogo | Kenney Board Game Icons | CC0 |
| Ícones de interface | Tabler Icons | MIT |
| IA de xadrez (fase 2) | Stockfish.js lite, uma thread (cerca de 1,7 MB) | GPL-3.0 |

Peças de damas, Go, Trilha, Connect 4, Reversi, Ur, Resta Um e os tubos do Water Sort: desenhar em SVG próprio, nas cores do Open Design.

## Marcos

1. **Base**: repositório, monorepo, PWA, Capacitor, Docker com Makefile, CI com release do APK, base comum do app e Minas completo.
2. **Grade**: Sudoku padrão (banco), motor do Sudoku com regras combinadas (com o lote), depois os outros puzzles de grade.
3. **Cartas e dados**: baralho, paciências, Blackjack, General, Dado do Mentiroso.
4. **Estado e tabuleiro**: Resta Um, Water Sort, Desbloqueio, Setas, Desembaraço e os jogos para 2.
5. **Dados e conhecimento**: pipelines de palavras, dicas, nomes próprios e trivia; cruzadas, roda de letras, Termo, trivia e filme por pistas.
6. **Geografia**: base de países e os 7 jogos.
7. **Acabamento**: estatísticas, desafio do dia por semente, revisão visual e release 1.0.

A cada marco: testes dos núcleos passando, APK gerado no CI e um release para o André testar nos dois celulares.

## Como trabalhar neste projeto

- Fale com o André em português.
- Antes de começar um marco, mostre um plano curto e espere o ok.
- Decisões de jogabilidade (configurações, pontuação, regras opcionais): pergunte em vez de supor.
- Commits pequenos e descritivos, em português.
- Nunca commite keystore, senhas ou `.env`.
- Atualize a seção "Estado atual" abaixo ao fim de cada sessão.

## Estado atual

- [ ] Marco 1: base do projeto (em andamento)
  - [x] 1. Git iniciado (`main`). Repositório no GitHub (público, decidido em 21/11/2026) ainda não criado: falta o `gh` na máquina
  - [x] 2. Arquivos de raiz (LICENSE, README, CREDITS, .gitignore, .editorconfig, .dockerignore)
  - [x] 3. Monorepo pnpm (`apps/web`, `packages/contrato`, `packages/ui`, `packages/nucleo-grade`, `tools/icones`)
  - [x] 4. Open Design copiado para `packages/ui/open-design/` (tokens, bundle, open-design.js, fontes, licenças); ícones Tabler usados em `packages/ui/icones/`
  - [x] 5. App web: início por grupo, recordes, Mais/Configurações (Aparência primeiro), IndexedDB com exportar e importar, PWA com tudo em cache
  - [x] 6. Docker (Dockerfile, nginx.conf, docker-compose.yml). Build simulado sem Docker; `make up` ainda não testado (usuário fora do grupo `docker`)
  - [x] 7. Makefile
  - [x] 8. Capacitor 8 com `android/` versionado, ícones e splash próprios. APK ainda não compilado localmente (sem Android SDK)
  - [x] 9. CI (`ci.yml`, `release.yml`); keystore explicada no README
  - [x] 10. Minas completo (Fácil, Médio, Difícil, personalizado; primeira jogada segura, sem chute)
  - [x] 11. Gerador do Mines portado para TypeScript e medido (README): Difícil em ~3 ms, sem Web Worker
  - [ ] 12. Release `v0.1.0`

Decisões tomadas com o André:
- Minas: 3 níveis (9×9/10, 16×16/40, 30×16/99, em pé 16×30 no celular na vertical) + personalizado (lados de 5 a 40)

Decisões provisórias, a confirmar com o André:
- Minas sem desfazer; trocar de nível no meio descarta a partida sem contar derrota; números em cor neutra (sem as cores clássicas por número)
