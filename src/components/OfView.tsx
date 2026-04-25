import React, { useState, useRef } from 'react';
import {
  toggleTarefaConcluida, createTarefa,
  deleteOrdemFabrico, updateProjectoUltimoMovimento,
  updateOrdemFabrico, updateTarefa, deleteTarefa, reorderTarefas,
  Tarefa,
} from '../services/api';
import { exportToExcel, exportToJson } from '../lib/exportUtils';
import { FileDown, CheckCircle2, Circle, Settings2, Plus, Trash2, Pencil, GripVertical, Check, X, CalendarClock, AlertTriangle, Link as LinkIcon, ExternalLink } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import { toast } from 'sonner';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useOfData } from '../hooks/useOfData';
import { NotesPanel } from './NotesPanel';

// ─── Sortable Task Row ─────────────────────────────────────────────────────────

interface SortableTaskProps {
  tarefa: Tarefa;
  onToggle: (t: Tarefa) => void;
  onDelete: (id: number) => void;
  onRenameSubmit: (id: number, nome: string) => void;
}

function SortableTask({ tarefa, onToggle, onDelete, onRenameSubmit }: SortableTaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(tarefa.nome_tarefa);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditValue(tarefa.nome_tarefa);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const cancelEdit = () => { setEditing(false); setEditValue(tarefa.nome_tarefa); };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== tarefa.nome_tarefa) onRenameSubmit(tarefa.id, trimmed);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submitEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group flex items-center gap-3 p-4 rounded-xl border transition-all select-none',
        tarefa.concluido
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      )}
      {...attributes}
      {...listeners}
    >
      <button className="flex-shrink-0 relative z-10" onClick={() => !editing && onToggle(tarefa)}>
        {tarefa.concluido
          ? <CheckCircle2 className="text-emerald-500 w-6 h-6 transition-transform hover:scale-110" />
          : <Circle className="text-slate-500 w-6 h-6 transition-transform hover:scale-110" />
        }
      </button>

      <div className="flex-1 min-w-0 pointer-events-none">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={submitEdit}
            className="w-full bg-slate-800 border border-sky-500/60 text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-sky-500 pointer-events-auto"
          />
        ) : (
          <span className={cn('text-sm transition-all break-words', tarefa.concluido ? 'text-emerald-500/70 line-through' : 'text-slate-200')}>
            {tarefa.nome_tarefa}
          </span>
        )}
      </div>

      <div className={cn('flex items-center gap-1 flex-shrink-0 transition-opacity relative z-10', editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {editing ? (
          <>
            <button onClick={e => { e.stopPropagation(); submitEdit(); }} className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 active:scale-90 transition-all" title="Guardar"><Check size={14} /></button>
            <button onClick={e => { e.stopPropagation(); cancelEdit(); }} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 active:scale-90 transition-all" title="Cancelar"><X size={14} /></button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 active:scale-90 transition-all" title="Editar nome"><Pencil size={14} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(tarefa.id); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all" title="Apagar tarefa"><Trash2 size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function OfView({ ofId }: { ofId: number }) {
  const {
    ofData, setOfData, tarefas, setTarefas, loading, 
    projectName, notas, setNotas, 
    setInitialNotas, prazoLimite, setPrazoLimite, 
    anexoUrl, setAnexoUrl, loadData 
  } = useOfData(ofId);

  const [modalOpen, setModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInputName, setDeleteInputName] = useState('');
  const [editingOfName, setEditingOfName] = useState(false);
  const [editOfValue, setEditOfValue] = useState('');
  const [editingNumeroOf, setEditingNumeroOf] = useState(false);
  const [editNumeroOfValue, setEditNumeroOfValue] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [editingPrazo, setEditingPrazo] = useState(false);
  const [prazoEditValue, setPrazoEditValue] = useState('');
  const [editingAnexo, setEditingAnexo] = useState(false);
  const [anexoEditValue, setAnexoEditValue] = useState('');
  const ofNameInputRef = useRef<HTMLInputElement>(null);
  const ofNumeroInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleToggle = async (t: Tarefa) => {
    setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: !t.concluido } : task));
    try {
      await toggleTarefaConcluida(t.id, !t.concluido);
      if (ofData?.projeto_id) updateProjectoUltimoMovimento(ofData.projeto_id).catch(() => null);
      useAppStore.getState().incrementDataVersion();
    } catch { setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: t.concluido } : task)); }
  };

  const handleDeleteTarefa = async (id: number) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
    try { await deleteTarefa(id); toast.success("Tarefa apagada."); } catch (e: any) { toast.error('Erro ao apagar tarefa: ' + e.message); loadData(); }
  };

  const handleRenameTask = async (id: number, nome: string) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, nome_tarefa: nome } : t));
    try { await updateTarefa(id, nome); toast.success("Nome atualizado."); } catch (e: any) { toast.error('Erro ao renomear: ' + e.message); loadData(); }
  };

  const startEditOfName = () => {
    setEditOfValue(ofData?.nome_of || '');
    setEditingOfName(true);
    setTimeout(() => ofNameInputRef.current?.focus(), 0);
  };

  const submitOfName = async () => {
    const trimmed = editOfValue.trim();
    if (trimmed && trimmed !== ofData?.nome_of && ofData) {
      setOfData(prev => prev ? { ...prev, nome_of: trimmed } : prev);
      try { await updateOrdemFabrico(ofData.id, { nome_of: trimmed }); toast.success("OF renomeada."); } catch (e: any) { toast.error('Erro: ' + e.message); loadData(); }
    }
    setEditingOfName(false);
  };

  const startEditNumeroOf = () => {
    setEditNumeroOfValue(ofData?.numero_of || '');
    setEditingNumeroOf(true);
    setTimeout(() => ofNumeroInputRef.current?.focus(), 0);
  };

  const submitNumeroOf = async () => {
    const trimmed = editNumeroOfValue.trim();
    if (trimmed && trimmed !== ofData?.numero_of && ofData) {
      setOfData(prev => prev ? { ...prev, numero_of: trimmed } : prev);
      try {
        await updateOrdemFabrico(ofData.id, { numero_of: trimmed });
        useAppStore.getState().incrementDataVersion();
        toast.success('Número de OF atualizado.');
      } catch (e: any) {
        toast.error('Erro ao atualizar número: ' + e.message);
        loadData();
      }
    }
    setEditingNumeroOf(false);
  };


  const handleSaveNotas = async () => {
    if (ofData) {
      await updateOrdemFabrico(ofId, { notas });
      setInitialNotas(notas);
    }
  };

  const handleSavePrazo = async () => {
    const newPrazo = prazoEditValue ? new Date(prazoEditValue).toISOString() : null;
    try {
      await updateOrdemFabrico(ofId, { prazo_limite: newPrazo });
      setPrazoLimite(newPrazo);
      setEditingPrazo(false);
      toast.success(newPrazo ? 'Prazo definido.' : 'Prazo removido.');
    } catch (e: any) {
      toast.error('Erro ao guardar prazo: ' + e.message);
    }
  };

  const handleRemovePrazo = async () => {
    try {
      await updateOrdemFabrico(ofId, { prazo_limite: null });
      setPrazoLimite(null);
      setEditingPrazo(false);
      toast.success('Prazo removido.');
    } catch (e: any) {
      toast.error('Erro ao remover prazo: ' + e.message);
    }
  };

  const handleSaveAnexo = async () => {
    const newAnexo = anexoEditValue.trim() || null;
    try {
      await updateOrdemFabrico(ofId, { anexo_url: newAnexo });
      setAnexoUrl(newAnexo);
      setEditingAnexo(false);
      toast.success(newAnexo ? 'Link anexado.' : 'Link removido.');
    } catch (e: any) {
      toast.error('Erro ao guardar link: ' + e.message);
    }
  };

  const prazoInfo = (() => {
    if (!prazoLimite) return null;
    const d = new Date(prazoLimite);
    const diffMs = d.getTime() - Date.now();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });
    if (diffDays < 0) return { label, color: 'text-red-400', badge: 'Expirado', icon: 'red' };
    if (diffDays <= 7) return { label, color: 'text-amber-400', badge: `${diffDays} dia${diffDays !== 1 ? 's' : ''}`, icon: 'amber' };
    return { label, color: 'text-sky-400', badge: `${diffDays} dias`, icon: 'sky' };
  })();

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tarefas.findIndex(t => t.id === active.id);
    const newIndex = tarefas.findIndex(t => t.id === over.id);
    const reordered = arrayMove(tarefas, oldIndex, newIndex).map((t, i) => ({ ...t, ordem_index: i }));
    setTarefas(reordered);
    try { await reorderTarefas(reordered.map(t => ({ id: t.id, ordem_index: t.ordem_index }))); }
    catch (e: any) { toast.error('Erro ao reordenar: ' + e.message); loadData(); }
  };

  const onExportJson = () => exportToJson(tarefas.map(t => ({ Tarefa: t.nome_tarefa, Status: t.concluido ? 'Concluída' : 'Pendente' })), `tarefas_${ofData?.numero_of}`);
  const onExportExcel = () => exportToExcel(tarefas.map(t => ({ Tarefa: t.nome_tarefa, Status: t.concluido ? 'Concluída' : 'Pendente' })), `tarefas_${ofData?.numero_of}`);

  const submitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName) return;
    try {
      const novaTarefa = await createTarefa(ofId, newTaskName, tarefas.length);
      setTarefas([...tarefas, novaTarefa]);
      setModalOpen(false);
      setNewTaskName('');
      useAppStore.getState().incrementDataVersion();
      toast.success("Tarefa adicionada!");
    } catch (e: any) { toast.error('Erro ao adicionar tarefa: ' + e.message); }
  };

  const confirmApagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofData) return;
    if (deleteInputName === ofData.numero_of) {
      try { 
         await deleteOrdemFabrico(ofId); 
         useAppStore.getState().incrementDataVersion();
         toast.success("OF apagada."); 
         useAppStore.getState().setSelectedOf(null); 
      }
      catch (e: any) { toast.error(e.message); }
    } else { toast.error('O número inserido não corresponde com o da OF atual.'); }
  };

  if (loading) return <div className="p-8 text-slate-400">A carregar detalhes da OF...</div>;
  if (!ofData) return <div className="p-8 text-slate-400">Ordem de Fabrico não encontrada.</div>;

  const progresso = Math.round((tarefas.filter(t => t.concluido).length / (tarefas.length || 1)) * 100);
  const activeTarefa = activeId ? tarefas.find(t => t.id === activeId) : null;

  return (
    <div className="flex flex-col xl:flex-row h-full overflow-hidden">
      {/* ── Main scrollable area ── */}
      <div className="flex-1 min-w-0 p-8 pb-32 overflow-auto relative">
      <Modal isOpen={deleteModalOpen} title="Apagar Ordem de Fabrico" onClose={() => setDeleteModalOpen(false)}>
        <form onSubmit={confirmApagar} className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm"><span className="font-bold">Segurança:</span> De certeza que deseja apagar a OF?</div>
          <div><label className="block text-sm font-medium text-slate-400 mb-1">Confirme o número: <strong className="text-slate-200">"{ofData.numero_of}"</strong></label>
          <input autoFocus type="text" required value={deleteInputName} onChange={e => setDeleteInputName(e.target.value)} placeholder="Escreva número..." className="w-full bg-slate-950 border border-red-900/50 text-slate-200 rounded-lg p-2.5 focus:border-red-500 outline-none transition-all" /></div>
          <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg p-3 transition-all">Confirmar Eliminação</button>
        </form>
      </Modal>

      <Modal isOpen={modalOpen} title="Nova Tarefa" onClose={() => setModalOpen(false)}>
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium text-slate-400 mb-1">Passo a executar</label>
          <input autoFocus type="text" required value={newTaskName} onChange={e => setNewTaskName(e.target.value)} placeholder="ex: Rever acabamentos" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 outline-none transition-all" /></div>
          <button type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg p-3 transition-all">Adicionar Passo</button>
        </form>
      </Modal>

      <div className="mb-8">
        <div className="flex items-center text-xs font-medium tracking-widest uppercase mb-2 group/breadcrumb">
          <button onClick={() => useAppStore.getState().setSelectedOf(null)} className="text-slate-400 hover:text-sky-400 transition-colors cursor-pointer outline-none">{projectName || 'PROJETO'}</button>
          <span className="text-slate-700 mx-2">/</span>
          {editingNumeroOf ? (
            <span className="flex items-center gap-1">
              <input
                ref={ofNumeroInputRef}
                type="text"
                value={editNumeroOfValue}
                onChange={e => setEditNumeroOfValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitNumeroOf(); if (e.key === 'Escape') setEditingNumeroOf(false); }}
                onBlur={submitNumeroOf}
                className="bg-slate-800 border border-sky-500/60 text-sky-400 rounded px-2 py-0.5 text-xs font-bold uppercase tracking-widest w-32 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-sky-400">OF {ofData.numero_of}</span>
              <button
                onClick={startEditNumeroOf}
                className="opacity-0 group-hover/breadcrumb:opacity-100 p-0.5 rounded text-slate-600 hover:text-sky-400 hover:bg-sky-500/10 active:scale-90 transition-all"
                title="Editar número de OF"
              >
                <Pencil size={11} />
              </button>
            </span>
          )}
        </div>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 group/title flex-1 mr-4"><Settings2 className="text-sky-500 shrink-0" />
            {editingOfName ? <input ref={ofNameInputRef} type="text" value={editOfValue} onChange={e => setEditOfValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitOfName(); if (e.key === 'Escape') setEditingOfName(false); }} onBlur={submitOfName} className="flex-1 bg-slate-800 border border-sky-500/60 text-slate-100 text-xl font-bold rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500" />
            : <div className="flex items-center gap-2"><h2 className="text-2xl font-bold text-slate-100">{ofData.nome_of}</h2><button onClick={startEditOfName} className="opacity-0 group-hover/title:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 active:scale-90 transition-all"><Pencil size={16} /></button></div>}
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setDeleteModalOpen(true); setDeleteInputName(''); }} className="flex items-center gap-2 px-3 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 text-sm font-medium rounded-lg transition-all border border-red-500/20"><Trash2 size={16} /> Apagar</button>
            <div className="w-px bg-slate-700/50 mx-2" />
            <div className="relative group"><button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 rounded-lg transition-all"><FileDown size={16} /> Exportar</button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
                <button onClick={onExportExcel} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-emerald-400 font-medium text-sm border-b border-slate-700/50 transition-colors">Excel <span className="text-[10px] text-emerald-500/50 border border-emerald-500/30 px-1 rounded">XLSX</span></button>
                <button onClick={onExportJson} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 text-sm transition-colors">Backup <span className="text-[10px] text-slate-500 border border-slate-600 px-1 rounded">JSON</span></button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-8 items-stretch">
        <div className="flex-1 bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
          <div className="flex justify-between items-end mb-3"><div className="text-sm font-medium text-slate-300">Progresso Operacional</div><div className="text-lg font-bold text-sky-400">{progresso}%</div></div>
          <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 flex items-center overflow-hidden"><div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-1000 ease-out" style={{ width: `${progresso}%` }} /></div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between min-w-[200px] max-w-[240px] shrink-0">
          <div className="flex items-center justify-between mb-3"><div className="text-sm font-medium text-slate-300">Prazo Limite</div>{!editingPrazo && <button onClick={() => { setPrazoEditValue(prazoLimite ? prazoLimite.split('T')[0] : ''); setEditingPrazo(true); }} className="p-1 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all"><Pencil size={13} /></button>}</div>
          {editingPrazo ? <div className="flex flex-col gap-2"><div className="relative"><CalendarClock size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" /><input autoFocus type="date" value={prazoEditValue} onChange={e => setPrazoEditValue(e.target.value)} className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg pl-8 pr-2 py-2 text-sm focus:border-sky-500 outline-none transition-all" /></div><div className="flex gap-1.5"><button onClick={handleSavePrazo} className="flex-1 p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 active:scale-95 transition-all text-xs font-medium flex items-center justify-center gap-1"><Check size={12} /> Guardar</button>{prazoLimite && <button onClick={handleRemovePrazo} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"><Trash2 size={13} /></button>}<button onClick={() => setEditingPrazo(false)} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"><X size={13} /></button></div></div>
          : prazoInfo ? <div><div className={cn('flex items-center gap-1.5 mb-1.5', prazoInfo.color)}>{prazoInfo.icon === 'red' || prazoInfo.icon === 'amber' ? <AlertTriangle size={14} /> : <CalendarClock size={14} />}<span className="text-sm font-semibold">{prazoInfo.label}</span></div><span className={cn('text-xs font-bold px-2 py-0.5 rounded-md', prazoInfo.icon === 'red' ? 'bg-red-500/20 text-red-400' : prazoInfo.icon === 'amber' ? 'bg-amber-500/20 text-amber-400' : 'bg-sky-500/20 text-sky-400')}>{prazoInfo.badge}</span></div>
          : <button onClick={() => { setPrazoEditValue(''); setEditingPrazo(true); }} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-400 transition-colors"><CalendarClock size={13} /> Definir prazo...</button>}
        </div>
      </div>



      <div className="space-y-3 max-w-4xl">
        <div className="flex items-center justify-between mb-4 px-1"><h3 className="text-base font-medium text-slate-200">Checklist de Tarefas</h3><span className="text-xs text-slate-500 flex items-center gap-1.5"><GripVertical size={12} /> Arrasta para reordenar</span></div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={tarefas.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">{tarefas.map(tarefa => (<SortableTask key={tarefa.id} tarefa={tarefa} onToggle={handleToggle} onDelete={handleDeleteTarefa} onRenameSubmit={handleRenameTask} />))}</div>
          </SortableContext>
          <DragOverlay>{activeTarefa ? (<div className="flex items-center gap-3 p-4 rounded-xl border border-sky-500/50 bg-slate-800 shadow-2xl opacity-95"><GripVertical size={18} className="text-sky-400" /><Circle className="text-slate-500 w-6 h-6 shrink-0" /><span className="text-sm text-slate-200 flex-1">{activeTarefa.nome_tarefa}</span></div>) : null}</DragOverlay>
        </DndContext>
        {tarefas.length === 0 && <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500">Sem tarefas.</div>}
        <button onClick={() => setModalOpen(true)} className="mt-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-500/50 active:scale-[0.98] transition-all"><Plus size={18} /><span>Adicionar Tarefa</span></button>
      </div>
    </div>

    {/* ── Sidebar: Notas e Anexos ── */}
    <div className="w-full xl:w-80 shrink-0 border-t xl:border-t-0 xl:border-l border-slate-800 bg-slate-900/40 flex flex-col h-72 xl:h-full overflow-hidden">
      
      {/* ── Anexos da OF ── */}
      <div className="p-5 border-b border-slate-800/60 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <LinkIcon size={14} className="text-sky-500" />
            Pasta da Obra (Cloud)
          </h3>
          {!editingAnexo && (
            <button onClick={() => { setAnexoEditValue(anexoUrl || ''); setEditingAnexo(true); }} className="p-1 rounded text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all">
              <Pencil size={13} />
            </button>
          )}
        </div>

        {editingAnexo ? (
          <div className="flex flex-col gap-2">
            <input autoFocus type="url" value={anexoEditValue} onChange={e => setAnexoEditValue(e.target.value)} placeholder="https://..." className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:border-sky-500 outline-none transition-all" />
            <div className="flex gap-1.5">
              <button onClick={handleSaveAnexo} className="flex-1 p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 active:scale-95 transition-all text-xs font-medium flex items-center justify-center gap-1"><Check size={12} /> Guardar</button>
              <button onClick={() => setEditingAnexo(false)} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"><X size={13} /></button>
            </div>
          </div>
        ) : anexoUrl ? (
          <a href={anexoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-sky-500/50 text-slate-200 text-sm font-medium rounded-lg transition-all group overflow-hidden">
            <ExternalLink size={14} className="text-sky-400 shrink-0" />
            <span className="truncate text-xs text-sky-400 group-hover:underline">Abrir Repositório</span>
          </a>
        ) : (
          <button onClick={() => { setAnexoEditValue(''); setEditingAnexo(true); }} className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-sky-400 hover:border-sky-500/50 transition-all text-xs font-medium">
            <Plus size={14} /> Colar Link da Cloud
          </button>
        )}
      </div>

      <NotesPanel
        value={notas}
        onChange={setNotas}
        onSave={handleSaveNotas}
        placeholder="Referências, materiais, observações..."
        label="Notas de Produção"
      />
    </div>
  </div>
);
}
