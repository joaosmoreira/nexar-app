import * as XLSX from 'xlsx-js-style';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { openPath } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';

const isTauri = () => '__TAURI_INTERNALS__' in window;

// ── Estilos reutilizáveis ──────────────────────────────────────────
const TITLE_STYLE = { font: { sz: 16, bold: true } };
const HEADER_STYLE = { font: { sz: 14, bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } };
const BODY_STYLE = { font: { sz: 14 } };
const LABEL_STYLE = { font: { sz: 14, bold: true } };
const SECTION_STYLE = { font: { sz: 16, bold: true }, fill: { fgColor: { rgb: 'E2E8F0' } } };

function applyStyle(ws: XLSX.WorkSheet, cellRef: string, style: any) {
  if (ws[cellRef]) {
    ws[cellRef].s = style;
  }
}

function applyRowStyle(ws: XLSX.WorkSheet, row: number, cols: number, style: any) {
  for (let c = 0; c < cols; c++) {
    const ref = XLSX.utils.encode_cell({ r: row, c });
    if (ws[ref]) ws[ref].s = style;
  }
}

/**
 * Exporta o progresso de um projeto para Excel com formatação profissional.
 * Estrutura: Cabeçalho do Projeto > Tabela de OFs com tarefas detalhadas
 */
export const exportProjectExcelWithTasks = async (
  projetoNome: string,
  cliente: string,
  ofs: any[],
  filename: string
) => {
  const data: any[][] = [];

  // ── Cabeçalho do Projeto ──────────────────────────────────────────
  const ROW_TITLE = data.length; data.push(['RELATÓRIO DE PROGRESSO']);
  data.push([]);
  data.push(['Obra', projetoNome]);
  data.push(['Cliente', cliente && cliente !== 'Desconhecido' ? cliente : '—']);
  data.push(['Data do Relatório', new Date().toLocaleDateString('pt-PT')]);
  data.push(['Total de OFs', ofs.length]);
  data.push(['OFs Concluídas', ofs.filter(of => {
    const total = of.tarefas?.length || 0;
    const done = of.tarefas?.filter((t: any) => t.concluido).length || 0;
    return total > 0 && done === total;
  }).length]);
  data.push([]);
  data.push([]); // espaço antes da tabela

  // ── Tabela das OFs ────────────────────────────────────────────────
  const ROW_OF_HEADER = data.length;
  data.push(['Nº OF', 'Nome', 'Data Criação', 'Prazo Limite', 'Progresso', 'Status']);

  for (const of_ of ofs) {
    const tarefas = Array.isArray(of_.tarefas) ? [...of_.tarefas] : [];
    tarefas.sort((a: any, b: any) => (a.ordem_index || 0) - (b.ordem_index || 0));
    const total = tarefas.length || 1;
    const done = tarefas.filter((t: any) => t.concluido).length;
    const progress = Math.round((done / total) * 100);
    const prazo = of_.prazo_limite
      ? new Date(of_.prazo_limite).toLocaleDateString('pt-PT')
      : '—';
    const status = progress === 100 ? 'Concluída' : progress === 0 ? 'Pendente' : 'Em Progresso';

    data.push([
      of_.numero_of,
      of_.nome_of,
      new Date(of_.criado_em).toLocaleDateString('pt-PT'),
      prazo,
      `${progress}%`,
      status,
    ]);
  }

  data.push([]);
  data.push([]);

  // ── Detalhe das Tarefas por OF ────────────────────────────────────
  const ROW_DETAIL_TITLE = data.length;
  data.push(['DETALHE DAS TAREFAS POR ORDEM DE FABRICO']);
  data.push([]);

  // Guardar posições das linhas de OF e cabeçalhos de tarefas
  const ofHeaderRows: number[] = [];
  const taskHeaderRows: number[] = [];

  for (const of_ of ofs) {
    const tarefas = Array.isArray(of_.tarefas) ? [...of_.tarefas] : [];
    tarefas.sort((a: any, b: any) => (a.ordem_index || 0) - (b.ordem_index || 0));
    const total = tarefas.length || 1;
    const done = tarefas.filter((t: any) => t.concluido).length;

    ofHeaderRows.push(data.length);
    data.push([`OF ${of_.numero_of}`, of_.nome_of, '', '', `${done}/${total} tarefas`]);

    if (tarefas.length === 0) {
      data.push(['', 'Sem tarefas registadas']);
    } else {
      taskHeaderRows.push(data.length);
      data.push(['', 'Tarefa', 'Estado']);
      for (const t of tarefas) {
        data.push([
          '',
          t.nome_tarefa,
          t.concluido ? '✓ Concluída' : '○ Pendente',
        ]);
      }
    }

    data.push([]); // espaço entre OFs
  }

  // ── Criar workbook ────────────────────────────────────────────────
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Largura das colunas
  worksheet['!cols'] = [
    { wch: 20 }, // A — Nº OF / Label
    { wch: 38 }, // B — Nome / Tarefa
    { wch: 18 }, // C — Data
    { wch: 18 }, // D — Prazo
    { wch: 16 }, // E — Progresso
    { wch: 16 }, // F — Status
  ];

  // ── Aplicar estilos ────────────────────────────────────────────────
  const COLS = 6;

  // Título principal
  applyStyle(worksheet, XLSX.utils.encode_cell({ r: ROW_TITLE, c: 0 }), TITLE_STYLE);

  // Labels do cabeçalho (Obra, Cliente, etc.) — col A bold, col B normal
  for (let r = ROW_TITLE + 2; r <= ROW_TITLE + 6; r++) {
    applyStyle(worksheet, XLSX.utils.encode_cell({ r, c: 0 }), LABEL_STYLE);
    applyStyle(worksheet, XLSX.utils.encode_cell({ r, c: 1 }), BODY_STYLE);
  }

  // Cabeçalho da tabela de OFs
  applyRowStyle(worksheet, ROW_OF_HEADER, COLS, HEADER_STYLE);

  // Linhas de dados das OFs
  for (let r = ROW_OF_HEADER + 1; r < ROW_DETAIL_TITLE - 2; r++) {
    applyRowStyle(worksheet, r, COLS, BODY_STYLE);
  }

  // Título secção detalhe
  applyStyle(worksheet, XLSX.utils.encode_cell({ r: ROW_DETAIL_TITLE, c: 0 }), SECTION_STYLE);

  // Cabeçalhos de OF no detalhe
  for (const r of ofHeaderRows) {
    applyRowStyle(worksheet, r, COLS, LABEL_STYLE);
  }

  // Cabeçalhos de tarefa
  for (const r of taskHeaderRows) {
    applyRowStyle(worksheet, r, 3, HEADER_STYLE);
  }

  // Aplicar fonte 14 a TODAS as celulas restantes que não tenham estilo
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (worksheet[ref] && !worksheet[ref].s) {
        worksheet[ref].s = BODY_STYLE;
      }
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Progresso');

  await saveWorkbook(workbook, filename);
};

