import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, User, Phone, X, Check, UserPlus, Sparkles } from 'lucide-react';
import { Client } from '../../types';
import { getClientTagConfig } from '../../utils/clientTags';
import { maskPhone } from '../../utils/masks';

interface ClientSearchAutocompleteProps {
  clients: Client[];
  selectedClientId: string;
  onSelectClient: (client: Client | null) => void;
  onQuickCreateClient?: (prefillName?: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

// Normaliza strings removendo acentos e caracteres especiais para busca fonética/textual
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Extrai somente dígitos de um número de telefone
function extractDigits(text: string): string {
  return text.replace(/\D/g, '');
}

export const ClientSearchAutocomplete: React.FC<ClientSearchAutocompleteProps> = ({
  clients,
  selectedClientId,
  onSelectClient,
  onQuickCreateClient,
  placeholder = 'Buscar cliente por nome ou telefone...',
  className = '',
  autoFocus = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Cliente atualmente selecionado
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Filtra clientes em tempo real por Nome ou Telefone
  const filteredClients = useMemo(() => {
    const rawQuery = searchQuery.trim();
    if (!rawQuery) {
      // Se não digitou nada, exibe os primeiros 8 clientes mais recentes/ativos
      return clients.slice(0, 8);
    }

    const normQuery = normalizeText(rawQuery);
    const digitQuery = extractDigits(rawQuery);

    return clients.filter((client) => {
      // Busca por nome
      const clientNameNorm = normalizeText(client.name || '');
      const matchesName = clientNameNorm.includes(normQuery);

      // Busca por telefone (compara dígitos limpos e texto bruto)
      const clientPhoneDigits = extractDigits(client.phone || '');
      const matchesPhoneDigits = digitQuery.length > 0 && clientPhoneDigits.includes(digitQuery);
      const matchesPhoneRaw = (client.phone || '').toLowerCase().includes(normQuery);

      // Busca por e-mail se existir
      const clientEmailNorm = normalizeText(client.email || '');
      const matchesEmail = clientEmailNorm.includes(normQuery);

      return matchesName || matchesPhoneDigits || matchesPhoneRaw || matchesEmail;
    });
  }, [clients, searchQuery]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset highlight ao mudar os resultados filtrados
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredClients]);

  // Teclado: Navegação por setas, Enter e Escape
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev < filteredClients.length - 1 ? prev + 1 : 0;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        const next = prev > 0 ? prev - 1 : filteredClients.length - 1;
        scrollIntoView(next);
        return next;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredClients.length) {
        handleSelect(filteredClients[highlightedIndex]);
      } else if (filteredClients.length === 1) {
        handleSelect(filteredClients[0]);
      } else if (filteredClients.length === 0 && onQuickCreateClient && searchQuery.trim()) {
        onQuickCreateClient(searchQuery.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const scrollIntoView = (index: number) => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll('li');
      if (items[index]) {
        items[index].scrollIntoView({ block: 'nearest' });
      }
    }
  };

  const handleSelect = (client: Client) => {
    onSelectClient(client);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleClearSelection = () => {
    onSelectClient(null);
    setSearchQuery('');
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const getInitials = (name: string) => {
    if (!name) return 'CL';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Se já existe um cliente selecionado, exibe o card de cliente selecionado */}
      {selectedClient ? (
        <div className="flex items-center justify-between p-2.5 bg-indigo-50/60 border border-indigo-200 rounded-xl transition-all duration-150 hover:border-indigo-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {getInitials(selectedClient.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {selectedClient.name}
                </span>
                {selectedClient.tags && selectedClient.tags.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border shrink-0 ${
                      getClientTagConfig(selectedClient.tags[0]).badgeClass
                    }`}
                  >
                    {selectedClient.tags[0]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="font-mono">{selectedClient.phone ? maskPhone(selectedClient.phone) : 'Sem telefone'}</span>
                {selectedClient.totalVisits ? (
                  <span className="text-slate-400">· {selectedClient.totalVisits} visitas</span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="px-2 py-1 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-100/70 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
              title="Trocar cliente"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onSelectClient(null)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg cursor-pointer transition-colors"
              title="Remover seleção"
              aria-label="Remover seleção"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* Campo de busca por digitação (autocomplete) */
        <div className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
              <Search className="w-4 h-4 text-slate-400" />
            </div>

            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              autoFocus={autoFocus}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors shadow-2xs"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
                title="Limpar busca"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Dropdown com os clientes correspondentes em tempo real */}
          {isOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100 max-h-64 flex flex-col">
              <div className="px-3 py-1.5 bg-slate-50/80 border-b border-slate-100 text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>
                  {searchQuery.trim()
                    ? `${filteredClients.length} ${
                        filteredClients.length === 1 ? 'cliente encontrado' : 'clientes encontrados'
                      }`
                    : `Clientes cadastrados (${clients.length})`}
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Busque por nome ou telefone
                </span>
              </div>

              <ul ref={listRef} className="overflow-y-auto divide-y divide-slate-100 py-1">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const primaryTag = client.tags && client.tags.length > 0 ? client.tags[0] : null;
                    const tagConfig = primaryTag ? getClientTagConfig(primaryTag) : null;

                    return (
                      <li
                        key={client.id}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        onClick={() => handleSelect(client)}
                        className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                          isHighlighted ? 'bg-indigo-50/80 text-indigo-950' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isHighlighted
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {getInitials(client.name)}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold truncate text-slate-900">
                                {client.name}
                              </span>
                              {tagConfig && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium border shrink-0 ${tagConfig.badgeClass}`}
                                >
                                  {tagConfig.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="w-2.5 h-2.5 text-slate-400" />
                                {client.phone ? maskPhone(client.phone) : 'Sem telefone'}
                              </span>
                              {client.totalVisits ? (
                                <span className="text-[10px] text-slate-400">
                                  · {client.totalVisits} {client.totalVisits === 1 ? 'visita' : 'visitas'}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isHighlighted ? (
                            <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-0.5">
                              Selecionar <Check className="w-3 h-3" />
                            </span>
                          ) : null}
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs text-slate-600 mb-1 font-medium">
                      Nenhum cliente encontrado para "{searchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-400 mb-3">
                      Verifique a grafia ou o número digitado.
                    </p>
                    {onQuickCreateClient && (
                      <button
                        type="button"
                        onClick={() => {
                          onQuickCreateClient(searchQuery);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Cadastrar "{searchQuery}" agora
                      </button>
                    )}
                  </div>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
