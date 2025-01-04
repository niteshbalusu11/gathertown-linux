// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    myCustomGetDisplayMedia: () => ipcRenderer.invoke('DESKTOP_CAPTURER_GET_SOURCES'),
    toggleDevTools: () => ipcRenderer.invoke('TOGGLE_DEV_TOOLS')
  }
);
