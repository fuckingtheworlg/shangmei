const req = require('../../utils/request');
const auth = require('../../utils/auth');

const ROLE_TEXT = {
  SUPER_ADMIN: '超级管理员',
  FACTORY_ADMIN: '厂管理员',
  FACTORY_USER: '员工'
};

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
    user: null,
    roleText: '',
    isCenter: false,
    unreadCount: 0,
    todayChange: 0,
    summary: { deviceTotal: 0, partTotal: 0 },
    recent: []
  },
  onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({
      user,
      roleText: ROLE_TEXT[user.role] || '',
      isCenter: user.isCenter
    });
    this.loadAll();
  },
  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },
  async loadAll() {
    try {
      const [summary, msg, logs] = await Promise.all([
        req.get('/stock/summary'),
        req.get('/message/unread-count'),
        req.get('/change-log', { pageSize: 5 })
      ]);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayChange = logs.rows.filter((l) => new Date(l.createdAt) >= startOfDay).length;
      this.setData({
        summary,
        unreadCount: msg.count,
        todayChange,
        recent: logs.rows.map((r) => ({
          ...r,
          actionText: ACTION_TEXT[r.action] || r.action,
          timeText: formatTime(r.createdAt)
        }))
      });
    } catch (e) {}
  },
  goMessage() { wx.switchTab({ url: '/pages/change/index' }); },
  goChange() { wx.switchTab({ url: '/pages/change/index' }); },
  goDevice() { wx.switchTab({ url: '/pages/device/list' }); },
  goTransfer() { wx.navigateTo({ url: '/pages/transfer/index' }); },
  goNewModel() { wx.navigateTo({ url: '/pages/model/device-form' }); }
});
