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

const STATUS_TEXT = {
  PENDING: '待审批',
  APPROVED: '已通过',
  COMPLETED: '已完成',
  REJECTED: '已拒绝',
  CANCELLED: '已取消'
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
    messages: [],
    requests: [],
    pendingBadge: 0,
    statusText: STATUS_TEXT
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
    // 顺便刷一下右上角徽标
    req.get('/transfer-request/pending-count').then((r) => this.setData({ pendingBadge: r.count })).catch(() => {});
    if (this.data.tab === 'change') return this.loadLogs();
    if (this.data.tab === 'message') return this.loadMessages();
    return this.loadRequests();
  },
  async loadRequests() {
    try {
      const res = await req.get('/transfer-request', { pageSize: 50 });
      this.setData({
        requests: res.rows.map((r) => ({ ...r, timeText: formatTime(r.createdAt) }))
      });
    } catch (e) {}
  },
  goRequestPage() { wx.navigateTo({ url: '/pages/transfer/list' }); },
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
