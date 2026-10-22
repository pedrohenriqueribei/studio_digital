/**
 * Funções utilitárias de manipulação e formatação de datas locais.
 */

export const getTodayDateString = (): string => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const addDaysToDate = (dateStr: string, days: number): string => {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const formatDateHeader = (dateStr: string): string => {
  const parts = dateStr.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayAndMonth = d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dayAndMonth}`;
};
