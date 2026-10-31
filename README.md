# Agentic Stack Template

Instale uma combinação reutilizável de **BMAD**, **Kent (TDD)** e **Alethe**
em um projeto existente. O template oferece instaladores para Windows,
macOS e Linux; não é necessário copiar scripts manualmente para cada projeto.

**English:** [README in English](README.en.md).

> O Alethe é o ponto de entrada padrão do projeto: o comando grava um bloco de
> instruções em `AGENTS.md`/`CLAUDE.md`, lido por todas as ferramentas
> suportadas. Você pode descrever a tarefa em linguagem natural sem chamar uma
> persona BMAD pelo nome. Alethe decide quando usar workflows/personas BMAD,
> quando trabalhar diretamente e quando delegar partes independentes a workers
> CLI. Ele não delega toda tarefa nem invoca uma persona BMAD em todos os
> pedidos.

## Como BMAD, Kent, Alethe e workers se complementam

| Componente | O que faz | O que não significa |
| --- | --- | --- |
| **Alethe** | Atua como lead/orquestrador padrão pelo bloco de instruções do projeto. Interpreta o pedido, escolhe orientação pertinente e decide entre trabalho direto ou delegação. | Não é uma persona BMAD. Não exige paralelismo em toda tarefa. |
| **BMAD** | Fornece método, workflows e personas especializadas, como arquitetura, desenvolvimento e produto. | Não é o orquestrador de workers desta stack. |
| **Kent** | Persona de TDD que descobre e respeita o runner e as convenções que já existem no projeto. | Não instala Vitest/Jest/pytest, não impõe diretórios nem limites de cobertura. |
| **Worker CLI** | Ferramenta externa que pode executar uma unidade delegada por Alethe. | Um worker não é automaticamente uma persona ou workflow BMAD. |

O instalador coloca a skill Alethe nas pastas das ferramentas selecionadas e
grava no projeto o bloco de instruções que liga Alethe, BMAD e Kent. Se você
consentir, também ativa o modo global oficial do Alethe com a mesma regra; essa
ativação vale para todos os seus projetos e não expira, mas só chega ao agente
em ferramentas com hook do Alethe. O comportamento final também depende da IDE
e do agente que você usa.

## Pré-requisitos

- Git.
- Node.js 20.12 ou superior e npm, incluído na instalação padrão do Node.js.
- Python 3.10 ou superior para a instalação/atualização BMAD.
- `uv` para workflows e scripts BMAD que executam Python. Se estiver ausente,
  o instalador pergunta antes de usar o instalador oficial; sem consentimento,
  continua a configuração e avisa sobre essa limitação. Em execução não
  interativa, use `--install-uv` para autorizar a instalação.
- Uma ou mais ferramentas reconhecidas pelo BMAD 6.12.4.

Node.js e Python não são instalados automaticamente. Nenhuma etapa requer
elevação de privilégios.

## Instalar pelo seu agente de IA

Alternativa às seções 1 e 2: abra o projeto na sua ferramenta, em modo agente
(com permissão para executar comandos no terminal), e cole o prompt abaixo,
trocando `<ID>` pelo ID da tabela. O agente executa os mesmos instaladores
descritos neste README e pede sua confirmação nas decisões importantes.

| Ferramenta | Onde colar | `<ID>` |
| --- | --- | --- |
| Claude Code (CLI, VS Code, desktop) | Chat do Claude Code | `claude-code` |
| Codex (CLI ou extensão) | Chat do Codex; aprove acesso à rede para `git`/`npm` se o sandbox bloquear | `codex` |
| GitHub Copilot (VS Code) | Chat no modo **Agent** | `github-copilot` |
| Cursor | Chat no modo **Agent** | `cursor` |
| Antigravity | Chat do agente | `antigravity-cli` |

Usa mais de uma ferramenta no mesmo projeto? Separe os IDs por vírgula, por
exemplo `claude-code,codex`.

