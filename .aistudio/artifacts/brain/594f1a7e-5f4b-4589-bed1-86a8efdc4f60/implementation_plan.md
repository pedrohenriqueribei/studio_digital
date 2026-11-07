# Plano de Implementação: Fila Virtual Inteligente e Gestão de Encaixes

Este plano especifica a arquitetura, regras de negócio e interface para o sistema dinâmico e inteligente de **Fila Virtual**, atendendo à demanda de clientes presenciais sem agendamento prévio (walk-ins/encaixes) em harmonia com a grade de clientes previamente agendados, com suporte a painel de chamada na TV e faturamento automático.

---

## 1. Visão Geral e Casos de Uso

1. **Cliente Presencial (Walk-in)**: Chega ao estúdio/clínica sem horário marcado. A recepção gera uma senha na fila virtual selecionando o serviço desejado e o profissional (específico ou "Qualquer disponível").
2. **Prioridade Garantida para Agendados**: O motor inteligente calcula as janelas vagas (gaps) na grade dos profissionais para hoje, impedindo que encaixes atrasem clientes que possuem agendamento prévio.
3. **Painel de Recepção / TV**: Uma visualização pública em tela cheia com visual moderno e de alto contraste, chamada sonora de senha (chime sintetizado via Web Audio API), destaque do profissional/bancada e lista de próximas senhas.
4. **Faturamento & Comandas Automáticas**: Ao iniciar o atendimento da senha, uma comanda é automaticamente gerada e vinculada ao profissional e ao serviço. O faturamento e o histórico de comissões alimentam instantaneamente o módulo financeiro e relatórios executivos.

---

## 2. Estrutura de Dados e Tipos (`src/types/index.ts`)

```typescript
export type VirtualQueueStatus = 
  | 'aguardando'      // Na fila aguardando chamada
  | 'chamado'         // Chamado no painel / TV (aguardando sentar na cadeira)
  | 'em_atendimento'  // Em procedimento ativo (comanda gerada)
  | 'concluido'       // Atendimento finalizado
  | 'desistiu'        // Cancelado/desistiu
  | 'cancelado';

export interface VirtualQueueItem {
  id: string;
  businessId: string;
  tenant_id: string;
  ticketNumber: string;         // Ex: A001, B002, E003
  clientId?: string;            // Opcional caso já seja cliente cadastrado
  clientName: string;
  clientPhone?: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;      // Em minutos
  servicePrice: number;
  professionalId?: string;      // Preenchido se escolheu profissional específico
  professionalName?: string;
  anyProfessional: boolean;     // True se aceita qualquer profissional disponível
  assignedProfessionalId?: string; // Profissional que efetivamente atendeu
  assignedProfessionalName?: string;
  status: VirtualQueueStatus;
  priorityAlert?: 'normal' | 'gap_curto' | 'proximo_de_agendamento';
  estimatedWaitMinutes: number;
  joinedAt: string;             // ISO
  calledAt?: string;            // ISO
  startedAt?: string;           // ISO
  completedAt?: string;         // ISO
  comandaId?: string;           // ID da comanda criada automaticamente
  notes?: string;
}
```

---

## 3. Motor Inteligente de Alocação e Prioridade

1. **Cálculo de Janelas Livres (Smart Gaps)**:
   - Lê os agendamentos do dia em `appointments` para cada profissional.
   - Identifica os intervalos livres entre um agendamento e o próximo.
   - Para encaixes: se o serviço do walk-in leva 40 min e o próximo agendamento do profissional é em 25 min, o sistema emite um alerta visual inteligente para evitar atraso no agendado, sugerindo outro profissional com janela livre ou reordenando a fila.
2. **Modo "Qualquer Profissional Disponível"**:
   - Analisa quem realiza o serviço solicitado, quem está livre no momento ou quem tem a menor fila acumulada, sugerindo a melhor alocação para minimizar o tempo de espera geral.

---

## 4. Integração Financeira e Faturamento dos Profissionais

