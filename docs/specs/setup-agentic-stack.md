# SPEC: Template público `agentic-stack-template`

**ID:** SPEC-20261025-001  
**Data:** 2026-10-25  
**Autor:** Usuário solicitante  
**Status:** APROVADO — revisão 3

## 1. Contexto

### 1.1 Resumo

Criar e publicar um repositório MIT com instaladores multiplataforma para
preparar uma stack de agentes em projetos existentes, usando BMAD, as
customizações genéricas de personas/Kent e Alethe como porta de entrada
padrão.

### 1.2 Problema que resolve

As customizações atuais estão em caminhos absolutos da máquina do autor e
contêm regras do Vendox. Outras pessoas não conseguem instalá-las com
segurança e previsibilidade em seus projetos.

### 1.3 Público e atores

- Desenvolvedores que clonam o repositório e instalam o comando em sua própria
  máquina.
- O usuário local que executa `setup-agentic-stack` em um projeto.
- Instaladores externos: BMAD, Alethe, Node/npm, `uv` e ferramentas de IDE.

### 1.4 Fora do escopo

- Implementar funcionalidades do Vendox ou NF Simplifica.
- Incluir políticas pessoais, segredos, configuração local do autor ou regras
  específicas do Vendox.
- Copiar e republicar os arquivos do Alethe ou BMAD dentro deste repositório.
- Executar testes reais de pagamento, banco de dados, emissão fiscal ou APIs de
  produção.
- Forçar uso de um framework de testes, arquitetura ou número de testes em
  projetos-alvo.
- Configurar Alethe como obrigatoriamente paralelo em todas as tarefas.
- Garantir que toda persona BMAD seja executada em cada solicitação ou que uma
  quantidade fixa de skills seja instalada.

## 2. Requisitos funcionais

### 2.1 Repositório e distribuição

1. Criar projeto independente `agentic-stack-template` no diretório de
   projetos escolhido pelo usuário.
2. Criar repositório público `JohnnyPessoli/agentic-stack-template` com
   licença MIT própria.
3. Fornecer README em português brasileiro e documentação equivalente em
   inglês, explicando de forma robusta e simples a instalação, os passos de
   uso, o que cada ferramenta faz, como Alethe e BMAD se complementam, exemplo
   de uso, atualização, desinstalação, troubleshooting, custos e limitações.
4. Não modificar o Git, arquivos ou alterações pendentes do NF Simplifica.
5. Não substituir automaticamente os scripts ou o template pessoal existentes
   em `~/.local/bin` e `~/.agentic-template`.

### 2.2 Instalação do comando global

**Entrada:** pessoa clona o repositório e executa o instalador adequado para
PowerShell, CMD, Git Bash, macOS ou Linux.

**Processamento:** o instalador coloca a cópia versionada do template em
`~/.agentic-stack-template` (equivalente de usuário no Windows) e os wrappers
em `~/.local/bin` (equivalente Windows). Atualizações mantêm essa separação.
O PATH do usuário só é alterado após confirmação explícita.

**Saída:** `setup-agentic-stack` pode ser chamado em outros terminais após
reinício/recarregamento do ambiente. Se o usuário não permitir a alteração do
PATH, os scripts continuam instalados e o instalador imprime instruções
específicas para configuração manual.

**Critérios adicionais:**

- Instalação idempotente; conflitos com wrappers ou diretórios existentes são
  preservados por padrão.
- Não requer elevação de privilégios.
- Atualização do comando obtém mudanças do repositório clonado e não apaga
  dados locais do usuário.
- A instalação inicial não altera o PATH nem arquivos globais sem
  consentimento.

### 2.3 Instalação em projeto-alvo

O comando aceita o diretório atual como alvo padrão e um argumento explícito
`--target <diretório>`. O destino deve existir, ser um diretório e não ser a
raiz de volume/filesystem. O comando não apaga arquivos do projeto.

Opções obrigatórias:

| Opção | Comportamento |
| --- | --- |
| `--target <diretório>` | Seleciona explicitamente o projeto-alvo |
| `--tools <lista>` | Sobrescreve a detecção com IDs de ferramenta permitidos |
| `--dry-run` | Mostra operações previstas; não grava, não instala ferramentas e não muda configurações globais |
| `--force` | Permite substituir somente arquivos de template identificados como conflito |
| `--install-uv` | Autoriza instalar `uv` no ambiente do usuário em modo não interativo |
| `--update-bmad` | Em projeto com `_bmad/`, autoriza executar o update oficial BMAD 6.12.4; sem ele, preservar BMAD existente |
| `--skip-alethe` | Não instala Alethe nem altera seu estado global |
| `--enable-alethe-everywhere` | Em modo não interativo, autoriza ativar Alethe globalmente e adicionar a regra BMAD |
| `--help` | Exibe uso, requisitos e opções sem modificar o ambiente |

Opções mutuamente incompatíveis devem falhar antes de qualquer alteração. Em
execução não interativa, não inferir consentimento para mudança de PATH,
instalação de `uv` ou ativação global de Alethe.

### 2.4 Pré-requisitos

- Git para clonar o repositório e fixar a revisão de Alethe.
- Node.js 20.12+ e npm/npx para BMAD.
- Python 3.10+ para o instalador BMAD. `uv` é necessário por algumas skills e
  scripts: pedir consentimento para instalar quando ausente; se a pessoa
  recusar, instalar BMAD e informar que esses recursos não funcionarão até
  instalar `uv`. Em modo não interativo, só tentar instalar com
  `--install-uv`; sem essa opção, continuar com aviso.
- Pelo menos uma ferramenta compatível com a instalação BMAD.
- Acesso de rede ao npm e aos repositórios upstream no momento da instalação.

Não instalar Node ou Python automaticamente. Se estiverem ausentes ou abaixo
da versão necessária, informar a versão detectada e as instruções oficiais para
corrigir; não prosseguir como se a etapa tivesse sucesso.

### 2.5 BMAD e ferramentas

1. Usar a versão estável `bmad-method@6.12.4` com o módulo oficial `bmm`, não
   a linha v7 alpha.
2. O idioma padrão de comunicação e documentação gerada pelo BMAD é português.
3. A lista inicial de ferramentas suportadas pelo template é exatamente a do
   comando original: `antigravity-cli`, `claude-code`, `codex`, `cursor` e
   `github-copilot`. Embora o BMAD aceite outras integrações, não adicioná-las
   implicitamente ao template.
4. Permitir seleção explícita por `--tools`, validada por allowlist.
5. Se nenhuma ferramenta for detectada ou selecionada, falhar antes da
   instalação BMAD, explicando as opções suportadas.
6. Reportar as ferramentas selecionadas e o resultado real do instalador. Não
   anunciar “29 skills” ou outra quantidade fixa sem validar o resultado da
   versão instalada.
7. Antes de implementar o comando, validar no pacote fixado os nomes de flags,
   IDs de ferramentas, instalação não interativa e suporte aos dois idiomas.
8. Se `_bmad/` já existir, não chamar o instalador BMAD por padrão. Reportar
   versão/módulos detectados e preservar a instalação. Com `--update-bmad`,
   usar `--action update --yes` na versão `6.12.4`, sem passar `--tools` nem
   `--modules` para não substituir as seleções existentes; seguir os padrões
   de atualização de módulos do BMAD e reportar o que o instalador disser.
   `--force` não implica update BMAD. Se não existir `_bmad/`, fazer instalação
   inicial normal, mesmo que `--update-bmad` tenha sido passado.

### 2.6 Templates e Kent TDD

- Adaptar os overrides existentes para Winston (arquitetura), Amelia
  (desenvolvimento) e John (produto), sem fatos Vendox.
- Manter Kent como especialista TDD, com fluxo Red-Green-Refactor.
- Kent deve identificar instruções, testes e runner existentes no projeto-alvo
  antes de sugerir ou executar testes; não impor Vitest, diretórios,
  arquitetura, limiares ou contagens predefinidos.
- Não criar `AGENTS.md`, `CONTEXT.md` ou outros arquivos de instrução do projeto
  automaticamente se já não forem necessários à integração.
- Copiar apenas arquivos de template versionados; não incluir o `config.user`
  pessoal da fonte original.