```text
Instale o agentic-stack-template (BMAD + Kent + Alethe) neste projeto, seguindo
estas regras:

1. Pré-requisitos: mostre as versões de git, Node.js (20.12+), npm, Python
   (3.10+) e uv. Não instale Node.js nem Python; se faltarem, pare e me diga o
   que instalar.
2. Comando global: pergunte se já tenho um clone do template. Se sim, faça
   git pull nele; se não, clone
   https://github.com/JohnnyPessoli/agentic-stack-template.git em uma pasta
   fora deste projeto. No clone, execute "node scripts/install.mjs --dry-run"
   e depois "node scripts/install.mjs". Se houver conflitos, mostre-os e não
   use --force sem a minha confirmação.
3. Projeto: na raiz deste projeto, execute
   node ~/.agentic-stack-template/bin/setup-agentic-stack.mjs --dry-run --tools <ID>
   (no PowerShell, troque ~ por $HOME; não dependa do PATH). Mostre o resultado
   e espere a minha confirmação. Depois execute o mesmo comando sem --dry-run.
4. Não use --force, --install-uv, --update-bmad nem --enable-alethe-everywhere
   sem me perguntar antes. Não leia .env nem arquivos de credenciais.
5. Ao final, mostre o resumo do comando, o git status e o que preciso fazer
   manualmente (por exemplo, reiniciar a sessão para as skills aparecerem).
```

Depois da instalação, **reinicie a sessão/janela da ferramenta**: skills
novas só são carregadas ao abrir uma sessão. Nessa execução pelo agente, o
instalador não altera o PATH nem ativa o modo global do Alethe; se quiser o
comando `setup-agentic-stack` no terminal, rode o instalador global você mesmo
(seção 1).

Para **atualizar** um projeto que já usa o template, cole:

```text
Atualize o agentic-stack-template deste projeto: pergunte onde está meu clone
do template (se eu não tiver, clone
https://github.com/JohnnyPessoli/agentic-stack-template.git fora deste
projeto), faça git pull nele e execute "node scripts/install.mjs". Depois, na
raiz deste projeto, execute
node ~/.agentic-stack-template/bin/setup-agentic-stack.mjs --dry-run
(no PowerShell, troque ~ por $HOME). Se ele não detectar as ferramentas, use
--tools com os IDs listados em "ides:" de _bmad/_config/manifest.yaml. Mostre o
resultado, espere a minha confirmação e execute sem --dry-run. Não use --force
nem outras flags de autorização sem me perguntar. Ao final, mostre o resumo e
o git status.
```

## 1. Instalar o comando global

Clone este repositório e escolha o instalador do seu terminal:

```sh
git clone https://github.com/JohnnyPessoli/agentic-stack-template.git
cd agentic-stack-template
```

### PowerShell

```powershell
.\install.ps1
```

