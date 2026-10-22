# Página de Perfil Público e Agendamento Exclusivo do Profissional (/p/[slug])

Criação de páginas de perfil público exclusivas para cada profissional cadastrado na plataforma Studio Digital, com layout moderno, elegante e responsivo, exibindo dados do especialista, dados do estabelecimento, localização, horários de atendimento, catálogo completo de serviços e fluxo interativo de agendamento online para clientes.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> - **Estrutura de URL**: `/p/[slug-ou-id]` (Ex: `/p/lucas-silva` ou `/p/pro_1`), permitindo compartilhamento fácil no Instagram, WhatsApp e bio do profissional.
> - **Fluxo de Agendamento Online**: Fluxo guiado em modal/stepper interativo com seleção de serviço, escolha de data, seleção de horários livres calculados em tempo real e confirmação com dados do cliente.
> - **Estilo Visual**: Design *premium editorial*, com banner de capa de alta resolução, avatar em destaque, tipografia refinada (Plus Jakarta Sans), badges de especialidades e cards de serviços com preços e durações.

---

## 1. Overview & Core Concept

- **O que faz**: Cada profissional da equipe ganha uma página pública exclusiva (Landing Page Pessoal / Link in Bio Premium) acessível em `/p/[slug]` ou `/p/[id]`. A página apresenta a autoridade do profissional, seu local de atendimento (o estabelecimento ao qual está vinculado), sua agenda de funcionamento e permite que novos ou clientes habituais agendem serviços online diretamente com ele sem necessidade de login.
- **Público-alvo**: Clientes finais buscando agendar serviços com o profissional através de links compartilhados no WhatsApp, Instagram, redes sociais ou Google; e os próprios profissionais querendo divulgar seus trabalhos.
- **Valor agregado**: Multiplica a conversão de agendamentos diretos, elimina atrito de agendamento manual por mensagens, profissionaliza a imagem do especialista e conecta-se diretamente à agenda central do Studio no `AppContext`.

---

## 2. User Experience & Visual Design

### Fluxo de Experiência do Cliente (User Journey)
1. **Descoberta & Chegada**: O cliente acessa `/p/lucas-silva` (ou link correspondente). Visualiza um cabeçalho moderno e capa refinada com a foto profissional, nome, bio e o selo do estúdio parceiro.
2. **Contexto & Confiança**:
   - Informações do Estabelecimento: Nome fantasia, tipo de espaço (Salão, Barbearia ou Clínica), endereço físico com botão de direções, telefone e horário de funcionamento geral.
   - Informações do Profissional: Especialidades, bio de apresentação, dias da semana e horários disponíveis para atendimento.
3. **Catálogo de Serviços**:
   - Lista/Cards com serviços executados por aquele profissional (preço em R$, duração estimada em minutos e descrição detalhada).
   - Botão direto em cada card: *"Agendar este Serviço"*.
4. **Agendamento Online Guiado (Modal Interativo)**:
   - **Passo 1: Serviço Selecionado** (possibilidade de trocar ou adicionar observação).
   - **Passo 2: Data & Horário** (seletor de dias com indicação dos dias de trabalho do profissional e grid de horários disponíveis calculados com base na jornada do especialista e agendamentos existentes).
   - **Passo 3: Dados do Cliente** (Nome, WhatsApp/Telefone, E-mail e Observações).
   - **Passo 4: Confirmação Instantânea** (gravação do agendamento em `activeAppointments`, notificação de sistema e botão com atalho para enviar confirmação no WhatsApp com mensagem formatada).
5. **Compartilhamento**: Botão no perfil para copiar o link público e compartilhar no WhatsApp ou Instagram.

### Identidade Visual & Diretrizes Anti-Slop
- **Paleta de Cores (60-30-10)**:
  - 60% Fundo neutro sofisticado (`bg-slate-50` / `bg-white`).
  - 30% Superfícies estruturais em `slate-900`, bordas sutis `border-slate-200/80` e tipografia `slate-800`.
  - 10% Acentos seletivos em tons quentes/dourados (`amber-500` / `indigo-600`) para CTA e botões de ação.
