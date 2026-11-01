import { useState, useCallback, useMemo } from 'react';
import {
  MaskType,
  applyMask,
  cleanValue,
  isMaskComplete,
  unmask,
} from '../utils/masks';

export interface UseMaskReturn {
  /** Valor formatado com a máscara para exibição no input */
  value: string;
  /** Valor limpo (apenas dígitos numéricos ou float) para salvar no banco/estado */
  cleanValue: string;
  /** Flag booleana indicando se o campo atingiu tamanho e validação completa */
  isComplete: boolean;
  /** Handler de evento onChange para inputs HTML padrão */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Função imperativa para atualizar o valor programaticamente */
  setValue: (val: string | number) => void;
  /** Redefine o valor para o estado vazio */
  reset: () => void;
}

/**
 * Hook customizado para gerenciar estado mascarado em inputs.
 *
 * @param initialValue Valor inicial (pode ser puro ou formatado)
 * @param maskType Tipo de máscara ('phone' | 'cpf' | 'cnpj' | 'cep' | 'currency')
 */
export function useMask(
  initialValue: string | number = '',
  maskType: MaskType
): UseMaskReturn {
  const [displayValue, setDisplayValue] = useState<string>(() =>
    applyMask(maskType, initialValue)
  );

  const rawClean = useMemo(
    () => cleanValue(maskType, displayValue),
    [maskType, displayValue]
  );

  const isComplete = useMemo(
    () => isMaskComplete(maskType, displayValue),
    [maskType, displayValue]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;
      if (maskType === 'currency') {
        const digits = unmask(inputVal);
        setDisplayValue(applyMask('currency', digits));
      } else {
        setDisplayValue(applyMask(maskType, inputVal));
      }
    },
    [maskType]
  );

  const setValue = useCallback(
    (val: string | number) => {
      setDisplayValue(applyMask(maskType, val));
    },
    [maskType]
  );

  const reset = useCallback(() => {
    setDisplayValue(maskType === 'currency' ? 'R$ 0,00' : '');
  }, [maskType]);

  return {
    value: displayValue,
    cleanValue: rawClean,
    isComplete,
    onChange,
    setValue,
    reset,
  };
}