### 2.7 Alethe como orquestrador padrão

1. Por padrão, instalar somente a skill Alethe a partir do repositório upstream
   `Kc1t/alethe-orchestrate-skill`, fixada no commit
   `3268b6d115cb27d58ebf3409de6c49d55f919477`. Não copiar o restante do
   repositório upstream.
2. `--skip-alethe` pula instalação e configuração global.
3. Após instalar Alethe, oferecer ativação global do modo
   `mode on --everywhere`. Explicar antes que isso afeta todos os projetos do
   usuário, sem expiração. Nunca ativar silenciosamente.
4. Com consentimento, adicionar por interface documentada do Alethe uma regra
   aditiva equivalente a:

   > Quando o projeto tiver BMAD instalado, use os fluxos e personas BMAD
   > relevantes sem exigir que a pessoa os nomeie. Atue como líder e escolha
   > entre trabalhar diretamente ou orquestrar workers de acordo com o tamanho
   > e a decomposição da tarefa.

5. Preservar regras e preferências Alethe existentes; não usar opções que as
   limpem ou substituam. Se a regra já existir, não duplicá-la. Se não puder
   ser adicionada sem remover regras, informar a limitação e instruir resolução
   manual; não reportar ativação completa.
6. Sem consentimento, não mudar configuração global e mostrar a instrução
   única suportada para ativar depois.
7. Em execução não interativa, só ativar globalmente se
   `--enable-alethe-everywhere` estiver presente. A instalação do Alethe e a
   ativação global são estados distintos no resumo final.
8. Não exigir que o usuário chame Kent, Winston, Amelia ou John pelo nome.
   Alethe pode tratar diretamente tarefas pequenas/acopladas; deve selecionar
   o fluxo BMAD pertinente quando apropriado e pode delegar trabalho
   independente conforme suas regras e configurações. Não prometer execução de
   uma persona BMAD em todas as tarefas.
9. Não alterar configurações globais do usuário fora do consentimento descrito
   e da interface oficial do Alethe.
10. Documentar que `mode off` desativa Alethe somente no projeto atual e mantém
    o modo global nos demais. `mode off --everywhere` remove o objeto inteiro
    do modo global, incluindo todas as regras e preferências nele armazenadas.
    Alertar explicitamente sobre esse efeito e nunca executar esse comando pelo
    instalador. A revisão pinada não permite remover uma regra individual.
    Não usar `--clear-rules` nem editar arquivos globais não documentados.

### 2.8 Saída e erros

| Situação | Resultado observável |
| --- | --- |
| Configuração concluída | Exit code `0`; resumo separa sucesso, skip e ativação global |
| Argumento inválido, ferramenta desconhecida ou opções incompatíveis | Não executar alterações; exit code não zero e mostrar uso |
| Destino inválido ou inacessível | Não instalar; explicar o caminho e a correção |
| Conflito sem `--force` | Preservar arquivos e informar cada conflito |
| `uv` ausente e usuário recusa instalação | Continuar BMAD com aviso explícito sobre workflows/scripts que dependem de `uv` |
| `uv` ausente sem `--install-uv` em modo não interativo | Continuar BMAD com aviso explícito; não alterar o ambiente |
| BMAD existente sem `--update-bmad` | Preservar `_bmad/`; reportar versão/módulos e não executar o instalador BMAD |
| BMAD existente com `--update-bmad` | Executar update oficial pinado, preservando lista de tools e usando política upstream de módulos |
| Falha em BMAD, Alethe ou alteração autorizada de modo global | Reportar etapa específica e código não zero; não afirmar sucesso completo |
| Alethe instalado, mas consentimento global recusado | Considerar configuração local concluída e reportar “Alethe global não ativado” |
| `--dry-run` | Exit code `0` se opções/destino forem válidos; listar ações e não produzir efeitos |

Mensagens e instruções próprias do comando ficam em português; preservar a
saída original dos instaladores quando necessária para diagnóstico, sem
capturar ou persistir credenciais.

## 3. Segurança e privacidade

