# Sistema Completo de Clientes no Studio Digital

Implementação completa de cadastro, autenticação, gerenciamento de perfil e portal exclusivo para usuários do tipo **Cliente** na plataforma web Studio Digital, totalmente integrado ao sistema de autenticação e aos papéis existentes: **Profissional**, **Gerente** e **CEO (Super Admin)**.

---

## 1. Cadastro e Autenticação de Clientes

- **Página de Cadastro Pública** (`/cadastro` e `/cadastro-cliente`):
  - Componente: `src/components/auth/ClientSignupPage.tsx`
  - Campos solicitados e validados:
    - Nome completo (`name`)
    - E-mail (`email`) com validação de formato e unicidade no sistema e no Firebase Firestore
    - Telefone / WhatsApp com máscara dinâmica `(XX) XXXXX-XXXX`
    - Data de nascimento restrita a Dia (1-31) e Mês (1-12)
    - Foto de perfil (seleção rápida entre avatares pré-definidos de alta resolução ou URL personalizada)
    - Senha (mínimo de 6 caracteres) e confirmação de senha idêntica
  - Atribuição automática e estrita do perfil `client` (o usuário não escolhe nem altera seu próprio perfil).
  - Suporte a autenticação direta com conta Google via `signInWithPopup(auth, googleProvider)`.
  - Link direto de redirecionamento para login de clientes existentes.

- **Login e Logout Seguros**:
  - `src/components/auth/UnifiedLoginPage.tsx`: Aba dedicada **Cliente** com preenchimento de demonstração, indicação de perfil e recuperação de senha.
  - Funções no `AppContext`: `loginClient(email, pass)`, `registerClient(data)`, `logoutClient()`.
  - Redirecionamento automático pós-login para `/app/cliente`.

- **Recuperação de Senha**:
  - `sendPasswordReset(email)` via Firebase Auth `sendPasswordResetEmail(auth, email)` com identificação do perfil de cliente.

---

## 2. Área Exclusiva do Cliente (`/app/cliente`)

Componente: `src/components/client/ClientPortal.tsx`

- **Dashboard**:
  - Card de boas-vindas personalizado com foto e nome do cliente.
  - Destaque do próximo agendamento (serviço, profissional, data, horário, valor e unidade).
  - Métricas e indicadores pessoais: reservas ativas, atendimentos concluídos e total investido em cuidados.
  - Atalhos rápidos para *"Fazer Novo Agendamento"*, *"Meus Agendamentos"*, *"Meu Perfil"* e *"Histórico"*.
  - Grade de histórico recente com atalho para detalhes.

- **Meus Agendamentos**:
  - Filtros interativos: *Todos*, *Agendados*, *Concluídos* e *Cancelados*.
  - Cards detalhados com data, horário de início e término, duração em minutos, preço formatado em BRL e status.
  - Modal de detalhes completos da reserva.
  - Modal de cancelamento de agendamento com solicitação opcional de motivo, validação de propriedade e sincronização no Firestore.

- **Novo Agendamento (Fluxo em 4 Etapas)**:
  - **Passo 1**: Seleção da unidade (se houver múltiplos studios) e catálogo de serviços ativos com preços e duração.
  - **Passo 2**: Seleção de profissional habilitado para o serviço escolhido.
  - **Passo 3**: Escolha de data e grade de horários livres gerados dinamicamente com base na jornada do profissional, duração do serviço e verificação em tempo real de conflitos via `checkAppointmentConflict`.
  - **Passo 4**: Confirmação instantânea da reserva com geração de agendamento associado ao ID do cliente, atualização de visitas e criação de comanda no financeiro.

- **Meu Perfil**:
  - Visualização e edição do nome completo, telefone/WhatsApp, dia e mês de nascimento e URL da foto.
  - Indicador do perfil ativo `client` e link para redefinição de senha por e-mail.

- **Histórico de Atendimentos**:
  - Consulta aos serviços já realizados anteriormente com recibo detalhado.

- **Notificações**:
  - Central de avisos sobre confirmações, alterações e cancelamentos de agendamentos.

---

## 3. Regras de Agendamento e Conflitos

- Apenas serviços ativos e profissionais cadastrados/habilitados para o serviço são disponibilizados.
- Validação de disponibilidade com bloqueio de horários passados no dia corrente.
- Prevenção de sobreposições de agenda via `checkAppointmentConflict`:
  - Impede múltiplos agendamentos para o mesmo profissional no mesmo horário.
  - Impede que o mesmo cliente agende dois atendimentos concomitantes com profissionais diferentes.
- Cada agendamento fica associado a `currentClient.id` e aos dados cadastrais verificados.
- O cliente visualiza e cancela exclusivamente seus próprios agendamentos.

---

## 4. Controle de Acesso Baseado em Papéis (RBAC)

- **Cliente (`client`)**:
  - Acesso estrito a `/app/cliente/*`, `/p/*`, `/nossos-planos`, `/cadastro`.
  - Bloqueio rígido com tela 403 Forbidden caso tente acessar rotas gerenciais ou administrativas (`/admin/*`, `/app/gerente/*`, `/app/profissional/*`, `/dashboard/*`).
- **Profissional (`professional`)**:
  - Permissões mantidas para sua própria agenda em `/app/profissional/agenda`.
- **Gerente (`tenant_manager`)**:
  - Permissões mantidas para gestão do estúdio em `/app/gerente/*`.
- **CEO / Super Admin (`super_admin`)**:
  - Acesso global mantido em `/admin/painelmaster`.

---

