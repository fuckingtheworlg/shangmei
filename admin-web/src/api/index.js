import req from './request';

export const authApi = {
  login: (data) => req.post('/auth/login', data),
  me: () => req.get('/auth/me')
};

export const factoryApi = {
  list: () => req.get('/factory'),
  create: (data) => req.post('/factory', data),
  update: (id, data) => req.patch(`/factory/${id}`, data),
  remove: (id) => req.delete(`/factory/${id}`)
};

export const userApi = {
  list: (params) => req.get('/user', { params }),
  create: (data) => req.post('/user', data),
  update: (id, data) => req.patch(`/user/${id}`, data),
  resetPwd: (id, data) => req.post(`/user/${id}/reset-password`, data),
  remove: (id) => req.delete(`/user/${id}`)
};

export const deviceModelApi = {
  list: (params) => req.get('/device-model', { params }),
  create: (data) => req.post('/device-model', data),
  update: (id, data) => req.patch(`/device-model/${id}`, data),
  remove: (id) => req.delete(`/device-model/${id}`)
};

export const partModelApi = {
  list: (params) => req.get('/part-model', { params }),
  create: (data) => req.post('/part-model', data),
  update: (id, data) => req.patch(`/part-model/${id}`, data),
  remove: (id) => req.delete(`/part-model/${id}`)
};

export const stockApi = {
  summary: (params) => req.get('/stock/summary', { params }),
  devices: (params) => req.get('/stock/devices', { params }),
  parts: (params) => req.get('/stock/parts', { params }),
  upsertDevice: (data) => req.post('/stock/devices', data),
  upsertPart: (data) => req.post('/stock/parts', data),
  adjustDevice: (id, data) => req.patch(`/stock/devices/${id}/adjust`, data),
  adjustPart: (id, data) => req.patch(`/stock/parts/${id}/adjust`, data),
  removeDevice: (id) => req.delete(`/stock/devices/${id}`),
  removePart: (id) => req.delete(`/stock/parts/${id}`)
};

export const changeLogApi = {
  list: (params) => req.get('/change-log', { params })
};

export const messageApi = {
  list: (params) => req.get('/message', { params })
};

export const transferApi = {
  transfer: (data) => req.post('/transfer', data)
};

export const excelApi = {
  downloadDeviceTpl: () => req.get('/excel/template/device', { responseType: 'blob' }),
  downloadPartTpl: () => req.get('/excel/template/part', { responseType: 'blob' }),
  exportDevice: (factoryId) =>
    req.get('/excel/export/device', { params: { factoryId }, responseType: 'blob' }),
  exportPart: (factoryId) =>
    req.get('/excel/export/part', { params: { factoryId }, responseType: 'blob' }),
  importDevice: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req.post('/excel/import/device', fd);
  },
  importPart: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req.post('/excel/import/part', fd);
  }
};

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