| Item | Resposta |
| --- | --- |
| 1. Dados e finalidade | Entradas: argumentos, caminhos, comandos encontrados no PATH e evidências mínimas de instalação das IDEs para detecção. Finalidade: selecionar integração e arquivos de destino. Saídas: arquivos de configuração e estado de modo Alethe se autorizado. Não coletar dados fiscais, empresariais, pessoais de destinatários nem conteúdo de `.env`. Não há linhas do inventário NF Simplifica afetadas: este é um repositório independente de tooling. |
| 2. Atores e autorização por recurso | A pessoa local autoriza execução e alterações. Não há autenticação de rede nem serviço remoto próprio. Usar as permissões do usuário atual; nunca elevar privilégios. `--force`, `--update-bmad`, `--install-uv`, edição de PATH e modo global Alethe precisam da autorização definida nesta spec. |
| 3. Fronteiras e fluxo | Terminal do usuário → scripts locais → npm/GitHub upstream → arquivos do projeto e, se consentido, configuração global Alethe. BMAD/Alethe executam seu próprio código e podem chamar CLIs de IA depois de instalados; isso é comportamento externo. Sem navegador/BFF/API/banco/fornecedor fiscal no NF Simplifica. |
| 4. Sigilo do fornecedor | Não aplicável — a ferramenta não trata NF Simplifica, fornecedor fiscal, XML/PDF fiscal, integrações ou contratos de fornecedores. Não importar os documentos/políticas de fornecedor do projeto de origem. |
| 5. Segredos e material criptográfico | Nenhum segredo é necessário ou criado pelo template. Não ler `.env`, credenciais npm, tokens Git, configuração de sessão de IDE, chaves ou certificados. Processos upstream podem usar credenciais já configuradas pelo usuário; não inspecioná-las, registrá-las ou copiá-las. |
| 6. Entradas externas e validações | Validar opções por allowlist, caminho canônico, existência/diretório/escopo do destino e parâmetros separados sem concatenação de shell. Restringir fontes e versões upstream; rejeitar IDs de ferramenta desconhecidos. Testar espaços, Unicode, aspas, metacaracteres, diretórios com `..`, raiz de volume, repositório ausente e respostas de subprocessos com falha. Não aceitar URL arbitrária para baixar/executar. |
| 7. Erros, logs, auditoria e telemetria | Não instalar telemetria própria nem persistir logs. Exibir progresso e códigos de saída; evitar ecoar tokens, conteúdo de `.env`, regras Alethe existentes ou saídas que contenham segredo. Mostrar caminho do alvo somente localmente. Saída upstream pode ser exibida para diagnóstico após revisão; sem sucesso fictício. |
| 8. Armazenamento, retenção e descarte | Arquivos do stack ficam no alvo e na pasta de instalação local do usuário; a regra Alethe consentida fica no armazenamento mantido pelo próprio Alethe. Não armazenar conteúdo de projeto como cache próprio. Arquivos temporários de clone/download são removidos ao final, sem limpar dados não pertencentes ao processo. Sem política fiscal/LGPD ou retenção de dados de produto aplicável. |
| 9. Abuso, indisponibilidade e recuperação | Alvo restrito ao caminho informado; não operar na raiz do filesystem; sem elevação. Sem retentativa ilimitada. Falha de rede/serviço externo encerra a etapa com erro claro. Execuções simultâneas devem evitar escrita parcial (lock ou staging/rename atômico). Custos de workers podem ocorrer depois; Alethe conserva seu modo de custo padrão e o README explica consumo potencial. |
| 10. Testes negativos e critérios de aceite | VAL-01..03, 05..07, 09..10 e 12 não aplicáveis — não há isolamento entre empresas, APIs, arquivos fiscais, armazenamento de produto, filas, cobrança ou backup. Testar analogamente a VAL-04/08/11: marcador sintético de segredo ausente em saída; falha e configuração inválida não concedem acesso nem reportam sucesso; testar argumentos maliciosos, conflito, falta de consentimento, `--dry-run`, falha externa e regra Alethe já existente/limite de regras. Evidência: teste local/mock e GitHub Actions; smoke test local Windows. |
| 11. Riscos residuais e dependências | Risco de cadeia de suprimentos em npm/GitHub e alterações upstream; mitigado com versão/commit fixos e validação de integridade disponível. O usuário autoriza explicitamente mudanças globais. A regra Alethe é global e pode afetar outros projetos; o modo pode resultar em uso/custo de workers. Dependências podem ficar indisponíveis. Não há controles da matriz NF Simplifica afetados e nenhuma alegação de segurança do produto é feita. |

