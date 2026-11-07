import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  MapPin,
  Scissors,
  Sparkles,
  Clock,
  DollarSign,
  Building2,
  Navigation,
  X,
  Check,
  ChevronDown,
  Filter,
  ArrowUpDown,
  Tag,
  LocateFixed,
  Info,
} from 'lucide-react';
import { Service, Business } from '../../types';
import { formatCurrency } from '../../utils/availability';
import {
  calculateDistanceKm,
  formatDistance,
  resolveLocationCoordinates,
  getCurrentUserLocation,
  KNOWN_LOCATION_COORDINATES,
  Coordinates,
} from '../../utils/distance';

export interface ServiceWithLocation extends Service {
  business?: Business;
  distanceKm?: number;
  locationLabel?: string;
}

interface ServiceSearchAutocompleteProps {
  services: Service[];
  businesses: Business[];
  selectedServiceId: string;
  onSelectService: (service: Service, business?: Business) => void;
  selectedBusinessId?: string;
  onSelectBusiness?: (businessId: string) => void;
  clientLocation?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    state?: string;
    neighborhood?: string;
    address?: string;
  } | null;
  allowCrossBusinessSearch?: boolean;
  theme?: 'dark' | 'light';
  placeholder?: string;
  showCategoryFilter?: boolean;
  showLocationFilter?: boolean;
  showServiceCardsGrid?: boolean;
  className?: string;
}

// Normaliza texto para busca textual sem acentos e em minúsculas
function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// Destaque visual da parte correspondente do texto
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;

  const normText = normalizeText(text);
  const normQuery = normalizeText(query);
  const index = normText.indexOf(normQuery);

  if (index === -1) return <span>{text}</span>;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <span>
      {before}
      <span className="font-extrabold text-emerald-400 bg-emerald-950/60 underline decoration-emerald-400/60 px-0.5 rounded">
        {match}
      </span>
      {after}
    </span>
  );
}