- **Abertura Automática de Comanda**:
  - Quando a recepção clica em **"Iniciar Atendimento"**, o sistema cria instantaneamente uma `Comanda` aberta com:
    - `clientId` e `clientName` do cliente da fila.
    - `professionalId` e `professionalName` do profissional designado.
    - Item com `serviceId`, `name: serviceName`, `price: servicePrice`.
    - `status: 'aberta'`.
  - O `comandaId` é gravado no `VirtualQueueItem`.
- **Fechamento e Comissões**:
  - A comanda fica visível imediatamente na aba **Financeiro / Comandas**.
  - No pagamento (Dinheiro, PIX, Cartão), o valor entra no faturamento do estúdio, e o rateio de comissão do profissional é computado automaticamente no ranking e relatórios (`FinancialDashboard`, `TopPerformersRanking`, `ExecutiveReportsTab`).

---

## 5. Componentes a Serem Desenvolvidos

1. **`src/components/queue/VirtualQueueManager.tsx`**:
   - Painel de controle da equipe e recepção:
     - Métricas no topo: Total aguardando, Tempo médio estimado, Em atendimento no momento, Atendidos hoje.
     - Botão de ação: **"Novo Encaixe / Gerar Senha"** e **"Abrir Painel TV"**.
     - Abas / Colunas Kanban interativas:
       - *Fila de Espera*: Cards ordenados com número da senha, tempo de espera, status de gap e botão "Chamar no Painel".
       - *Chamados*: Senhas no painel com botão "Iniciar Atendimento" e "Rechamar (Som)".
       - *Em Atendimento*: Card com tempo decorrido, profissional atendendo e atalho direto para a Comanda no Caixa.
       - *Próximos Agendamentos*: Visão rápida dos horários agendados do dia para prevenir conflitos.
2. **`src/components/queue/NewQueueTicketModal.tsx`**:
   - Modal rápido para inserção na fila:
     - Busca/seleção rápida de cliente (ou digitação de nome/telefone).
     - Seleção do serviço (com duração e preço visíveis).
     - Seleção do profissional ("Qualquer disponível" ou escolha direta).
     - Cálculo preditivo imediato do tempo estimado de espera antes de confirmar.
3. **`src/components/queue/ReceptionTVDisplay.tsx`**:
   - Modo Fullscreen para TV ou monitor de recepção:
     - Layout de alto impacto visual (dark mode premium com tipografia de destaque).
     - Chamada atual com animação pulsante, número da senha, nome do cliente, serviço e nome do profissional / cadeira.
     - Chime sonoro agradável (campainha sintetizada com Web Audio API sem necessidade de arquivos externos).
     - Coluna lateral com "Últimas Senhas Chamadas" e "Próximas Senhas na Fila".
     - Relógio digital em tempo real e logo do estúdio.
4. **Sincronização em Tempo Real (`src/services/firestoreSync.ts`)**:
   - Ouvinte `onSnapshot` da coleção `virtualQueue` para sincronizar instantaneamente as ações da recepção com a tela da TV.
5. **Navegação & Header**:
   - Inclusão do item **"Fila Virtual"** com ícone moderno no `Sidebar.tsx`, `MobileBottomNav.tsx` e atalho rápido no `Header.tsx`.

---

## 6. Plano de Execução Passo a Passo

1. **Fase 1**: Atualizar tipos (`src/types/index.ts`) e adicionar rotinas de sincronização no Firestore (`src/services/firestoreSync.ts`).
2. **Fase 2**: Integrar estado global no `AppContext.tsx` (`queueItems`, `addToQueue`, `callQueueTicket`, `startQueueAttendance`, `finishQueueAttendance`, `cancelQueueTicket`).
3. **Fase 3**: Implementar `VirtualQueueManager.tsx` e `NewQueueTicketModal.tsx` com regras de conflito/prioridade com agendamentos.
4. **Fase 4**: Criar `ReceptionTVDisplay.tsx` com efeito sonoro Web Audio e layout para TV.
5. **Fase 5**: Integrar rotas no `App.tsx`, atualizar navegação (`Sidebar.tsx`, `Header.tsx`), testar fluxo completo (geração de senha -> chamada com som -> início com comanda automática -> fechamento no caixa).
6. **Fase 6**: Validação rigorosa com `compile_applet` e `lint_applet`.
