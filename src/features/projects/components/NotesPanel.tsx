import React, { useState, useEffect, useRef } from 'react';
import { Save, StickyNote, CheckCircle2 } from 'lucide-react';


export interface NotesPanelProps {
  value: string;
  onChange: (v: string) => void;
  onSave: () => Promise<void> | void;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  hideHeader?: boolean;
}

export function NotesPanel({
  value,
  onChange,
  onSave,
  disabled = false,
  placeholder = 'Adicione referências, comentários ou detalhes...',
  label = 'Notas',
  hideHeader = false,
}: NotesPanelProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(value);

  // track initial value changes (when data loads)
  useEffect(() => {
    initialRef.current = value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const isDirty = value !== initialRef.current;

  const handleSave = async () => {
    if (!isDirty || disabled) return;
    setSaving(true);
    try {
      await onSave();
      initialRef.current = value;
      setSaved(true);
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleBlur = () => {
    if (isDirty) handleSave();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <aside className="notes-panel flex flex-col h-full bg-transparent">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <StickyNote size={15} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">{label}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={!isDirty || disabled || saving}
            title="Guardar (⌘S)"
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              enabled:hover:bg-sky-500/10 enabled:hover:text-sky-400
              text-slate-500"
          >
            {saved ? (
              <><CheckCircle2 size={13} className="text-emerald-400" /><span className="text-emerald-400">Guardado</span></>
            ) : (
              <><Save size={13} /><span>{saving ? 'A guardar...' : 'Guardar'}</span></>
            )}
          </button>
        </div>
      )}
      {/* Save button when header is hidden */}
      {hideHeader && (
        <div className="flex justify-end px-4 pt-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={!isDirty || disabled || saving}
            title="Guardar (⌘S)"
            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-all
              disabled:opacity-30 disabled:cursor-not-allowed
              enabled:hover:bg-sky-500/10 enabled:hover:text-sky-400
              text-slate-500"
          >
            {saved ? (
              <><CheckCircle2 size={11} className="text-emerald-400" /><span className="text-emerald-400">Guardado</span></>
            ) : (
              <><Save size={11} /><span>{saving ? 'A guardar...' : 'Guardar'}</span></>
            )}
          </button>
        </div>
      )}

      {/* Textarea */}
      <div className="flex-1 overflow-auto p-4">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="
            w-full h-full resize-none bg-transparent text-slate-300 text-sm leading-relaxed
            placeholder:text-slate-600 focus:outline-none
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        />
      </div>

      {/* Footer hint */}
      {!hideHeader && (
        <div className="px-5 py-2.5 border-t border-slate-800/50 shrink-0">
          <p className="text-[10px] text-slate-700 font-medium">⌘S para guardar · Guardado automático ao sair</p>
        </div>
      )}
    </aside>
  );
}