/**
 * Exportação simples (JSON → Excel tabular) usada pela OfView.
 */
export const exportToExcel = async (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }));
  worksheet['!cols'] = colWidths;

  // Aplicar estilos: cabeçalho 16, corpo 14
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let c = range.s.c; c <= range.e.c; c++) {
    const headerRef = XLSX.utils.encode_cell({ r: 0, c });
    if (worksheet[headerRef]) worksheet[headerRef].s = HEADER_STYLE;
    for (let r = 1; r <= range.e.r; r++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (worksheet[ref]) worksheet[ref].s = BODY_STYLE;
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Folha1');

  await saveWorkbook(workbook, filename);
};

/**
 * Exportação JSON (backup).
 */
export const exportToJson = async (data: any[], filename: string) => {
  if (isTauri()) {
     try {
       const filePath = await save({
         filters: [{ name: 'JSON Document', extensions: ['json'] }],
         defaultPath: `${filename}.json`
       });
       if (filePath) {
          await writeTextFile(filePath, JSON.stringify(data, null, 2));
          toast.success("Backup JSON guardado em disco!", {
            action: { label: 'Abrir', onClick: () => openPath(filePath) },
          });
       }
     } catch (e: any) { toast.error("Erro ao guardar json: " + (e?.message || String(e))); }
  } else {
     // Browser nativo
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
     const downloadAnchorNode = document.createElement('a');
     downloadAnchorNode.setAttribute("href", dataStr);
     downloadAnchorNode.setAttribute("download", filename + ".json");
     document.body.appendChild(downloadAnchorNode);
     downloadAnchorNode.click();
     downloadAnchorNode.remove();
     toast.success("Backup JSON extraído (Web)");
  }
};

// ── Helper interno para guardar workbooks ─────────────────────────
async function saveWorkbook(workbook: XLSX.WorkBook, filename: string) {
  if (isTauri()) {
    try {
      const filePath = await save({
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        defaultPath: `${filename}.xlsx`
      });
      if (filePath) {
        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        await writeFile(filePath, new Uint8Array(excelBuffer));
        toast.success("Relatório exportado com sucesso!", {
          action: { label: 'Abrir', onClick: () => openPath(filePath) },
        });
      }
    } catch (e: any) {
      toast.error("Erro ao guardar documento: " + (e?.message || String(e)));
    }
  } else {
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    toast.success("Relatório exportado com sucesso!");
  }
}