Se a política local impedir a execução do script:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install.ps1
```

### Prompt de Comando (CMD)

```bat
install.cmd
```

### Git Bash, macOS ou Linux

```sh
./install.sh
```

No Git Bash, também é possível usar `bash ./install.sh`.

O instalador copia os arquivos gerenciados para `~/.agentic-stack-template` e
os wrappers para `~/.local/bin` (no Windows, dentro do perfil do usuário).
Ele pergunta antes de adicionar essa pasta ao `PATH`. Se você recusar, os
wrappers continuam instalados e são exibidas instruções específicas para
configurar o `PATH` manualmente. Reabra o terminal depois de aceitar a mudança.

Opções do instalador global:

```text
--dry-run   Mostrar operações sem escrever arquivos ou alterar PATH
--force     Substituir conflitos apenas nos arquivos gerenciados pelo template
--help      Mostrar ajuda
```

Uma instalação repetida preserva arquivos divergentes por padrão. Para atualizar
os arquivos gerenciados depois de obter uma versão nova do repositório:

```sh
git pull
```

Em seguida execute novamente o instalador com `--force` se ele listar conflitos
que você revisou e deseja substituir. Arquivos não pertencentes ao template não
são apagados.

## 2. Preparar um projeto

Funciona tanto em projeto novo (pasta vazia, com ou sem Git) quanto em projeto
em andamento. Entre na raiz do projeto, a mesma pasta que você abre na IDE, e
faça primeiro um dry-run:

```sh
cd caminho/do/seu/projeto
setup-agentic-stack --dry-run
```

O dry-run mostra os pré-requisitos detectados (Node.js, npm, Python, `uv`,
Git), o que será feito e avisos sobre o projeto. Por exemplo, ele avisa quando
a pasta é um subdiretório de um repositório Git ou quando o BMAD existente não
tem integração para alguma ferramenta selecionada.

Depois, execute a instalação:

```sh
setup-agentic-stack
```

Se nenhuma ferramenta for detectada, selecione-a explicitamente:

```sh
setup-agentic-stack --tools codex
setup-agentic-stack --target "C:\Projetos\meu app" --tools claude-code,github-copilot
```

IDs aceitos: `antigravity-cli`, `claude-code`, `codex`, `cursor` e
`github-copilot`. A detecção procura sinais limitados ao projeto/perfil:

| Ferramenta | Sinais usados |
| --- | --- |
| Antigravity CLI | Executável `agy`/`antigravity` ou `~/.gemini/antigravity` |
| Claude Code | Executável `claude` ou diretório `.claude` no projeto/perfil |
| Codex | Executável `codex` ou diretório `.codex` no projeto/perfil |
| Cursor | Executável `cursor`, `.cursor` ou `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md`, `.github/agents`, extensão Copilot detectada no VS Code ou referência à extensão em `.vscode/extensions.json` |

Se os sinais não corresponderem à sua instalação, use `--tools` para informar a
seleção desejada. Essa opção substitui a detecção; não instala a IDE.

### O que acontece

1. **BMAD:** em projeto novo, instala a versão estável `bmad-method@6.12.4`,
   módulo `bmm`, com comunicação e documentos em português. O número de skills
   exibido depende da versão e da ferramenta; não há quantidade fixa prometida.
2. **BMAD já existente:** `_bmad/` é preservado sem update por padrão. O resumo
   informa versão, módulos e ferramentas encontrados no manifesto, quando
   disponível. Para solicitar o update oficial:

   ```sh
   setup-agentic-stack --update-bmad
   ```

   Isso usa a ação oficial `update --yes` do BMAD 6.12.4 sem enviar uma nova
   lista de módulos ou ferramentas. O BMAD aplica sua política upstream aos
   módulos instalados; leia a saída antes de aceitar esse comportamento. A
   opção `--force` não atualiza BMAD.

   Se você selecionar uma ferramenta que o BMAD existente não registra no
   manifesto, Kent e Alethe são copiados para ela, mas as skills BMAD não. O
   comando avisa e indica o instalador oficial interativo
   (`npx bmad-method@6.12.4 install`) para adicionar a integração, porque
   `--update-bmad` preserva a lista de ferramentas.
3. **Customizações:** copia os overrides genéricos de Winston, Amelia e John
   para `_bmad/custom/`, além da skill Kent para o diretório reconhecido da
   ferramenta. Conflitos são preservados por padrão. `--force` substitui
   somente arquivos de template conflitantes; não apaga arquivos extras.
4. **Alethe:** baixa a revisão fixada do repositório público e copia somente a
   pasta `skills/alethe` para os diretórios das ferramentas selecionadas. Não
   há cópia do código-fonte Alethe neste repositório.
5. **Modo global Alethe:** depois de instalar a skill, o comando pede
   consentimento separado para ativar o modo em todos os projetos e adicionar
   a regra BMAD. Recusar mantém a instalação local, sem alterar a configuração
   global.
6. **Instruções de projeto:** grava o bloco BMAD + Alethe em `AGENTS.md`
   (Codex, Cursor, GitHub Copilot, Antigravity) e/ou `CLAUDE.md` (Claude Code).
   Veja [Alethe como entrada padrão](#alethe-como-entrada-padrão).

## Opções do comando

```text
--target <diretório>          Usar um projeto-alvo explícito
--tools <lista>               Substituir detecção; IDs separados por vírgula
--dry-run                     Listar operações sem download, escrita ou mudança global
--force                       Substituir conflitos em arquivos de template
--install-uv                  Autorizar instalação oficial de uv sem prompt
--update-bmad                 Atualizar BMAD existente pela ação oficial pinada
--skip-alethe                 Não instalar Alethe nem tocar no modo global
--enable-alethe-everywhere    Autorizar ativação global sem prompt
--skip-agent-instructions     Não criar nem alterar o bloco em AGENTS.md/CLAUDE.md
--help                        Mostrar ajuda
```

`--skip-alethe` e `--enable-alethe-everywhere` não podem ser usados juntos.
Em modo não interativo, não há consentimento implícito para instalar `uv` ou
ativar o modo global. `--enable-alethe-everywhere` e `--install-uv` são as
autorizações explícitas para essas ações.

O destino precisa existir, ser diretório e não pode ser a raiz do volume ou do
filesystem. O comando não lê `.env`, credenciais ou arquivos pessoais de
customização. Escritas do template preservam conflitos. Links simbólicos e
junctions são aceitos apenas quando apontam para um diretório dentro do próprio
projeto, como `.claude/skills` → `.agents/skills`; links para fora do projeto
ou caminhos incompatíveis são recusados por segurança. Execuções concorrentes no
mesmo projeto são serializadas por um lock temporário. Um lock deixado por uma
execução interrompida é reaproveitado automaticamente quando o processo que o
criou não existe mais.

## Alethe como entrada padrão

### Bloco de instruções do projeto

O mecanismo que liga Alethe e BMAD é um bloco gerenciado gravado na raiz do
projeto, no arquivo que cada ferramenta lê sempre:

| Ferramenta | Arquivo |
| --- | --- |
| Codex, Cursor, GitHub Copilot, Antigravity | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |

```markdown
<!-- agentic-stack:begin — gerenciado por setup-agentic-stack; edite fora deste bloco -->
## Stack agêntica (BMAD + Alethe)