- **Tipografia**: `Plus Jakarta Sans` para títulos e leitura fluida, com algarismos tabulares (`font-mono tabular-nums`) para preços e horários.
- **Metadados Limpos (Zero-Pill)**: Destaques de especialidades e horários com separadores sutis (`·`), sem excesso de pílulas coloridas genéricas.

---

## 3. Key Product Decisions & Trade-Offs

- **Roteamento Inteligente por Slug e ID**:
  - *Abordagem*: O roteador em `App.tsx` capturará caminhos no padrão `/p/:slug`. A função de busca encontrará o profissional tanto pelo `slug` derivado do nome (ex: `lucas-silva`) quanto pelo `id` (ex: `pro_1`), garantindo compatibilidade absoluta.
  - *Alternativa descartada*: Roteamento apenas por ID numérico ou hash encriptado (prejudica a experiência humana ao compartilhar link nas redes sociais).
- **Integração Real com a Agenda do App**:
  - *Abordagem*: O agendamento feito pelo perfil público aciona `addAppointment` do `AppContext`, atualizando imediatamente o `ExecutiveDashboard`, a `AgendaView` e as métricas do studio.
  - *Alternativa descartada*: Criar agendamentos em estado isolado ou falso (desconectaria a visão do gestor).
- **Botão de Acesso Rápido na Gestão de Equipe**:
  - *Abordagem*: Na tela de gerenciamento de profissionais (`ProfessionalsManager`), cada card de profissional terá um botão explícito: *"Ver Perfil Público"* e *"Copiar Link"*, facilitando o teste e o uso pelos donos do estabelecimento.

---

## 4. Technical Architecture & Data Strategy

### Diagrama de Arquitetura & Fluxo de Componentes

```
┌───────────────────────────────────────────────────────────────┐
│                     Navegador / Cliente                       │
│                   URL: /p/[slug-ou-id]                         │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              RootRouter (src/App.tsx)                          │
│     Captura rotas com prefixo '/p/' e renderiza view pública  │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│   ProfessionalProfilePage (src/components/public/...)         │
│   - Busca profissional por slug/id no AppContext              │
│   - Busca estabelecimento correspondente no AppContext        │
│   - Filtra serviços habilitados para o profissional           │
├───────────────────────────────┬───────────────────────────────┤
│ Seções:                       │ Modais:                       │
│ ├─ ProfileHeader (Capa/Avatar)│ └─ OnlineBookingModal         │
│ ├─ EstablishmentInfoCard      │    ├─ Seletor de Data         │
│ ├─ ProfessionalBio & Schedule │    ├─ Grade de Horários Livres│
│ └─ ServiceCatalogGrid         │    └─ Confirmação + WhatsApp  │
└───────────────────────────────┴───────────────────────────────┘
                                │
                                ▼ Dispara ação
┌───────────────────────────────────────────────────────────────┐
│                   AppContext (Central State)                  │
│       - addAppointment() -> Atualiza agenda global            │
│       - addNotification() -> Alerta o estabelecimento         │
└───────────────────────────────────────────────────────────────┘
```

### Arquivos a serem criados/modificados:
1. `src/components/public/ProfessionalProfilePage.tsx`: Componente principal do perfil público do profissional.
2. `src/components/public/OnlineBookingModal.tsx`: Modal interativo com fluxo guiado de agendamento online.
3. `src/utils/slugify.ts`: Utilitário para gerar slugs amigáveis e correspondência bidirecional.
4. `src/App.tsx`: Atualização do `RootRouter` para interceptar `/p/*` e renderizar a página pública.
5. `src/components/professionals/ProfessionalsManager.tsx`: Inclusão dos botões de *"Ver Perfil Público"* e *"Copiar Link"* em cada profissional.
