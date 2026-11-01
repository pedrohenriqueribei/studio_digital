import React, { useState, useEffect, useRef, useId } from 'react';
import {
  MaskType,
  applyMask,
  cleanValue,
  isMaskComplete,
  unmask,
} from '../../utils/masks';
import { Check, AlertCircle } from 'lucide-react';

export interface MaskedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  maskType: MaskType;
  value: string | number | undefined | null;
  onValueChange?: (cleanValue: string, maskedValue: string, isComplete: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  helperText?: string;
  error?: string;
  showValidationFeedback?: boolean;
  leftIcon?: React.ReactNode;
}

export const MaskedInput: React.FC<MaskedInputProps> = ({
  maskType,
  value,
  onValueChange,
  onChange,
  label,
  helperText,
  error,
  showValidationFeedback = true,
  leftIcon,
  className = '',
  placeholder,
  disabled,
  required,
  id,
  name,
  onBlur,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  // Armazena a visualização formatada para o usuário
  const [displayValue, setDisplayValue] = useState<string>(() =>
    applyMask(maskType, value)
  );
  const [isTouched, setIsTouched] = useState(false);

  // Sincroniza se o valor pai mudar externamente
  useEffect(() => {
    const formatted = applyMask(maskType, value);
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value, maskType]);

  const rawClean = cleanValue(maskType, displayValue);
  const isComplete = isMaskComplete(maskType, displayValue);
  const hasValue = displayValue.length > 0 && displayValue !== 'R$ 0,00';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const currentCursor = inputEl.selectionStart || 0;
    const oldLength = inputEl.value.length;

    let newDisplay: string;
    if (maskType === 'currency') {
      // Para moeda, trata os números inseridos de forma cumulativa
      const digits = unmask(inputEl.value);
      newDisplay = applyMask('currency', digits);
    } else {
      newDisplay = applyMask(maskType, inputEl.value);
    }

    const clean = cleanValue(maskType, newDisplay);
    const complete = isMaskComplete(maskType, newDisplay);

    setDisplayValue(newDisplay);

    // Reposiciona o cursor de forma inteligente
    const newLength = newDisplay.length;
    const diff = newLength - oldLength;
    const newCursor = Math.max(0, currentCursor + diff);

    requestAnimationFrame(() => {
      if (inputRef.current) {
        // Para moeda, posiciona cursor no fim da digitação
        if (maskType === 'currency') {
          inputRef.current.setSelectionRange(newDisplay.length, newDisplay.length);
        } else {
          inputRef.current.setSelectionRange(newCursor, newCursor);
        }
      }
    });

    // Notifica callback específico com dado LIMPO para o banco/estado
    if (onValueChange) {
      onValueChange(clean, newDisplay, complete);
    }

    // Compatibilidade com onChange padrão de formulários React
    if (onChange) {
      // Dispara evento sintético com valor limpo
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          name: name || '',
          value: clean,
        },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    if (onBlur) onBlur(e);
  };

  // Determina placeholder padrão se não fornecido
  const defaultPlaceholder = () => {
    switch (maskType) {
      case 'phone':
        return '(11) 98765-4321';
      case 'cpf':
        return '000.000.000-00';
      case 'cnpj':
        return '00.000.000/0001-00';
      case 'cep':
        return '00000-000';
      case 'currency':
        return 'R$ 0,00';
    }
  };

  return (
    <div className="w-full space-y-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-slate-700 flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </span>
          {showValidationFeedback && hasValue && (
            <span
              className={`text-[10px] font-medium transition-colors ${
                isComplete ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              {isComplete ? 'Válido' : 'Incompleto'}
            </span>
          )}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
            {leftIcon}
          </div>
        )}

        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode={maskType === 'currency' ? 'numeric' : 'tel'}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          placeholder={placeholder || defaultPlaceholder()}
          disabled={disabled}
          required={required}
          className={`w-full text-xs rounded-xl border transition-all ${
            leftIcon ? 'pl-9' : 'pl-3'
          } ${
            showValidationFeedback && hasValue ? 'pr-8' : 'pr-3'
          } py-2 focus:outline-none ${
            error
              ? 'border-rose-300 focus:border-rose-500 bg-rose-50/20 text-rose-900'
              : showValidationFeedback && hasValue && isComplete
              ? 'border-emerald-300/80 focus:border-emerald-500 bg-emerald-50/15 text-slate-900'
              : 'border-slate-200 focus:border-slate-400 bg-white text-slate-900'
          } ${
            disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : ''
          } ${className}`}
          {...rest}
        />

        {/* Indicador visual de validação sutil */}
        {showValidationFeedback && hasValue && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
            {isComplete ? (
              <Check className="w-4 h-4 text-emerald-600 animate-in fade-in zoom-in-75 duration-150" />
            ) : isTouched && !isComplete ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            ) : null}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] text-rose-600 flex items-center gap-1 mt-1">
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
