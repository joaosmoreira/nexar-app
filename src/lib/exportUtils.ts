import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportProjectExcelWithTasks = (projetoNome: string, cliente: string, ofs: any[], filename: string) => {
  const data: any[][] = [];
  
  // Cabeçalho Principal Mestre
  data.push(["Obra", `${projetoNome}${cliente ? ` - ${cliente}` : ''}`]);
  data.push(["Data de Registo", new Date().toLocaleDateString('pt-PT')]);
  data.push([]); // blank row

  // Iterar pelas OFs
  for (const ofData of ofs) {
    data.push(["O.F.", `${ofData.numero_of} - ${ofData.nome_of}`]);
    
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
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportToJson = (data: any[], filename: string) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href",     dataStr);
  downloadAnchorNode.setAttribute("download", filename + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};