Controles afetados na matriz NF Simplifica: nenhum. Inventário de dados NF
Simplifica: nenhuma linha afetada.

## 4. Contrato da interface

### 4.1 Comando

```text
setup-agentic-stack [--target <diretório>] [--tools <lista>] [--dry-run]
                    [--force] [--install-uv] [--update-bmad] [--skip-alethe]
                    [--enable-alethe-everywhere] [--help]
```

- Sem `--target`, resolver o diretório de trabalho atual e exibir o destino.
- Valores e caminhos devem ser encaminhados como argumentos individuais, não
  interpolados em comandos.
- Exit code `0` significa que as etapas requeridas foram concluídas; qualquer
  falha requerida retorna código não zero. Ativação Alethe recusada não é
  falha da instalação por projeto, mas aparece explicitamente no resumo.

### 4.2 Efeitos por destino

Escrever apenas arquivos enumerados pelo BMAD ou pelos templates do stack:

- `_bmad/custom/` para overrides de equipe, sem sobrescrever por padrão;
- skill Kent nos diretórios reconhecidos pelo instalador de habilidades;
- skill Alethe somente nos diretórios reconhecidos para os tools selecionados;
- sem arquivos de projeto adicionais para orientação Alethe, salvo se a
  documentação upstream demonstrar que são necessários e a spec for atualizada
  antes de implementá-los.

Não inventar uma interface que o BMAD/Alethe upstream não aceite. Se as
interfaces fixadas não suportarem os requisitos de idioma, seleção, pinagem ou
regra persistente, interromper essa parte e atualizar esta spec antes de
prosseguir.

## 5. Arquitetura e dependências

```text
Clone GitHub → instalador por OS → comando global em ~/.local/bin
                                      ↓
                         projeto-alvo + confirmação
                           ↙       ↓       ↘
                    BMAD 6.12.4  Kent   Alethe SHA pinado
                                            ↓ consentimento global
                                  Alethe always + regra BMAD
```

| Dependência | Versão/revisão | Propósito | Falha |
| --- | --- | --- | --- |
| Node.js/npm | Node 20.12+ | Executar o instalador BMAD | Interromper BMAD e indicar instalação oficial |
| Python | Python 3.10+ | Scripts do BMAD e configuração do Alethe | Não instalar automaticamente; indicar requisito |
| `uv` | versão oficial disponível no momento, validada antes de uso | Algumas skills/scripts BMAD | Pedir consentimento; se recusado, concluir BMAD com aviso |
| `bmad-method` | 6.12.4, módulo `bmm` | Método e agentes/workflows BMAD | Reportar erro sem resumo de sucesso; update existente só com `--update-bmad` |
| `Kc1t/alethe-orchestrate-skill` | commit fixo acima | Skill/orquestrador e ativação de modo | Não alternar para `main`; reportar falha |
| Ferramentas de IDE | IDs allowlisted reconhecidos pelo BMAD 6.12.4 | Instalação das skills/integrações | Detecção documentada ou override explícito |
| Git | versão presente no sistema | Clone da instalação e revisão Alethe | Instruir instalação oficial |

## 6. Testes e validação

### 6.1 Casos críticos

