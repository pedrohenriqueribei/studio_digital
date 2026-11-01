import React from 'react';
import { Star, Sparkles, Repeat, AlertCircle, Tag } from 'lucide-react';

export type PresetTagKey = 'VIP' | 'Novo' | 'Recorrente' | 'Com débito';

export interface TagConfig {
  key: PresetTagKey | string;
  label: string;
  description: string;
  badgeClass: string;
  headerBadgeClass: string;
  pillBtnActiveClass: string;
  pillBtnInactiveClass: string;
  accentBorderClass: string;
  dotColor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PRESET_CLIENT_TAGS: TagConfig[] = [
  {
    key: 'VIP',
    label: 'VIP',
    description: 'Cliente exclusivo com atendimento prioritário e alto volume de consumo',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-200/70',
    headerBadgeClass: 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black border border-amber-300 shadow-xs',
    pillBtnActiveClass: 'bg-amber-500 text-amber-950 font-black border-amber-500 shadow-xs ring-2 ring-amber-300',
    pillBtnInactiveClass: 'bg-white hover:bg-amber-50/70 text-slate-700 border-slate-200 hover:border-amber-300',
    accentBorderClass: 'border-l-4 border-l-amber-500',
    dotColor: 'bg-amber-500',
    icon: Star,
  },
  {
    key: 'Novo',
    label: 'Novo',
    description: 'Primeira visita ou cadastro recente na plataforma',
    badgeClass: 'bg-sky-50 text-sky-900 border-sky-300 ring-1 ring-sky-200/70',
    headerBadgeClass: 'bg-gradient-to-r from-sky-400 to-sky-500 text-sky-950 font-black border border-sky-300 shadow-xs',
    pillBtnActiveClass: 'bg-sky-500 text-sky-950 font-black border-sky-500 shadow-xs ring-2 ring-sky-300',
    pillBtnInactiveClass: 'bg-white hover:bg-sky-50/70 text-slate-700 border-slate-200 hover:border-sky-300',
    accentBorderClass: 'border-l-4 border-l-sky-500',
    dotColor: 'bg-sky-500',
    icon: Sparkles,
  },
  {
    key: 'Recorrente',
    label: 'Recorrente',
    description: 'Cliente fidelizado com visitas frequentes ao estúdio',
    badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-200/70',
    headerBadgeClass: 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 font-black border border-emerald-300 shadow-xs',
    pillBtnActiveClass: 'bg-emerald-600 text-white font-black border-emerald-600 shadow-xs ring-2 ring-emerald-300',
    pillBtnInactiveClass: 'bg-white hover:bg-emerald-50/70 text-slate-700 border-slate-200 hover:border-emerald-300',
    accentBorderClass: 'border-l-4 border-l-emerald-500',
    dotColor: 'bg-emerald-500',
    icon: Repeat,
  },
  {
    key: 'Com débito',
    label: 'Com débito',
    description: 'Possui comanda pendente ou valor em aberto a regularizar',
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 ring-1 ring-rose-300 font-extrabold',
    headerBadgeClass: 'bg-rose-500 text-white font-black border border-rose-400 shadow-xs',
    pillBtnActiveClass: 'bg-rose-600 text-white font-black border-rose-600 shadow-xs ring-2 ring-rose-400',
    pillBtnInactiveClass: 'bg-white hover:bg-rose-50/70 text-slate-700 border-slate-200 hover:border-rose-300',
    accentBorderClass: 'border-l-4 border-l-rose-500',
    dotColor: 'bg-rose-600',
    icon: AlertCircle,
  },
];

/**
 * Retorna as configurações de estilo para uma tag (predefinida ou personalizada).
 */
export function getClientTagConfig(tagName: string): TagConfig {
  const normalized = tagName.trim();
  const matched = PRESET_CLIENT_TAGS.find(
    (p) => p.label.toLowerCase() === normalized.toLowerCase()
  );

  if (matched) return matched;

  // Tag personalizada padrão
  return {
    key: normalized,
    label: normalized,
    description: 'Etiqueta personalizada da equipe',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200 ring-1 ring-slate-200/60 font-semibold',
    headerBadgeClass: 'bg-slate-200 text-slate-900 font-bold border border-slate-300',
    pillBtnActiveClass: 'bg-slate-800 text-white font-bold border-slate-800 shadow-xs',
    pillBtnInactiveClass: 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200',
    accentBorderClass: 'border-l-4 border-l-slate-400',
    dotColor: 'bg-slate-500',
    icon: Tag,
  };
}
