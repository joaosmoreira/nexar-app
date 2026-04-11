import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  fetchTarefasByOf, toggleTarefaConcluida, createTarefa,
  deleteOrdemFabrico, updateProjectoUltimoMovimento,
  updateOrdemFabrico, updateTarefa, deleteTarefa, reorderTarefas,
  OrdemFabrico, Tarefa,
} from '../services/api';
import { exportToExcel, exportToJson } from '../lib/exportUtils';
import { FileDown, CheckCircle2, Circle, Settings2, Plus, Trash2, Pencil, GripVertical, Check, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Modal } from './Modal';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent, DragOverlay, DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
        'group flex items-center gap-3 p-4 rounded-xl border transition-all',
        tarefa.concluido
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
      )}
    >
      {/* Drag handle */}
      <button
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 transition-colors touch-none"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        title="Arrastar para reordenar"
      >
        <GripVertical size={18} />
      </button>

      {/* Toggle */}
      <button className="flex-shrink-0" onClick={() => !editing && onToggle(tarefa)}>
        {tarefa.concluido
          ? <CheckCircle2 className="text-emerald-500 w-6 h-6 transition-transform hover:scale-110" />
          : <Circle className="text-slate-500 w-6 h-6 transition-transform hover:scale-110" />
        }
      </button>

      {/* Name / inline edit */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={submitEdit}
            className="w-full bg-slate-800 border border-sky-500/60 text-slate-100 rounded-lg px-3 py-1.5 text-base focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        ) : (
          <span className={cn('text-base transition-all break-words', tarefa.concluido ? 'text-emerald-500/70 line-through' : 'text-slate-200')}>
            {tarefa.nome_tarefa}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className={cn('flex items-center gap-1 flex-shrink-0 transition-opacity', editing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100')}>
        {editing ? (
          <>
            <button onClick={e => { e.stopPropagation(); submitEdit(); }} className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-colors" title="Guardar">
              <Check size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); cancelEdit(); }} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors" title="Cancelar">
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className="p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-colors" title="Editar nome">
              <Pencil size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(tarefa.id); }} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Apagar tarefa">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function OfView({ ofId }: { ofId: number }) {
  const [ofData, setOfData] = useState<OrdemFabrico | null>(null);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteInputName, setDeleteInputName] = useState('');
  const [editingOfName, setEditingOfName] = useState(false);
  const [editOfValue, setEditOfValue] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const ofNameInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadData = async () => {
    setLoading(true);
    const { data: oData } = await supabase
      .from('ordens_fabrico')
      .select('*, projectos(nome)')
      .eq('id', ofId)
      .single();
    if (oData) { setOfData(oData as OrdemFabrico); setProjectName((oData as any).projectos?.nome || ''); }
    const tData = await fetchTarefasByOf(ofId);
    setTarefas(tData);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [ofId]);

  const handleToggle = async (t: Tarefa) => {
    setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: !t.concluido } : task));
    try {
      await toggleTarefaConcluida(t.id, !t.concluido);
      if (ofData?.projeto_id) updateProjectoUltimoMovimento(ofData.projeto_id).catch(() => null);
    } catch { setTarefas(prev => prev.map(task => task.id === t.id ? { ...task, concluido: t.concluido } : task)); }
  };

  const handleDeleteTarefa = async (id: number) => {
    setTarefas(prev => prev.filter(t => t.id !== id));
    try { await deleteTarefa(id); } catch (e: any) { alert('Erro ao apagar tarefa: ' + e.message); loadData(); }
  };

  const handleRenameTask = async (id: number, nome: string) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, nome_tarefa: nome } : t));
    try { await updateTarefa(id, nome); } catch (e: any) { alert('Erro ao renomear: ' + e.message); loadData(); }
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
      try { await updateOrdemFabrico(ofData.id, { nome_of: trimmed }); } catch (e: any) { alert('Erro: ' + e.message); loadData(); }
    }
    setEditingOfName(false);
  };

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
    catch (e: any) { alert('Erro ao reordenar: ' + e.message); loadData(); }
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
    } catch (e: any) { alert('Erro ao adicionar tarefa: ' + e.message); }
  };

  const confirmApagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ofData) return;
    if (deleteInputName === ofData.numero_of) {
      try { await deleteOrdemFabrico(ofId); useAppStore.getState().setSelectedOf(null); }
      catch (e: any) { alert(e.message); }
    } else { alert('O número inserido não corresponde com o da O.F. atual.'); }
  };

  if (loading) return <div className="p-8 text-slate-400">A carregar detalhes da OF...</div>;
  if (!ofData) return <div className="p-8 text-slate-400">Ordem de Fabrico não encontrada.</div>;

  const progresso = Math.round((tarefas.filter(t => t.concluido).length / (tarefas.length || 1)) * 100);
  const activeTarefa = activeId ? tarefas.find(t => t.id === activeId) : null;

  return (
    <div className="p-8 h-full overflow-auto relative">

      {/* Delete OF Modal */}
      <Modal isOpen={deleteModalOpen} title="Apagar Ordem de Fabrico" onClose={() => setDeleteModalOpen(false)}>
        <form onSubmit={confirmApagar} className="flex flex-col gap-4">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
            <span className="font-bold">Segurança:</span> De certeza que deseja apagar a O.F.? Todas as ferramentas e passos serão anulados.
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              Para confirmar, escreva o número da OF: <strong className="text-slate-200">"{ofData.numero_of}"</strong>
            </label>
            <input autoFocus type="text" required value={deleteInputName} onChange={e => setDeleteInputName(e.target.value)}
              placeholder="Escreva número..."
              className="w-full bg-slate-950 border border-red-900/50 text-slate-200 rounded-lg p-2.5 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" />
          </div>
          <button type="submit" className="mt-2 w-full bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg p-3 transition-colors">
            Confirmar Eliminação Desta OF
          </button>
        </form>
      </Modal>

      {/* New Task Modal */}
      <Modal isOpen={modalOpen} title="Nova Tarefa" onClose={() => setModalOpen(false)}>
        <form onSubmit={submitTask} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Passo a executar</label>
            <input autoFocus type="text" required value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
              placeholder="ex: Rever acabamentos"
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all" />
          </div>
          <button type="submit" className="mt-2 w-full bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg p-3 transition-colors">
            Adicionar Passo
          </button>
        </form>
      </Modal>

      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center text-xs font-medium tracking-widest uppercase mb-2">
          <button onClick={() => useAppStore.getState().setSelectedOf(null)} className="text-slate-400 hover:text-sky-400 transition-colors cursor-pointer outline-none">
            {projectName || 'PROJETO'}
          </button>
          <span className="text-slate-700 mx-2">/</span>
          <span className="text-sky-400">O.F. {ofData.numero_of}</span>
        </div>

        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 group/title flex-1 mr-4">
            <Settings2 className="text-sky-500 shrink-0" />
            {editingOfName ? (
              <div className="flex items-center gap-2 flex-1">
                <input ref={ofNameInputRef} type="text" value={editOfValue}
                  onChange={e => setEditOfValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitOfName(); if (e.key === 'Escape') setEditingOfName(false); }}
                  onBlur={submitOfName}
                  className="flex-1 bg-slate-800 border border-sky-500/60 text-slate-100 text-2xl font-bold rounded-lg px-3 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500" />
                <button onClick={() => setEditingOfName(false)} className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:bg-slate-700 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-slate-100">{ofData.nome_of}</h2>
                <button onClick={startEditOfName}
                  className="opacity-0 group-hover/title:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all"
                  title="Editar nome da OF">
                  <Pencil size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            <button onClick={() => { setDeleteModalOpen(true); setDeleteInputName(''); }}
              className="flex items-center gap-2 px-3 py-2 bg-red-600/10 text-red-500 hover:bg-red-600/20 text-sm font-medium rounded-lg transition-colors border border-red-500/20">
              <Trash2 size={16} /> Apagar O.F.
            </button>
            <div className="w-px bg-slate-700/50 mx-2" />
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 rounded-lg transition-colors">
                <FileDown size={16} /> Exportar
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden flex flex-col">
                <button onClick={onExportExcel} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-emerald-400 font-medium text-sm border-b border-slate-700/50 transition-colors">
                  Excel <span className="text-[10px] text-emerald-500/50 border border-emerald-500/30 px-1 rounded">XLSX</span>
                </button>
                <button onClick={onExportJson} className="flex items-center justify-between w-full text-left px-4 py-3 hover:bg-slate-700 text-slate-300 text-sm transition-colors">
                  Backup <span className="text-[10px] text-slate-500 border border-slate-600 px-1 rounded">JSON</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl mb-8">
        <div className="flex justify-between items-end mb-3">
          <div className="text-sm font-medium text-slate-300">Progresso Operacional</div>
          <div className="text-xl font-bold text-sky-400">{progresso}%</div>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 flex items-center overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-1000 ease-out" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      {/* TASK LIST */}
      <div className="space-y-3 max-w-4xl">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-lg font-medium text-slate-200">Checklist de Tarefas</h3>
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <GripVertical size={12} /> Arrasta para reordenar
          </span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={tarefas.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {tarefas.map(tarefa => (
                <SortableTask key={tarefa.id} tarefa={tarefa} onToggle={handleToggle} onDelete={handleDeleteTarefa} onRenameSubmit={handleRenameTask} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTarefa ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-sky-500/50 bg-slate-800 shadow-2xl shadow-sky-900/30 opacity-95">
                <GripVertical size={18} className="text-sky-400" />
                <Circle className="text-slate-500 w-6 h-6 shrink-0" />
                <span className="text-base text-slate-200 flex-1">{activeTarefa.nome_tarefa}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {tarefas.length === 0 && (
          <div className="p-8 text-center bg-slate-900 rounded-xl border border-slate-800 text-slate-500">Sem tarefas registadas.</div>
        )}

        <button onClick={() => setModalOpen(true)}
          className="mt-4 w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all">
          <Plus size={18} />
          <span>Adicionar Tarefa Personalizada</span>
        </button>
      </div>
    </div>
  );
}
