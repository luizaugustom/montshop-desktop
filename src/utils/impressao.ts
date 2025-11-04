export async function imprimirNota(nota: any) {
  // @ts-ignore
  const ipcRenderer = window.electron?.ipcRenderer || window.require?.('electron').ipcRenderer;
  if (!ipcRenderer) return { success: false, error: 'IPC não disponível' };
  return await ipcRenderer.invoke('imprimir-nota', nota);
}