- Atue como líder com a skill `alethe`: escolha entre trabalhar diretamente ou
  delegar unidades independentes a workers CLI, conforme o tamanho e a
  decomposição da tarefa. Não delegue toda tarefa.
- Este projeto tem BMAD (`_bmad/`): use os fluxos e personas BMAD relevantes
  (produto, arquitetura, desenvolvimento) sem exigir que a pessoa os nomeie.
  Não invoque personas em todos os pedidos.
- Para testes, siga a skill `bmad-agent-tdd` (Kent), respeitando o runner e as
  convenções já existentes no projeto.
<!-- agentic-stack:end -->
```

- Se o arquivo não existe, é criado só com o bloco; se existe, o bloco vai
  para o final e nada fora dos marcadores é alterado. LF/CRLF é preservado.
- Com `--skip-alethe`, o bloco é gravado sem a linha do Alethe. Com
  `--skip-agent-instructions`, nenhum desses arquivos é tocado.
- Atualizações seguem a mesma regra dos demais arquivos do template: bloco não
  editado é atualizado sozinho; bloco editado é preservado e a versão nova vai
  para `AGENTS.md.new`/`CLAUDE.md.new`; `--force` substitui só o bloco.
- Se você apagar o bloco, ele não é readicionado nas próximas execuções (use
  `--force` se mudar de ideia).
- Versione `AGENTS.md`/`CLAUDE.md` com o projeto.

O bloco é uma instrução para o modelo, não uma garantia. Para acionar Alethe
explicitamente: `/alethe <tarefa>` no Claude Code, Copilot e Cursor;
`$alethe <tarefa>` no Codex; ou, em qualquer ferramenta, “use a skill alethe
para …”.

### Modo global (opcional)

O modo global do Alethe só é aplicado por ferramentas que executam o hook do
Alethe a cada prompt; o template não instala hooks. Por isso, o bloco do
projeto é o mecanismo principal. Ao aceitar a ativação global, o comando usa a
interface oficial equivalente a:

```text
mode on --everywhere --rule "<instrução condicional BMAD>"
```

A regra pede ao Alethe que use os workflows/personas BMAD relevantes sem exigir
que você os nomeie. Para uma tarefa pequena ou muito acoplada, Alethe pode
trabalhar diretamente. Para uma tarefa que se divide em partes independentes,
pode delegar a workers CLI e revisar o resultado. A regra não transforma
workers em personas BMAD nem força execução de persona em toda solicitação.

Se você recusar o prompt, o comando imprime a instrução completa para ativar
depois usando o script da skill instalada. Para ativar manualmente, execute a
linha impressa pelo instalador com Python 3.9 ou superior.

Para desativar Alethe somente no projeto atual, use a CLI oficial da skill:

```text
python "<caminho-da-skill>/scripts/orchestrate.py" mode off
```

Isso desativa Alethe apenas nesse projeto; o padrão global continua ativo nos
demais. Na revisão Alethe fixada, a CLI **não remove uma regra individual**.
`mode off --everywhere` desliga o padrão global removendo todo o objeto de modo,
incluindo todas as regras e preferências globais salvas nele. Use essa opção
somente se realmente quiser limpar esse estado inteiro. O instalador nunca
executa esse comando, nunca usa `--clear-rules` e não edita arquivos globais
internos. Regras existentes são preservadas ao adicionar a regra BMAD; se o
limite upstream de regras impedir a adição, o comando informa e não limpa
preferências.

## Exemplo de uso

Imagine um repositório existente de catálogo de livros. Depois de preparar o
projeto, peça:

> Quero exportar para CSV os livros que aparecem depois de aplicar os filtros
> da tela. Antes de implementar, identifique as decisões de contrato e como
> este projeto testa funcionalidades parecidas.

Um fluxo possível, não garantido em todos os agentes/IDE:

1. Alethe é o lead padrão e lê o contexto da tarefa.
2. Se houver decisões de produto ou arquitetura, seleciona workflows/personas
   BMAD pertinentes sem exigir que você diga “John”, “Winston” ou “Amelia”.
3. Quando houver código testável, usa a orientação Kent para descobrir o runner
   e os padrões de teste do projeto. Kent não presume framework nem diretório.
4. Alethe decide se mantém o trabalho consigo ou delega partes independentes
   para workers CLI disponíveis. Um worker não é tratado como persona BMAD.
5. O lead revisa o resultado e informa arquivos, testes executados, decisões e
   pendências. Você deve verificar as mudanças e os comandos antes de integrar.

## Atualização e remoção

### Atualizar o comando global

No clone do template:

```sh
git pull
```

Execute novamente `install.ps1`, `install.cmd` ou `install.sh`. O instalador
planeja todas as cópias antes de gravar: se houver qualquer conflito, nenhum
arquivo é alterado, evitando uma instalação com arquivos de versões diferentes.
Revise os conflitos e use `--force` apenas se quiser substituir os arquivos
gerenciados pelo template. O instalador não apaga arquivos desconhecidos.

Se `~/.local/bin` já tiver wrappers `setup-agentic-stack*` de outra origem,
como scripts pessoais anteriores, eles aparecem como conflito. Guarde-os antes
de usar `--force`.

### Atualizar um projeto já configurado

Depois de atualizar o comando global, rode de novo na raiz do projeto:

```sh
setup-agentic-stack --dry-run   # mostra o que será atualizado
setup-agentic-stack
```

Cada execução grava em `_bmad/_config/agentic-stack.json` a versão do template
e o hash de cada arquivo copiado (Kent, `_bmad/custom` e Alethe), sem conteúdo.
Versione esse arquivo junto com o projeto. Na execução seguinte, cada arquivo é
tratado assim:

| Estado do arquivo no projeto | O que acontece |
| --- | --- |
| Igual à versão nova | Nada a fazer |
| Igual ao que foi instalado (não editado) | Atualizado automaticamente, sem `--force` |
| Diferente dos dois (editado) | Preservado; a versão nova é gravada ao lado como `<arquivo>.new` |
| Removido na versão nova | Mantido e listado no resumo para remoção manual |

Kent e Alethe são atualizados por inteiro ou não são atualizados: se um arquivo
de um deles foi editado, nenhum arquivo daquele componente muda, evitando uma
skill com metade em cada versão. Já os overrides de `_bmad/custom` são
independentes e atualizados um a um.

Para resolver um conflito, compare o arquivo com o `.new`, incorpore o que
quiser e rode o comando de novo; o `.new` é removido automaticamente quando o
arquivo fica igual à versão nova. Para descartar suas edições e aceitar tudo,
use `--force`.

Projetos configurados antes do registro (versão 1.0.0 ou scripts manuais) não
têm histórico: arquivos divergentes são tratados como editados e preservados,
com o `.new` ao lado. Depois de revisá-los uma vez, o registro passa a existir
e as próximas atualizações são automáticas.

### Atualizar projetos que já usam o template

A versão 1.2.0 acrescenta o [bloco de instruções](#bloco-de-instruções-do-projeto)
que faz o Alethe liderar e usar BMAD sem você nomear personas. Projetos
configurados com versões anteriores (1.0.0, 1.1.0 ou scripts manuais) recebem
essa mudança pelo mesmo comando, sem perder nada (ou peça ao seu agente com o
[prompt de atualização](#instalar-pelo-seu-agente-de-ia)):

1. **Atualize o comando global** (uma vez por máquina):

   ```sh
   cd caminho/do/agentic-stack-template
   git pull
   ./install.sh        # ou .\install.ps1 / install.cmd
   ```

2. **Em cada projeto**, na raiz, revise e aplique:

   ```sh
   setup-agentic-stack --dry-run
   setup-agentic-stack
   ```

   O dry-run mostra `Atualização 1.1.0 → 1.2.0` e o que acontecerá com
   `AGENTS.md`/`CLAUDE.md`. Se a detecção não encontrar as mesmas ferramentas
   de antes, informe-as com `--tools`; a lista instalada está em `ides:` de
   `_bmad/_config/manifest.yaml`.

3. **Confira e versione** `AGENTS.md`, `CLAUDE.md` e
   `_bmad/_config/agentic-stack.json` no mesmo commit.

O que acontece nessa atualização:

| Situação no projeto | Resultado |
| --- | --- |
| Sem `AGENTS.md`/`CLAUDE.md` | Arquivo criado só com o bloco |
| `AGENTS.md`/`CLAUDE.md` com conteúdo próprio | Bloco acrescentado ao final; seu conteúdo fica intacto |
| Você já escreveu orientação parecida | Revise o dry-run; use `--skip-agent-instructions` ou apague o bloco depois (ele não volta) |
| Kent, `_bmad/custom`, Alethe | Seguem a tabela da seção anterior |
| Modo global Alethe já ativado | Continua igual; a regra não é duplicada |

Para vários projetos em sequência, rode primeiro só o dry-run, revise a saída e
depois repita sem `--dry-run`:

```powershell
# PowerShell
foreach ($p in "C:\Projetos\app-a", "C:\Projetos\app-b") {
  setup-agentic-stack --target $p --dry-run
}
```

```sh
# Git Bash, macOS ou Linux
for p in ~/projetos/app-a ~/projetos/app-b; do
  setup-agentic-stack --target "$p" --dry-run
