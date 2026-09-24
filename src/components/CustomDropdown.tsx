'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string;
}

interface CustomDropdownProps {
  id?: string;
  options: readonly (string | DropdownOption)[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  buttonClassName?: string;
  panelClassName?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select option',
  icon,
  className = '',
  buttonClassName = '',
  panelClassName = '',
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize options to DropdownOption objects
  const normalizedOptions: DropdownOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Find currently selected option
  const selectedOption = normalizedOptions.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Click outside listener to close dropdown
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  // Keyboard navigation (Escape to close)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClickOutside]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
  };

  const isFullWidth = className.includes('w-full');

  return (
    <div
      ref={containerRef}
      className={`relative text-left ${isFullWidth ? 'block w-full' : 'inline-block'} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Trigger Button */}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel || displayLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`${
          isFullWidth ? 'flex w-full' : 'inline-flex'
        } items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium rounded-xl border transition-all duration-200 ease-in-out cursor-pointer active:scale-[0.98] select-none ${
          isOpen
            ? 'bg-white border-[#0071e3] ring-2 ring-blue-100 shadow-sm text-zinc-900'
            : 'bg-zinc-100/90 hover:bg-white border-slate-200/80 hover:border-slate-300 text-zinc-800'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${buttonClassName}`}
      >
        <div className="flex items-center gap-1.5 truncate">
          {icon && <span className="text-zinc-400 shrink-0">{icon}</span>}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#0071e3]' : ''
          }`}
        />
      </button>

      {/* Dropdown Panel Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 mt-1.5 z-50 bg-white shadow-lg rounded-xl border border-slate-200 py-1 focus:outline-none animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto ${
            isFullWidth ? 'w-full min-w-[200px]' : 'w-auto min-w-[200px] max-w-[320px]'
          } ${panelClassName}`}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-2 cursor-pointer transition-colors hover:bg-slate-50 text-slate-700 flex items-center justify-between gap-3 text-xs ${
                  isSelected ? 'bg-blue-50/70 text-[#0071e3] font-semibold hover:bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{opt.label}</span>
                  {opt.badge && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-100 text-zinc-500 font-mono">
                      {opt.badge}
                    </span>
                  )}
                </div>
                {isSelected && (
                  <Check className="w-3.5 h-3.5 text-[#0071e3] shrink-0 stroke-[2.5]" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
