/**
 * Utilitários puros e de alta precisão para máscaras de input, limpeza de dados e validações.
 * Suporta Telefone Dinâmico (Fixo 8 dígitos e Celular 9 dígitos com DDD), CPF, CNPJ, CEP e Moeda BRL.
 */

export type MaskType = 'phone' | 'cpf' | 'cnpj' | 'cep' | 'currency';

/**
 * Remove qualquer caractere que não seja dígito numérico (0-9).
 */
export const unmask = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\D/g, '');
};

/**
 * Máscara dinâmica para Telefone e Celular brasileiro:
 * - Até 10 dígitos: (XX) XXXX-XXXX (Telefone Fixo)
 * - 11 dígitos: (XX) XXXXX-XXXX (Celular)
 */
export const maskPhone = (value: string | number | undefined | null): string => {
  const digits = unmask(value).slice(0, 11);

  if (!digits) return '';
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 11 dígitos (Celular com nono dígito)
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export const formatPhone = maskPhone;

/**
 * Máscara de CPF: 000.000.000-00 (11 dígitos)
 */
export const maskCPF = (value: string | number | undefined | null): string => {
  const digits = unmask(value).slice(0, 11);

  if (!digits) return '';
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

/**
 * Máscara de CNPJ: 00.000.000/0000-00 (14 dígitos)
 */
export const maskCNPJ = (value: string | number | undefined | null): string => {
  const digits = unmask(value).slice(0, 14);

  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
};

/**
 * Máscara de CEP: 00000-000 (8 dígitos)
 */
export const maskCEP = (value: string | number | undefined | null): string => {
  const digits = unmask(value).slice(0, 8);

  if (!digits) return '';
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
};

/**
 * Máscara de Moeda BRL (Real): R$ 0,00
 * Trata os dígitos da direita para a esquerda como centavos.
 * Ex: '150' -> 'R$ 1,50', '125050' -> 'R$ 1.250,50'
 */
export const maskCurrency = (value: string | number | undefined | null): string => {
  if (value === undefined || value === null || value === '') return 'R$ 0,00';

  // Se já for numérico (ex: 125.5), converte para centavos inteiros
  let numericValue: number;
  if (typeof value === 'number') {
    numericValue = Math.round(value * 100);
  } else {
    const digits = unmask(value);
    numericValue = digits ? parseInt(digits, 10) : 0;
  }

  const cents = numericValue / 100;
  return cents.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Converte valor mascarado de moeda para float numérico puro (ex: 'R$ 1.250,50' -> 1250.50).
 */
export const unmaskCurrency = (value: string | number | undefined | null): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const digits = unmask(value);
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
};

/**
 * Aplica máscara de acordo com o tipo solicitado.
 */
export const applyMask = (type: MaskType, value: string | number | undefined | null): string => {
  switch (type) {
    case 'phone':
      return maskPhone(value);
    case 'cpf':
      return maskCPF(value);
    case 'cnpj':
      return maskCNPJ(value);
    case 'cep':
      return maskCEP(value);
    case 'currency':
      return maskCurrency(value);
    default:
      return String(value || '');
  }
};

/**
 * Limpa o valor de acordo com o tipo (retorna somente números ou float numérico).
 */
export const cleanValue = (type: MaskType, value: string | number | undefined | null): string => {
  if (type === 'currency') {
    return unmaskCurrency(value).toFixed(2);
  }
  return unmask(value);
};

// ==========================================
// Funções de Validação de Integridade
// ==========================================

export const isPhoneComplete = (cleanVal: string): boolean => {
  return cleanVal.length === 10 || cleanVal.length === 11;
};

export const isCEPComplete = (cleanVal: string): boolean => {
  return cleanVal.length === 8;
};

/**
 * Validação com cálculo oficial dos dígitos verificadores do CPF
 */
export const isValidCPF = (cpf: string): boolean => {
  const digits = unmask(cpf);
  if (digits.length !== 11) return false;

  // Rejeita sequências repetidas como 111.111.111-11
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
};

/**
 * Validação com cálculo oficial dos dígitos verificadores do CNPJ
 */
export const isValidCNPJ = (cnpj: string): boolean => {
  const digits = unmask(cnpj);
  if (digits.length !== 14) return false;

  if (/^(\d)\1{13}$/.test(digits)) return false;

  let size = digits.length - 2;
  let numbers = digits.substring(0, size);
  const digitsPart = digits.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsPart.charAt(0), 10)) return false;

  size = size + 1;
  numbers = digits.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digitsPart.charAt(1), 10)) return false;

  return true;
};

/**
 * Verifica se o campo com máscara atingiu o estado completo e válido.
 */
export const isMaskComplete = (type: MaskType, rawValue: string | number): boolean => {
  const clean = cleanValue(type, rawValue);
  switch (type) {
    case 'phone':
      return isPhoneComplete(clean);
    case 'cpf':
      return isValidCPF(clean);
    case 'cnpj':
      return isValidCNPJ(clean);
    case 'cep':
      return isCEPComplete(clean);
    case 'currency':
      return unmaskCurrency(rawValue) > 0;
    default:
      return clean.length > 0;
  }
};