| ID | Cenário | Resultado esperado | Evidência |
| --- | --- | --- | --- |
| T-01 | Instalação em projeto descartável vazio | BMAD e arquivos do stack nos caminhos esperados, PT configurado | Smoke test controlado |
| T-02 | Projeto com arquivos de customização conflitantes | Sem `--force`, preservar bytes e informar conflitos | Fixture + teste |
| T-03 | Mesmo comando repetido | Sem duplicar skills/regras nem substituir customizações | Fixture + smoke |
| T-04 | `--dry-run` com etapas configuráveis | Nenhum arquivo, download, PATH ou modo global alterado | Comparação do estado antes/depois |
| T-05 | Sem IDE detectada e sem override | Falhar antes de invocar BMAD | Mock de subprocesso |
| T-06 | `--tools` com ID inválido ou metacaractere | Rejeitar antes da execução externa | Teste de entrada |
| T-07 | `uv` ausente e instalação recusada | BMAD ainda instala; relatório informa limitações de workflows Python | Fixture/mock |
| T-08 | `uv` ausente com `--install-uv` | Executar instalador oficial com consentimento; se falhar, continuar BMAD e reportar a limitação e o resultado parcial | Mock; smoke apenas se consentido |
| T-09 | Alethe instalado, modo global recusado | Nenhuma alteração global; relatório explicita estado | Fixture/mock |
| T-10 | Alethe global autorizado | Uma regra BMAD adicionada, regras existentes intactas; modo global ligado | Teste isolado de configuração |
| T-11 | Regra já existe ou limite upstream atingido | Não duplicar, limpar ou substituir; reportar ativação incompleta | Fixture/mock |
| T-12 | Instalador externo retorna erro ou rede cai | Não exibir sucesso completo; código não zero | Mock de processo |
| T-13 | Caminho contém espaços, Unicode ou shell metacharacters | Resolver e encaminhar literalmente sem executar conteúdo do caminho | Testes em cada OS |
| T-14 | Marcador sintético de segredo em ambiente não usado pelo tool | Marcador não aparece na saída nem em artefatos gerados | Teste local |
| T-15 | Comando global via PowerShell, CMD, Git Bash, macOS e Linux | Encaminha argumentos e retorna status correto | GitHub Actions por OS |
| T-16 | Projeto com `_bmad/`, sem e com `--update-bmad` | Sem flag, preservar; com flag, executar `--action update --yes` sem trocar lista de tools/modules | Mock de processo + fixture |
| T-17 | Desativar Alethe após opt-in global | Documentar `mode off` apenas no projeto; avisar que `mode off --everywhere` limpa todas as regras/preferências globais e nunca executar esse comando pelo instalador | Revisão de documentação + mock |

### 6.2 Critérios de aceite mensuráveis

- Todos os casos T-01..T-17 aplicáveis passam.
- GitHub Actions valida Windows, macOS e Linux; nenhum sistema é anunciado como
  suportado se o job correspondente falhar.
- Instalação e smoke test são executados apenas em diretórios temporários
  descartáveis.
- O repositório não contém Vendox, tokens, secrets, `config.user.toml` nem
  arquivos Alethe copiados; buscas e inspeção de licença registradas.
- README PT/EN contém os passos da instalação global e do setup por projeto,
  comandos e opções reais, troubleshooting e pelo menos um exemplo completo
  com entrada, decisões do Alethe, uso de BMAD/Kent, verificação e resultado.
- README PT/EN explica didaticamente as responsabilidades distintas e a
  complementaridade entre BMAD, Kent, Alethe e workers CLI; não afirma que um
  worker seja uma persona BMAD nem que Alethe invoque personas em cada prompt.
- A revisão de licenças atribui MIT ao template e diferencia as dependências
  externas.

## 7. Documentação: complementaridade e caso de uso

As documentações PT/EN devem explicar estes papéis sem sugerir que uma
ferramenta substitui a outra:

| Ferramenta | Papel na stack | Limite a explicar |
| --- | --- | --- |
| BMAD | Método, workflows e personas especializadas | Não é o orquestrador de workers desta stack |
| Kent | Persona TDD que respeita o runner e convenções do projeto | Não impõe framework nem substitui os testes do projeto |
| Alethe | Lead padrão; escolhe orientação pertinente e trabalho direto ou dividido | Não é uma persona BMAD e não delega toda tarefa automaticamente |
| Worker CLI | Executor externo de uma unidade delegada pelo Alethe | Não equivale automaticamente a uma persona/workflow BMAD |

Fluxo conceitual a incluir:

```text
Pedido em linguagem natural
          ↓
Alethe (lead padrão)
          ↓
Consulta BMAD/Kent quando aplicável
          ↓
Decide: trabalho direto ou unidades para workers CLI
          ↓
Valida o resultado e relata decisões/pendências
```

