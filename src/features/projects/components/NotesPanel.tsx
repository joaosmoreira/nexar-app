import React, { useState, useEffect, useRef } from 'react';
import { Save, StickyNote, CheckCircle2 } from 'lucide-react';


interface NotesPanelProps {
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
  const [isEditing, setIsEditing] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialRef = useRef(value);

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

  const renderContent = () => {
    if (!value) return <p className="text-slate-600 italic text-sm">{placeholder}</p>;

    const parts = value.split('[OUTLOOK_MSG]');
    return (
      <div className="space-y-4">
        {parts.map((part, i) => {
          if (!part.trim()) return null;
          
          const isOutlook = i > 0 || value.startsWith('[OUTLOOK_MSG]');
          
          if (isOutlook) {
            return (
              <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 relative group/msg">
                <div className="flex items-center gap-2 mb-2 text-amber-500/60 uppercase text-[10px] font-bold tracking-widest">
                  <StickyNote size={12} fill="currentColor" className="text-amber-500" />
                  Mensagem Importada (Outlook)
                </div>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap italic">
                  {part.trim()}
                </p>
              </div>
            );
          }

          return (
            <p key={i} className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {part.trim()}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="notes-panel flex flex-col h-full bg-transparent">
      {/* Header */}
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 shrink-0 bg-slate-900/40">
          <div className="flex items-center gap-2">
            <StickyNote size={15} className="text-amber-400" />
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-300">{label}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`text-[10px] font-bold px-2 py-1 rounded transition-all uppercase tracking-tighter ${isEditing ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >
              {isEditing ? 'Visualizar' : 'Editar'}
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || disabled || saving}
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all
                disabled:opacity-30 disabled:cursor-not-allowed
                enabled:hover:bg-sky-500/10 enabled:hover:text-sky-400
                text-slate-500"
            >
              {saved ? (
                <><CheckCircle2 size={13} className="text-emerald-400" /></>
              ) : (
                <><Save size={13} /><span>{saving ? '...' : ''}</span></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-5 custom-scrollbar">
        {isEditing ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            onBlur={() => { if (isDirty) handleSave(); }}
            autoFocus
            className="w-full h-full resize-none bg-transparent text-slate-300 text-sm leading-relaxed placeholder:text-slate-600 focus:outline-none"
            placeholder={placeholder}
          />
        ) : (
          <div onClick={() => !disabled && setIsEditing(true)} className="cursor-text h-full">
            {renderContent()}
          </div>
        )}
      </div>

      {!hideHeader && (
        <div className="px-5 py-2.5 border-t border-slate-800/50 shrink-0">
          <p className="text-[10px] text-slate-700 font-medium">Clique para editar · Sincronizado com a base de dados</p>
        </div>
      )}
    </aside>
  );
}