export const ServiceSearchAutocomplete: React.FC<ServiceSearchAutocompleteProps> = ({
  services,
  businesses,
  selectedServiceId,
  onSelectService,
  selectedBusinessId,
  onSelectBusiness,
  clientLocation,
  allowCrossBusinessSearch = true,
  theme = 'dark',
  placeholder = 'Buscar serviço por nome, categoria ou localização (ex: Corte, Estética, Jardins)...',
  showCategoryFilter = true,
  showLocationFilter = true,
  showServiceCardsGrid = true,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [sortBy, setSortBy] = useState<'relevance' | 'distance' | 'price_asc' | 'price_desc' | 'name'>('relevance');

  // Coordenadas ativas do usuário para cálculo de proximidade
  const [userCoords, setUserCoords] = useState<Coordinates | null>(() => {
    if (clientLocation) {
      return resolveLocationCoordinates(clientLocation);
    }
    // Fallback: se houver estabelecimentos, tenta resolver pelo primeiro
    if (businesses.length > 0) {
      return resolveLocationCoordinates(businesses[0]);
    }
    return null;
  });

  const [locationName, setLocationName] = useState<string>(() => {
    if (clientLocation?.neighborhood && clientLocation?.city) {
      return `${clientLocation.neighborhood}, ${clientLocation.city}`;
    }
    if (clientLocation?.city) {
      return `${clientLocation.city} - ${clientLocation.state || 'Brasil'}`;
    }
    if (businesses.length > 0 && businesses[0].city) {
      return `${businesses[0].city} - ${businesses[0].state || 'SP'}`;
    }
    return 'São Paulo, SP';
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);

  // Filtro de abrangência de estabelecimentos: 'all' ou ID do estabelecimento
  const [filterBizId, setFilterBizId] = useState<string>(selectedBusinessId || 'all');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const locationSelectorRef = useRef<HTMLDivElement>(null);

  // Sincroniza filterBizId quando selectedBusinessId externo muda
  useEffect(() => {
    if (selectedBusinessId) {
      setFilterBizId(selectedBusinessId);
    }
  }, [selectedBusinessId]);

  // Sincroniza localização do cliente se fornecida
  useEffect(() => {
    if (clientLocation) {
      const resolved = resolveLocationCoordinates(clientLocation);
      if (resolved) {
        setUserCoords(resolved);
        if (clientLocation.city) {
          setLocationName(
            clientLocation.neighborhood
              ? `${clientLocation.neighborhood}, ${clientLocation.city}`
              : `${clientLocation.city} - ${clientLocation.state || ''}`
          );
        }
      }
    }
  }, [clientLocation]);

  // Extrai lista única de categorias disponíveis
  const categories = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.category && s.active) {
        set.add(s.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [services]);

  // Mapa de estabelecimentos indexados por ID
  const businessMap = useMemo(() => {
    const map = new Map<string, Business>();
    businesses.forEach((b) => map.set(b.id, b));
    return map;
  }, [businesses]);

  // Calcula coordenadas de cada estabelecimento
  const businessCoordsMap = useMemo(() => {
    const map = new Map<string, Coordinates>();
    businesses.forEach((b) => {
      const coords = resolveLocationCoordinates(b);
      if (coords) {
        map.set(b.id, coords);
      }
    });
    return map;
  }, [businesses]);

  // Detecta GPS real do usuário
  const handleDetectGPS = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getCurrentUserLocation();
      setUserCoords(coords);
      setLocationName('Minha Localização (GPS)');
      setIsLocationSelectorOpen(false);
      setSortBy('distance');
    } catch (err: any) {
      setLocationError(err?.message || 'Não foi possível obter sua localização atual.');
    } finally {
      setIsLocating(false);
    }
  };

  // Seleciona uma localidade pré-definida
  const handleSelectPredefinedLocation = (name: string, coords: Coordinates) => {
    setUserCoords(coords);
    setLocationName(name);
    setIsLocationSelectorOpen(false);
    setLocationError(null);
  };

  // Enriquecer serviços com dados de negócio e distância
  const enrichedServices: ServiceWithLocation[] = useMemo(() => {
    return services
      .filter((s) => s.active)
      .map((s) => {
        const biz = businessMap.get(s.businessId);
        let distanceKm: number | undefined = undefined;

        if (userCoords && biz) {
          const bizCoords = businessCoordsMap.get(biz.id);
          if (bizCoords) {
            distanceKm = calculateDistanceKm(
              userCoords.latitude,
              userCoords.longitude,
              bizCoords.latitude,
              bizCoords.longitude
            );
          }
        }

        const locationLabel = biz
          ? `${biz.tradeName || biz.name} · ${biz.neighborhood ? biz.neighborhood + ', ' : ''}${biz.city} - ${biz.state}`
          : 'Studio Digital';

        return {
          ...s,
          business: biz,
          distanceKm,
          locationLabel,
        };
      });
  }, [services, businessMap, businessCoordsMap, userCoords]);

  // Filtragem e ordenação dos serviços
  const filteredServices = useMemo(() => {
    let result = enrichedServices;

    // Filtro por estabelecimento específico se selecionado
    if (filterBizId !== 'all') {
      result = result.filter((s) => s.businessId === filterBizId);
    }

    // Filtro por categoria
    if (selectedCategory !== 'all') {
      const normCat = normalizeText(selectedCategory);
      result = result.filter((s) => normalizeText(s.category) === normCat);
    }

    // Busca textual / autocomplete por nome, categoria, descrição ou localidade
    const query = normalizeText(searchQuery);
    if (query) {
      result = result.filter((s) => {
        const nameMatch = normalizeText(s.name).includes(query);
        const catMatch = normalizeText(s.category).includes(query);
        const descMatch = normalizeText(s.description || '').includes(query);
        const bizNameMatch = s.business ? normalizeText(s.business.tradeName || s.business.name).includes(query) : false;
        const bizCityMatch = s.business ? normalizeText(s.business.city).includes(query) : false;
        const bizNeighMatch = s.business?.neighborhood ? normalizeText(s.business.neighborhood).includes(query) : false;

        return (
          nameMatch ||
          catMatch ||
          descMatch ||
          bizNameMatch ||
          bizCityMatch ||
          bizNeighMatch
        );
      });
    }

    // Ordenação
    result = [...result].sort((a, b) => {
      if (sortBy === 'distance') {
        const distA = a.distanceKm ?? 99999;
        const distB = b.distanceKm ?? 99999;
        return distA - distB;
      }
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price_desc') {
        return b.price - a.price;
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      // Padrão: relevância (se houver busca, prioriza correspondência no nome)
      if (query) {
        const aNameStarts = normalizeText(a.name).startsWith(query) ? 2 : normalizeText(a.name).includes(query) ? 1 : 0;
        const bNameStarts = normalizeText(b.name).startsWith(query) ? 2 : normalizeText(b.name).includes(query) ? 1 : 0;
        if (aNameStarts !== bNameStarts) return bNameStarts - aNameStarts;
      }
      // Se não há query, ordena por distância se disponível ou nome
      if (a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [enrichedServices, filterBizId, selectedCategory, searchQuery, sortBy]);

  // Lista para o dropdown de autocomplete (até 7 itens)
  const autocompleteSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return filteredServices.slice(0, 6);
    }
    return filteredServices.slice(0, 8);
  }, [filteredServices, searchQuery]);

  // Serviço atualmente selecionado
  const currentSelectedService = useMemo(() => {
    return enrichedServices.find((s) => s.id === selectedServiceId) || null;
  }, [enrichedServices, selectedServiceId]);

  // Fecha dropdown e seletor ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (locationSelectorRef.current && !locationSelectorRef.current.contains(event.target as Node)) {
        setIsLocationSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Teclas de navegação (setas, enter, esc)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < autocompleteSuggestions.length) {
        handleSelect(autocompleteSuggestions[highlightedIndex]);
      } else if (autocompleteSuggestions.length > 0) {
        handleSelect(autocompleteSuggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleSelect = (service: ServiceWithLocation) => {
    onSelectService(service, service.business);
    if (service.business && onSelectBusiness && service.business.id !== selectedBusinessId) {
      onSelectBusiness(service.business.id);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const isDark = theme === 'dark';

  return (
    <div ref={containerRef} className={`space-y-4 ${className}`}>
      {/* Top Controls: Location & Branch Selector */}
      {showLocationFilter && (
        <div
          className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            isDark
              ? 'bg-slate-950/80 border-slate-800 text-slate-300'
              : 'bg-white border-slate-200 text-slate-700 shadow-2xs'
          }`}
        >
          {/* Geolocation & Distance Context */}
          <div className="relative" ref={locationSelectorRef}>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Sua Localização:</span>
              <button
                type="button"
                onClick={() => setIsLocationSelectorOpen(!isLocationSelectorOpen)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 hover:border-emerald-500/50 text-white'
                    : 'bg-slate-50 border-slate-200 hover:border-emerald-500 text-slate-900'
                }`}
                title="Alterar ou detectar localização para cálculo de proximidade"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate max-w-[160px] sm:max-w-[200px]">
                  {locationName}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            {/* Dropdown de Seleção de Localização */}
            {isLocationSelectorOpen && (
              <div
                className={`absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-xl p-3 z-40 space-y-3 ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b pb-2 border-slate-800/60">
                  <span className="font-bold text-xs">Definir Local de Referência</span>
                  <button
                    onClick={() => setIsLocationSelectorOpen(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Botão de detecção via GPS */}
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isLocating}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Obtendo GPS...' : 'Usar Minha Localização Atual'}</span>
                </button>

                {locationError && (
                  <p className="text-[11px] text-rose-400 leading-tight">{locationError}</p>
                )}

                {/* Polos / Cidades Populares */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Principais Polos / Bairros
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
                    {[
                      { name: 'São Paulo (Jardins / Paulista)', key: 'jardins, sao paulo' },
                      { name: 'São Paulo (Moema / Ibirapuera)', key: 'moema, sao paulo' },
                      { name: 'São Paulo (Pinheiros / Faria Lima)', key: 'pinheiros, sao paulo' },
                      { name: 'Campinas (Cambuí / Centro)', key: 'cambui, campinas' },
                      { name: 'Rio de Janeiro (Copacabana / Ipanema)', key: 'copacabana, rio de janeiro' },
                      { name: 'Belo Horizonte (Savassi / Lourdes)', key: 'savassi, belo horizonte' },
                      { name: 'Curitiba (Batel / Centro)', key: 'batel, curitiba' },
                      { name: 'Brasília (Asa Sul / Plano Piloto)', key: 'asa sul, brasilia' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          handleSelectPredefinedLocation(
                            item.name,
                            KNOWN_LOCATION_COORDINATES[item.key]
                          )
                        }
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer ${
                          isDark
                            ? 'hover:bg-slate-800 text-slate-300 hover:text-white'
                            : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{item.name}</span>
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unit / Branch Selection & Sort By */}
          <div className="flex flex-wrap items-center gap-2">
            {allowCrossBusinessSearch && businesses.length > 1 && (
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterBizId}
                  onChange={(e) => {
                    setFilterBizId(e.target.value);
                    if (onSelectBusiness && e.target.value !== 'all') {
                      onSelectBusiness(e.target.value);
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="all">Todas as Unidades Próximas ({businesses.length})</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.tradeName || b.name} ({b.city} - {b.state})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Ordenação */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className={`px-2.5 py-1.5 rounded-xl border font-semibold text-xs focus:outline-none focus:border-emerald-500 cursor-pointer ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <option value="relevance">Mais Relevantes</option>
                <option value="distance">Mais Próximos de Mim</option>
                <option value="price_asc">Menor Preço</option>
                <option value="price_desc">Maior Preço</option>
                <option value="name">Nome (A - Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Autocomplete Search Input Bar */}
      <div className="relative">
        <div
          className={`relative flex items-center rounded-2xl border transition-all ${
            isOpen
              ? 'ring-2 ring-emerald-500/50 border-emerald-500 shadow-lg shadow-emerald-500/10'
              : isDark
              ? 'border-slate-800 bg-slate-950 hover:border-slate-700'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="pl-4 pr-2 text-slate-400 flex items-center justify-center">
            <Search className="w-4 h-4 text-emerald-400" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full py-3 pr-10 text-xs sm:text-sm font-medium bg-transparent focus:outline-none ${
              isDark ? 'text-white placeholder:text-slate-500' : 'text-slate-900 placeholder:text-slate-400'
            }`}
          />

          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown List */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100 ${
              isDark
                ? 'bg-slate-900 border-slate-800 divide-y divide-slate-800/60'
                : 'bg-white border-slate-200 divide-y divide-slate-100'
            }`}
          >
            <div className={`px-4 py-2 text-[11px] font-semibold flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-50 text-slate-500'
            }`}>
              <span>
                {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Use ↑ ↓ para navegar · Enter para selecionar
              </span>
            </div>

            {autocompleteSuggestions.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <Scissors className="w-8 h-8 text-slate-500 mx-auto" />
                <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Nenhum serviço corresponde a "{searchQuery}"
                </p>
                <p className="text-[11px] text-slate-500">
                  Tente buscar por categoria, especialidade ou altere o estabelecimento.
                </p>
              </div>
            ) : (
              <ul className="max-h-80 overflow-y-auto divide-y divide-slate-800/40">
                {autocompleteSuggestions.map((srv, index) => {
                  const isHighlighted = index === highlightedIndex;
                  const isSelected = selectedServiceId === srv.id;

                  return (
                    <li
                      key={srv.id}
                      onClick={() => handleSelect(srv)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`p-3.5 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                        isHighlighted
                          ? isDark
                            ? 'bg-emerald-950/40 text-white'
                            : 'bg-emerald-50 text-slate-900'
                          : isDark
                          ? 'hover:bg-slate-800/60 text-slate-200'
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold truncate">
                            <HighlightMatch text={srv.name} query={searchQuery} />
                          </h4>

                          {/* Category Badge */}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Tag className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{srv.category}</span>
                          </span>

                          {/* Proximity / Distance Badge */}
                          {srv.distanceKm !== undefined && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                              <Navigation className="w-2.5 h-2.5" />
                              <span>{formatDistance(srv.distanceKm)} de você</span>
                            </span>
                          )}
                        </div>

                        {/* Location & Establishment Subtitle */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                          <Building2 className="w-3 h-3 shrink-0 text-slate-500" />
                          <span className="truncate">{srv.locationLabel}</span>
                        </div>

                        {srv.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {srv.description}
                          </p>
                        )}
                      </div>

                      {/* Price and Duration */}
                      <div className="text-right shrink-0 space-y-1">
                        <span className="text-xs sm:text-sm font-mono font-extrabold text-emerald-400 block">
                          {formatCurrency(srv.price)}
                        </span>
                        <div className="flex items-center justify-end gap-1 text-[10px] font-mono text-slate-400">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{srv.durationMinutes} min</span>
                        </div>
                        {isSelected && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400">
                            <Check className="w-3 h-3" /> Selecionado
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Category Filter Quick Chips */}
      {showCategoryFilter && categories.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-400" />
              Filtrar por Categoria:
            </span>
            <span className="text-[10px] text-slate-500">
              {categories.length} categorias disponíveis
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : isDark
                  ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({enrichedServices.length})
            </button>

            {categories.map((cat) => {
              const count = enrichedServices.filter(
                (s) => normalizeText(s.category) === normalizeText(cat)
              ).length;
              const isCatSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isCatSelected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : isDark
                      ? 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isCatSelected
                        ? 'bg-emerald-700 text-white'
                        : isDark
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Service Spotlight Banner */}
      {currentSelectedService && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-100'
              : 'bg-emerald-50 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-md">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Serviço Selecionado
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  {currentSelectedService.category}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-white">
                {currentSelectedService.name}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{currentSelectedService.locationLabel}</span>
                {currentSelectedService.distanceKm !== undefined && (
                  <span className="text-emerald-400 font-mono font-bold">
                    ({formatDistance(currentSelectedService.distanceKm)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-emerald-500/20">
            <div className="text-left sm:text-right">
              <span className="text-lg font-mono font-extrabold text-emerald-400 block leading-tight">
                {formatCurrency(currentSelectedService.price)}
              </span>
              <span className="text-[11px] text-slate-400">
                {currentSelectedService.durationMinutes} minutos de duração
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Service Grid Cards */}
      {showServiceCardsGrid && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">
              Escolha um dos serviços listados abaixo ({filteredServices.length}):
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Limpar busca
              </button>
            )}
          </div>

          {filteredServices.length === 0 ? (
            <div
              className={`p-8 text-center rounded-2xl border space-y-2 ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <Scissors className="w-10 h-10 text-slate-600 mx-auto" />
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                Nenhum serviço encontrado com os filtros atuais
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tente buscar com outro termo, selecione "Todas as Categorias" ou ative "Todas as
                Unidades Próximas".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredServices.map((srv) => {
                const isSelected = selectedServiceId === srv.id;

                return (
                  <div
                    key={srv.id}
                    onClick={() => handleSelect(srv)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative group ${
                      isSelected
                        ? isDark
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-emerald-50 border-emerald-500 shadow-sm'
                        : isDark
                        ? 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {srv.category}
                        </span>
                        <h4
                          className={`text-sm font-bold ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          <HighlightMatch text={srv.name} query={searchQuery} />
                        </h4>
                      </div>

                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-sm">
                          <Check className="w-3.5 h-3.5 font-bold" />
                        </div>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${
                            isDark
                              ? 'border-slate-800 group-hover:border-emerald-500/60'
                              : 'border-slate-200 group-hover:border-emerald-500/60'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-emerald-500/40 transition-colors" />
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {srv.description || 'Atendimento profissional de excelência com horário reservado.'}
                    </p>

                    {/* Establishment & Proximity Tag */}
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5 truncate max-w-[190px]">
                        <Building2 className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{srv.business?.tradeName || 'Unidade Principal'}</span>
                      </div>

                      {srv.distanceKm !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          {formatDistance(srv.distanceKm)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono pt-1">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{srv.durationMinutes} min</span>
                      </div>
                      <span className="text-emerald-400 font-extrabold text-sm">
                        {formatCurrency(srv.price)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