Exemplo sintético requerido: em um repositório existente de catálogo de livros,
a pessoa pede em linguagem natural uma exportação CSV dos itens filtrados.
Mostrar:

1. Como clonar/instalar o comando e preparar o projeto.
2. Alethe ativo como lead após opt-in global, com regra condicionada à presença
   de BMAD.
3. Explicação de que Alethe lidera; BMAD fornece método/workflows, Kent
   orientação TDD e workers CLI executam tarefas delegadas sem serem
   automaticamente personas BMAD.
4. Alethe identificando decisões de contrato/arquitetura, selecionando
   orientações BMAD e Kent quando pertinentes, sem exigir que a pessoa cite os
   nomes.
5. Alethe decidindo se trabalha diretamente ou divide unidades independentes,
   sem workers forçados numa mudança pequena.
6. Validação e resumo de arquivos, decisões, testes e pendências.

Não usar nomes, dados, regras, repositórios ou métricas do Vendox/NF Simplifica
no exemplo. Deixar claro que a seleção de persona depende do contexto e das
capacidades da IDE; validar qualitativamente o fluxo em pelo menos uma IDE
antes de afirmar integração automática ampla.

## 8. Itens pendentes de validação técnica

1. Confirmado no `install.js` oficial do branch `V6.12`: BMAD aceita
   `--modules`, `--tools`, `--yes`, `--directory`,
   `--communication-language`, `--document-output-language`, `--action` e
   `--list-tools`.
   Confirmados os cinco IDs acima no `platform-codes.yaml`. Antes de
   implementar, validar instalação headless e opções contra o pacote npm
   pinado `6.12.4`; se diferirem, atualizar a spec e pedir decisão.
2. Instalação de skill Alethe na revisão pinada: confirmar sintaxe suportada e
   cópia apenas de `skills/alethe` para os diretórios das ferramentas.
3. Confirmado no `SKILL.md` e script Python oficial da revisão pinada do
   Alethe: `mode on --everywhere` e `--rule` mantêm ativação global e regra
   persistente; regras duplicadas são ignoradas e o máximo é oito. Validar
   execução na cópia pinada, leitura de estado e mensagem quando o limite for
   atingido; nunca usar `--clear-rules`.
4. Validar detecção e caminhos de instalação dos cinco IDs BMAD v6.12.4 nos
   três sistemas operacionais.

## 9. Ajustes de robustez (revisão 4 — pendente de aprovação)

Correções para instalar em projetos novos e em andamento, sem alterar o
contrato de opções:

1. Links simbólicos/junctions são aceitos somente quando o destino real é um
   diretório dentro do projeto-alvo (ex.: `.claude/skills` → `.agents/skills`);
   links para fora continuam recusados.
2. O lock do projeto guarda o PID; um lock cujo processo não existe mais é
   reaproveitado. Lock de processo ativo continua bloqueando.
3. `uv` também é procurado nos destinos padrão do instalador oficial
   (`UV_INSTALL_DIR`, `XDG_BIN_HOME`, `~/.local/bin`, `~/.cargo/bin`), com
   aviso quando estiver fora do PATH.
4. O instalador global planeja todas as cópias antes de gravar; com conflito ou
   caminho inseguro, nenhum arquivo é alterado.
5. Avisos não bloqueantes: destino em subdiretório de repositório Git e
   ferramentas selecionadas ausentes do manifesto BMAD existente (sem passar
   `--tools` ao update, conforme 2.5.8).
6. `--dry-run` informa pré-requisitos detectados (Node.js, npm, Python, `uv`,
   Git) sem instalar nada; Git ausente gera erro específico na etapa Alethe.
7. O comando manual de ativação Alethe usa o interpretador Python detectado.

## Aprovação

| Revisor | Status | Data | Comentários |
| --- | --- | --- | --- |
| Usuário solicitante | ✅ Aprovado | 2026-10-25 | Aprovou a revisão 2 e autorizou implementação; confirmou manter opt-in global e a regra BMAD, com aviso de que `mode off --everywhere` limpa todas as regras/preferências globais (revisão 3). |
