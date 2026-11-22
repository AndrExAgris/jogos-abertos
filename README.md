# Jogos Abertos

Coleção de minijogos simples e conhecidos (Minas, Sudoku, paciência, xadrez...), em português do Brasil, com um visual único, para jogar sozinho ou a dois no mesmo aparelho. Funciona sem internet.

O mesmo código vira um site (PWA, que pode ser instalado pelo navegador) e um app Android.

Código aberto sob a licença [GPL-3.0](LICENSE). Créditos de terceiros em [CREDITS.md](CREDITS.md).

## Jogos

53 jogos, em teste e ajuste:

| Grupo | Jogos |
| --- | --- |
| Quebra-cabeças | Campo Minado, Sudoku (clássico ou com regras combinadas: diagonais, anti-rei, anti-cavalo, não consecutivo, killer, Kropki, XV, par e ímpar, termômetro), Nonograma, Charada de Einstein, Akari, Tendas, Pontes, Rainhas, Mosaico, Sumplete, Ligue os Números, Apague as Luzes |
| Números e memória | Conta Certa, Jogo da Memória, Sequência de Cores |
| Mover e encaixar | Resta Um, Separe as Cores, Desbloqueio, Setas, Desembaraço |
| Palavras | Termo (com Dueto e Quarteto), Roda de Letras, Palavras Cruzadas (layout livre e grade densa) |
| Conhecimento | Perguntas por Categoria, Rumo ao Milhão, Adivinhe o Filme |
| Geografia | País pela Distância, Capital pela Distância, País pelo Contorno, Bandeira Revelada, Descobre Bandeiras, Viagem pelas Fronteiras, País pelas Pistas |
| Paciências | Paciência, Paciência Spider, FreeCell, Pirâmide, TriPeaks, Golf |
| Jogos 2+ | Quatro em Linha, Damas, Xadrez, Reversi, Trilha, Batalha Naval, General, Dado Mentiroso, Vinte e Um, Quem Sou Eu, Go, Ludo, Jogo Real de Ur, Sinuca |

Contra o computador (fácil, médio e difícil): Quatro em Linha, Damas, Xadrez, Reversi, Trilha, Batalha Naval, General, Dado Mentiroso e Jogo Real de Ur. O computador é próprio do projeto (busca minimax com poda alfa-beta, rodando num Web Worker), sem motor externo.

## Bancos de dados

Montados por scripts em `tools/dados/` a partir de fontes abertas; o resultado fica em `data/`, com a licença de cada fonte ao lado:

```sh
node tools/dados/paises.mjs     # data/paises: mledoze/countries (ODbL), Wikidata, Natural Earth
node tools/dados/palavras.mjs   # data/palavras: pythonprobr/palavras, AOSP LatinIME, Wikcionário
node tools/dados/wikidata.mjs   # data/conhecimento: filmes e perguntas do Wikidata
```

As cartas do Quem Sou Eu (`data/quem-sou-eu/`) foram escritas para o projeto.

## Instalar no Android pelo Obtainium

