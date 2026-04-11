import * as XLSX from 'xlsx';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';

const isTauri = () => '__TAURI_INTERNALS__' in window;

export const exportProjectExcelWithTasks = async (projetoNome: string, cliente: string, ofs: any[], filename: string) => {
  const data: any[][] = [];
  
  // Cabeçalho Principal Mestre
  data.push(["Obra", `${projetoNome}${cliente && cliente !== 'Desconhecido' ? ` - ${cliente}` : ''}`]);
  data.push(["Data de Registo", new Date().toLocaleDateString('pt-PT')]);
  data.push([]); // blank row

  // Iterar pelas OFs
  for (const ofData of ofs) {
    data.push(["OF", `${ofData.numero_of} - ${ofData.nome_of}`]);
    
    // Sort logic to make sure standard tasks come in order if needed
    const tarefas = Array.isArray(ofData.tarefas) ? [...ofData.tarefas] : [];
    tarefas.sort((a,b) => (a.ordem_index || 0) - (b.ordem_index || 0));

    if (tarefas.length === 0) {
       data.push(["", "Sem tarefas registadas"]);
    } else {
       for (const t of tarefas) {
         data.push([`>> ${t.nome_tarefa}`, t.concluido ? "terminado" : "aberto"]);
       }
    }
    
    data.push([]); // blank space before next OF
  }

  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Progresso Obras");

  if (isTauri()) {
     try {
       const filePath = await save({
         filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
         defaultPath: `${filename}.xlsx`
       });
       if (filePath) {
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          await writeFile(filePath, new Uint8Array(excelBuffer));
       }
     } catch (e: any) { alert("Erro ao guardar documento: " + e.message); }
  } else {
     // Fallback para quando o João testa no Google Chrome / Safari normal ("npm run dev" fora da App)
     XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
};

export const exportToExcel = async (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Folha1");

  if (isTauri()) {
     try {
       const filePath = await save({
         filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
         defaultPath: `${filename}.xlsx`
       });
       if (filePath) {
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          await writeFile(filePath, new Uint8Array(excelBuffer));
       }
     } catch (e: any) { alert("Erro ao guardar excell: " + e.message); }
  } else {
     XLSX.writeFile(workbook, `${filename}.xlsx`);
  }
};

export const exportToJson = async (data: any[], filename: string) => {
  if (isTauri()) {
     try {
       const filePath = await save({
         filters: [{ name: 'JSON Document', extensions: ['json'] }],
         defaultPath: `${filename}.json`
       });
       if (filePath) {
          await writeTextFile(filePath, JSON.stringify(data, null, 2));
       }
     } catch (e: any) { alert("Erro ao guardar json: " + e.message); }
  } else {
     // Browser nativo
     const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
     const downloadAnchorNode = document.createElement('a');
     downloadAnchorNode.setAttribute("href", dataStr);
     downloadAnchorNode.setAttribute("download", filename + ".json");
     document.body.appendChild(downloadAnchorNode);
     downloadAnchorNode.click();
     downloadAnchorNode.remove();
  }
};
