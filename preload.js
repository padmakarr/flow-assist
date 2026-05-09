const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('taskAPI', {
  ping: () => console.log('Preload bridge is active and connected!'),
  debugMode: process.argv.includes('--flowassist-debug'),
  getAppMetadata: () => ipcRenderer.invoke('get-app-metadata'),
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  saveTasks: (data) => ipcRenderer.invoke('save-tasks', data),
  getActiveProfilePath: () => ipcRenderer.invoke('get-active-profile-path'),
  showErrorDialog: (options) => ipcRenderer.invoke('show-error-dialog', options),
  dialogOpenProfile: () => ipcRenderer.invoke('dialog-open-profile'),
  profileActivateFromPath: (filePath) => ipcRenderer.invoke('profile-activate-from-path', filePath),
  dialogNewProfile: () => ipcRenderer.invoke('dialog-new-profile'),
  profileCreateNew: (filePath) => ipcRenderer.invoke('profile-create-new', filePath),
  profileSaveAs: (data) => ipcRenderer.invoke('profile-save-as', data),
  openHtmlInBrowser: (html) => ipcRenderer.invoke('open-html-in-browser', { html }),
  onFileMenu: (callback) => {
    ipcRenderer.on('file-menu', function (_event, action) {
      callback(action);
    });
  },
  syncNoteReminders: (list) => ipcRenderer.invoke('sync-note-reminders', list),
  reminderPopupAction: (payload) => ipcRenderer.invoke('reminder-popup-action', payload),
  onNoteReminderAction: (callback) => {
    ipcRenderer.on('note-reminder-action', function (_event, actionPayload) {
      callback(actionPayload);
    });
  }
});
