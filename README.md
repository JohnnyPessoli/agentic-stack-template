# Agentic Stack Template

Instale uma combinação reutilizável de **BMAD**, **Kent (TDD)** e **Alethe**
em um projeto existente. O template oferece instaladores para Windows,
macOS e Linux; não é necessário copiar scripts manualmente para cada projeto.

**English:** [README in English](README.en.md).

> O Alethe é o ponto de entrada padrão quando seu modo global é ativado. Você
> pode descrever a tarefa em linguagem natural sem chamar uma persona BMAD pelo
> nome. Alethe decide quando usar workflows/personas BMAD, quando trabalhar
> diretamente e quando delegar partes independentes a workers CLI. Ele não
> delega toda tarefa nem invoca uma persona BMAD em todos os pedidos.

## Como BMAD, Kent, Alethe e workers se complementam

| Componente | O que faz | O que não significa |
| --- | --- | --- |
| **Alethe** | Atua como lead/orquestrador padrão quando o modo global é autorizado. Interpreta o pedido, escolhe orientação pertinente e decide entre trabalho direto ou delegação. | Não é uma persona BMAD. Não exige paralelismo em toda tarefa. |
| **BMAD** | Fornece método, workflows e personas especializadas, como arquitetura, desenvolvimento e produto. | Não é o orquestrador de workers desta stack. |
| **Kent** | Persona de TDD que descobre e respeita o runner e as convenções que já existem no projeto. | Não instala Vitest/Jest/pytest, não impõe diretórios nem limites de cobertura. |
| **Worker CLI** | Ferramenta externa que pode executar uma unidade delegada por Alethe. | Um worker não é automaticamente uma persona ou workflow BMAD. |

O instalador coloca a skill Alethe nas pastas das ferramentas selecionadas e,
se você consentir, ativa o modo global oficial do Alethe e adiciona uma regra
condicional para selecionar BMAD quando o projeto tiver BMAD. A ativação global
vale para todos os seus projetos e não expira. O comportamento final também
depende da IDE e do agente que você usa.

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

Entre na pasta do projeto. Faça primeiro um dry-run:

```sh
cd caminho/do/seu/projeto
setup-agentic-stack --dry-run
```

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
--help                        Mostrar ajuda
```

`--skip-alethe` e `--enable-alethe-everywhere` não podem ser usados juntos.
Em modo não interativo, não há consentimento implícito para instalar `uv` ou
ativar o modo global. `--enable-alethe-everywhere` e `--install-uv` são as
autorizações explícitas para essas ações.

O destino precisa existir, ser diretório e não pode ser a raiz do volume ou do
filesystem. O comando não lê `.env`, credenciais ou arquivos pessoais de
customização. Escritas do template preservam conflitos; caminhos simbólicos ou
incompatíveis são recusados por segurança. Execuções concorrentes no mesmo
projeto são serializadas por um lock temporário.

## Alethe como entrada padrão

Ao aceitar a ativação global, o comando usa a interface oficial equivalente a:

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
projeto e aceitar o modo global, peça:

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

Execute novamente `install.ps1`, `install.cmd` ou `install.sh`. Se houver
conflitos, revise-os; use `--force` apenas se quiser substituir os arquivos
gerenciados pelo template. O instalador não apaga arquivos desconhecidos.

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
gerenciados que você reconhece. O script não apaga `_bmad/`, diretórios de
skills, customizações ou dados do projeto.

## Solução de problemas

- **Node/npm não encontrados:** instale Node.js 20.12+ pela distribuição
  oficial e reabra o terminal.
- **Python abaixo de 3.10 ou ausente:** BMAD não será declarado instalado;
  instale uma versão compatível e tente novamente.
- **`uv` ausente:** aceite o prompt ou use `--install-uv` em execução
  não interativa. Se não instalar, BMAD ainda pode ser instalado, mas algumas
  skills/scripts Python dependentes de `uv` não funcionarão.
- **Nenhuma ferramenta detectada:** informe `--tools` com os IDs aceitos.
- **Alethe já existe:** os arquivos divergentes são preservados. Revise-os e
  repita com `--force` somente se deseja substituir arquivos da skill.
- **BMAD não atualizou:** sem `--update-bmad`, `_bmad/` não é atualizado.
- **Conflito ou caminho simbólico:** o comando informa o caminho e não segue
  links simbólicos para fora do projeto.
- **Lock existente:** outra execução pode estar ativa ou uma execução anterior
  foi encerrada inesperadamente. Confirme que não há setup ativo antes de
  remover o arquivo de lock temporário indicado pelo erro.
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