1. Instale o [Obtainium](https://github.com/ImranR98/Obtainium) no celular.
2. Toque em **Adicionar app** e cole `https://github.com/AndrExAgris/jogos-abertos`.
3. Confirme. O Obtainium baixa o `.apk` do último release (`jogos-abertos-vX.Y.Z.apk`) e avisa quando sair versão nova.

Requer Android 7.0 ou mais novo.

## Rodar o site no servidor

Precisa de Docker com o plugin compose.

```sh
make up          # build e sobe em http://localhost:8080
make up PORTA=9000
make logs        # segue os logs
make status      # estado do container
make update      # git pull, rebuild e sobe
make down        # para e remove o container
make clean       # remove container, imagem e volumes
```

O container é só um nginx servindo arquivos estáticos. O progresso fica no aparelho de cada pessoa (IndexedDB), nunca no servidor.

## Desenvolvimento

Precisa de Node 20.19 ou mais novo (22 recomendado) e do pnpm, que vem com o Node pelo corepack (`corepack enable`).

```sh
make dev         # servidor de desenvolvimento
make test        # testes dos núcleos (Vitest)
make lint        # ESLint
make typecheck   # TypeScript e svelte-check
make build       # build do site em apps/web/dist
make apk         # APK de debug (precisa do Android SDK e do Node 22)
```

Estrutura:

```text
apps/web/              app Svelte + Vite (PWA) e projeto Android do Capacitor (android/)
packages/contrato/     tipos comuns dos jogos e gerador aleatório com semente
packages/ui/           Open Design (visual) e ícones
packages/nucleo-grade/ lógica pura dos jogos de grade (Minas, ...)
tools/icones/          gera os ícones PNG do app a partir de um SVG
docker/                Dockerfile e configuração do nginx
```

Cada jogo tem um núcleo de lógica pura (regras, gerador, solucionador e testes), separado da interface.

### Gerador do Minas: medição

O gerador do Mines, da coleção de quebra-cabeças do Simon Tatham, foi portado para TypeScript (`packages/nucleo-grade/src/minas/gerador.ts`), mantendo o algoritmo: conjuntos de casas com contagem de minas, dedução global pelo total e perturbação do tabuleiro até ele se resolver sem chute.

Tempo médio para gerar um tabuleiro (Node 20, PC de mesa, `pnpm --filter @ja/nucleo-grade medir`):

| Nível | Média | p99 |
| --- | --- | --- |
| Fácil (9×9, 10 minas) | 0,25 ms | 0,7 ms |
| Médio (16×16, 40 minas) | 1,0 ms | 2,1 ms |
| Difícil (30×16, 99 minas) | 3,1 ms | 5,6 ms |
| Denso (16×16, 80 minas) | 3,5 ms | 10,9 ms |

Mesmo num celular dez vezes mais lento isso fica abaixo de 0,1 s, então o Minas gera na hora, sem Web Worker. Conclusão para os próximos geradores do Tatham (Lâmpadas, Tendas, Pontes, Mosaico, Desembaraço): portar para TypeScript, como este, em vez de compilar o C para WebAssembly. Geradores que passarem de uns 50 ms no celular vão para um Web Worker.

## Releases do APK (para quem mantém o projeto)

Ao criar uma tag `vX.Y.Z`, o GitHub Actions gera o APK assinado e anexa ao release como `jogos-abertos-vX.Y.Z.apk`. O `versionCode` vem da tag (`v1.2.3` vira `10203`).

```sh
git tag v0.1.0
git push origin v0.1.0
```

### Chave de assinatura (uma vez só)

O Android só aceita atualizar um app se o APK novo for assinado com a mesma chave do anterior. Se a chave se perder, o Obtainium não consegue atualizar e será preciso desinstalar e instalar de novo (perdendo o progresso que não foi exportado). Por isso:

1. Gere a chave (fora do repositório):

   ```sh
   keytool -genkeypair -v -keystore ~/jogos-abertos.jks -alias jogos-abertos \
     -keyalg RSA -keysize 4096 -validity 36500
   ```

   Anote a senha da keystore e a senha da chave (podem ser iguais).

2. Guarde um backup de `~/jogos-abertos.jks` e das senhas em dois lugares fora do repositório (gerenciador de senhas e um pendrive, por exemplo). Nunca commite a keystore.

3. Converta para base64:

   ```sh
   base64 -w0 ~/jogos-abertos.jks > ~/jogos-abertos.jks.b64
   ```

4. No GitHub, em **Settings → Secrets and variables → Actions → New repository secret**, cadastre:

   | Secret | Valor |
   | --- | --- |
   | `ANDROID_KEYSTORE_BASE64` | conteúdo de `~/jogos-abertos.jks.b64` |
   | `ANDROID_KEYSTORE_PASSWORD` | senha da keystore |
   | `ANDROID_KEY_ALIAS` | `jogos-abertos` |
   | `ANDROID_KEY_PASSWORD` | senha da chave |

   Depois apague `~/jogos-abertos.jks.b64`.

## Progresso

Partidas em andamento, estatísticas e recordes ficam no aparelho. Em **Mais → Exportar progresso** dá para salvar tudo num arquivo `.json` e, em outro aparelho, usar **Importar progresso**.