done
```

Sem `--dry-run`, cada projeto continua perguntando sobre `uv` e o modo global
no terminal; se o modo global já estiver ativado, basta responder “não”. Em
execução não interativa, nada disso acontece sem as flags explícitas.

### Remover o comando global

O template não fornece um comando de desinstalação que apague diretórios sem
revisão. Depois de inspecionar/guardar arquivos que você tenha colocado nas
pastas gerenciadas, remova somente os wrappers `setup-agentic-stack*` de
`~/.local/bin` e a pasta `~/.agentic-stack-template`. Remova também a entrada
correspondente do `PATH` do usuário ou do arquivo de inicialização do shell.

Desativar Alethe no projeto atual é uma ação separada; veja a seção anterior.
Não use `mode off --everywhere` sem entender que ele limpa todas as regras e
preferências do modo global, não apenas a regra BMAD.

### Remover a configuração de um projeto

Não há remoção automática: BMAD, Alethe e as customizações podem ter sido
editados depois da instalação. Revise e remova manualmente apenas arquivos
gerenciados que você reconhece, incluindo `_bmad/_config/agentic-stack.json`. O script não apaga `_bmad/`, diretórios de
skills, customizações ou dados do projeto. Em `AGENTS.md`/`CLAUDE.md`, apague
apenas o trecho entre `<!-- agentic-stack:begin` e `<!-- agentic-stack:end -->`
(inclusive) e o arquivo, se ele só tinha o bloco.

## Solução de problemas

- **Node/npm não encontrados:** instale Node.js 20.12+ pela distribuição
  oficial e reabra o terminal.
- **Python abaixo de 3.10 ou ausente:** BMAD não será declarado instalado;
  instale uma versão compatível e tente novamente.
- **`uv` ausente:** aceite o prompt ou use `--install-uv` em execução
  não interativa. Se não instalar, BMAD ainda pode ser instalado, mas algumas
  skills/scripts Python dependentes de `uv` não funcionarão.
- **`uv` instalado, mas fora do PATH:** o comando também procura nos destinos
  padrão do instalador oficial (`~/.local/bin`, `~/.cargo/bin`) e avisa para
  reabrir o terminal.
- **Git ausente:** Alethe não pode ser baixado; instale o Git ou use
  `--skip-alethe`.
- **Nenhuma ferramenta detectada:** informe `--tools` com os IDs aceitos.
- **Alethe já existe:** os arquivos divergentes são preservados. Revise-os e
  repita com `--force` somente se deseja substituir arquivos da skill.
- **BMAD não atualizou:** sem `--update-bmad`, `_bmad/` não é atualizado.
- **Marcadores `agentic-stack` incompletos ou duplicados:** o arquivo de
  instruções não é alterado, nem com `--force`. Deixe um único par
  begin/end (ou remova ambos) e execute de novo.
- **Agente não segue o bloco:** confirme que abriu a raiz do projeto como
  workspace e acione explicitamente com `/alethe` ou `$alethe`.
- **Conflito ou caminho simbólico:** o comando informa o caminho e não segue
  links simbólicos para fora do projeto. Junctions entre pastas de skills do
  próprio projeto são aceitas.
- **Lock existente:** outra execução está ativa. Locks de execuções
  interrompidas são liberados automaticamente; se o erro persistir, confirme
  que não há setup ativo antes de remover o arquivo indicado.
- **Subdiretório de repositório:** o aviso indica que as IDEs podem não ler as
  skills a partir dessa pasta; rode na raiz do workspace ou use `--target`.
- **Modo Alethe já tem oito regras:** o upstream limita a oito. O template não
  limpa nem substitui regras; resolva a limitação pela interface documentada do
  Alethe antes de tentar novamente.
- **Comando não encontrado depois da instalação:** abra um terminal novo ou
  adicione `~/.local/bin` ao PATH conforme a instrução do instalador.

## Limites, privacidade e licenças

- BMAD, Alethe e `uv` são dependências independentes, com licenças e ciclos de
  atualização próprios. Veja [avisos de terceiros](THIRD_PARTY_NOTICES.md).
- Alethe é baixado no momento do setup de um commit fixado. BMAD é executado
  como pacote npm pinado em `6.12.4`; o template não executa update dele sem
  `--update-bmad`.
- Workers CLI podem usar serviços externos e gerar custos/quota conforme sua
  conta e configuração. Confirme o provedor antes de delegar trabalho sensível.
- O instalador não coleta telemetria, não lê arquivos `.env` nem copia
  credenciais, políticas pessoais, configurações privadas ou conteúdo de
  projetos.
- A escolha das ferramentas, a disponibilidade de personas e o carregamento de
  skills variam por IDE. O template não garante segurança, correção, qualidade
  do resultado, cobertura fiscal, endosso upstream nem uma quantidade fixa de
  skills.
- O projeto é independente e não é afiliado nem endossado pelos mantenedores de
  BMAD, Alethe ou uv. Seus nomes pertencem aos respectivos titulares.

## Desenvolvimento e validação

Este repositório usa apenas APIs nativas do Node.js:

```sh
npm test
npm run check
```

Os testes unitários não executam instaladores externos. A validação de CI roda
em Windows, macOS e Linux; a cobertura de cada plataforma só é afirmada quando
o respectivo job passa.

## Licença

O template está sob [MIT](LICENSE). Essa licença não substitui as licenças das
dependências externas.