## 5. Sistema de Avaliação Pós-Atendimento (Reviews & Ratings)

- **Modal Interativo de Avaliação**:
  - Exibido nos agendamentos concluídos com status `completed` dentro de *"Histórico de Atendimentos"* e *"Meus Agendamentos"*.
  - Avaliação por estrelas de 1 a 5 com destaque dinâmico ao passar o mouse e rótulos de satisfação (*Péssimo*, *Ruim*, *Regular*, *Bom*, *Excelente*).
  - Campo opcional de comentário/depoimento com contador de caracteres (máx. 500).
- **Banner de Atendimento Concluído sem Avaliação**:
  - Destaque no Dashboard do Cliente avisando sobre agendamentos recentes aguardando avaliação, com botão de ação direta.
- **Sincronização em Múltiplos Módulos**:
  - `appointments`: Campos `rating`, `reviewComment`, `reviewedAt` gravados diretamente no agendamento.
  - `reviews`: Coleção no Firestore com regras de segurança ativas em `firestore.rules`.
  - `professionals`: Recálculo e sincronização automática da média ponderada `averageRating` e total de avaliações `totalReviews`.
  - Exibição de notas e depoimentos em:
    - Card do Agendamento e Modal de Detalhes no Portal do Cliente.
    - Portal do Profissional (`/app/profissional/agenda`) com badge de média e comentários dos clientes nos atendimentos.
    - Perfil Público do Profissional (`/p/[slug]`) com nota média e total de avaliações.
    - Gestão de Profissionais (`/app/gerente/profissionais`) com estatísticas de avaliação da equipe.

---

---

## 6. Módulo de Gestão de Clientes & CRM para Profissionais

- **Acesso Direto para Profissionais**:
  - Aba e rota dedicada `/app/profissional/clientes` integrada sem bloqueio RBAC.
  - Alternador de abas no Portal do Profissional (`Minha Agenda` ↔ `Gestão & Ficha de Clientes (CRM)`).
  - Alerta visual imediato de alergias (`⚠️ Alergia: ...`) e atalho *"Ficha do Cliente"* em cada card de agendamento na agenda do profissional.

- **Cadastro Completo de Novos Clientes**:
  - Modal com validação de nome, telefone/WhatsApp com máscara `(XX) XXXXX-XXXX`, e-mail, aniversário (dia e mês), seleção de foto/avatar e especialista preferido.
  - Registro de preferências iniciais (cortes, cores e alergias) e primeira nota importante.

- **Ficha do Cliente & Histórico de Serviços Prestados**:
  - **Histórico**: Listagem cronológica de serviços realizados com data, hora, profissional responsável, duração, valor pago em R$, status, notas de atendimento e estrelas/avaliação pós-atendimento.
  - **Preferências**:
    - **Tipos de Corte**: Tags interativas com sugestões inteligentes (Degradê navalhado, Fade, Pompadour, Long Bob, Camadas, Pixie, etc.) + tags personalizadas.
    - **Cores de Preferência**: Sugestões e tags personalizadas (Castanho Iluminado, Loiro Pérola, Morena Iluminada, Platinado, Esmalte Nude, Vermelho Carmim, etc.).
    - **Alergias e Sensibilidades**: Destaque de segurança com borda vermelha e tags de alerta (Amônia, Formaldeído, PPD, Pó Descolorante, Látex, Tolueno, etc.) com inserção rápida.
    - **Preferências Gerais**: Notas de conforto e sensibilidade no atendimento.
  - **Notas Importantes**: Linha do tempo com autor, data/hora e opção de *"Marcar como Alerta Crítico"*.

- **Sistema de Tags & Segmentação Rápida**:
  - Tags predefinidas com cores e ícones distintos:
    - **VIP** (Dourado/Âmbar, estrela): clientes de alto ticket e prioridade.
    - **Novo** (Azul/Céu, brilho): clientes recém-chegados ou primeiro atendimento.
    - **Recorrente** (Verde esmeralda, repetição): clientes fidelizados e frequentes.
    - **Com débito** (Vermelho/Rosa, alerta): clientes com pendência ou valor em aberto.
  - Alternador tátil de 1 clique na Ficha do Cliente e seletor no cadastro de novos clientes.
  - Possibilidade de criar tags personalizadas livremente pela equipe.
  - Alerta em destaque no card do cliente quando marcado como "Com débito".
  - Filtros rápidos na barra superior com contadores em tempo real para cada segmento (ex: `VIP (1)`, `Novo (1)`, `Recorrente (2)`, `Com débito (1)`).
  - Exibição das etiquetas nos cards de agendamento na agenda diária do profissional.

---

## 7. Estrutura de Arquivos Criados e Modificados

- `src/types/index.ts`: Inclusão de `ClientTagPreset` e propriedade `tags?: string[]` em `Client`.
- `src/utils/clientTags.ts`: Definição centralizada de estilos, cores, ícones e descrições para tags predefinidas e personalizadas.
- `firebase-blueprint.json`: Atualização do esquema intermediário de `Client` com `tags`.
- `src/context/AppContext.tsx`: Implementação de `updateClientTags`, `toggleClientTag` e sementes de tags reais no setup do estabelecimento.
- `src/components/clients/ClientsManager.tsx`: Barra de segmentação rápida na Ficha do Cliente com alternância em 1 clique, badges coloridas nos cards, filtros por tag com contadores e seletor no modal de cadastro.
- `src/components/professional/ProfessionalPortal.tsx`: Exibição visual de tags diretamente nos cards de agendamento do dia.


