const req = require('../../utils/request');
const auth = require('../../utils/auth');

const ACTION_TEXT = {
  CREATE: '新增',
  UPDATE: '更新',
  DELETE: '删除',
  TRANSFER_IN: '调入',
  TRANSFER_OUT: '调出',
  IMPORT: '导入'
};

function formatTime(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

Page({
  data: {
    tab: 'change',
    user: null,
    isCenter: false,
    factories: [],
    factoryIndex: 0,
    currentFactory: null,
    logs: [],
    messages: []
  },
  async onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({ user, isCenter: user.isCenter });
    if (user.isCenter && this.data.factories.length === 0) {
      try {
        const factories = await req.get('/factory');
        const list = [{ id: 0, name: '全部' }].concat(factories);
        this.setData({ factories: list, currentFactory: list[0] });
      } catch (e) {}
    }
    this.loadCurrent();
  },
  onPullDownRefresh() {
    this.loadCurrent().finally(() => wx.stopPullDownRefresh());
  },
  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab }, () => this.loadCurrent());
  },
  onFactoryChange(e) {
    const idx = Number(e.detail.value);
    const fac = this.data.factories[idx];
    this.setData({ factoryIndex: idx, currentFactory: fac }, () => this.loadCurrent());
  },
  loadCurrent() {
    return this.data.tab === 'change' ? this.loadLogs() : this.loadMessages();
  },
  async loadLogs() {
    const params = { pageSize: 30 };
    if (this.data.isCenter && this.data.currentFactory && this.data.currentFactory.id) {
      params.factoryId = this.data.currentFactory.id;
    }
    try {
      const res = await req.get('/change-log', params);
      this.setData({
        logs: res.rows.map((r) => ({
          ...r,
          actionText: ACTION_TEXT[r.action] || r.action,
          timeText: formatTime(r.createdAt)
        }))
      });
    } catch (e) {}
  },
  async loadMessages() {
    try {
      const res = await req.get('/message', { pageSize: 30 });
      this.setData({
        messages: res.rows.map((m) => ({ ...m, timeText: formatTime(m.createdAt) }))
      });
    } catch (e) {}
  }
});
