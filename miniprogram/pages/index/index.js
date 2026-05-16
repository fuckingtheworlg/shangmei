const req = require('../../utils/request');
const auth = require('../../utils/auth');

const ROLE_TEXT = {
  SUPER_ADMIN: '超级管理员',
  FACTORY_ADMIN: '厂管理员',
  FACTORY_USER: '员工'
};

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 6) return '凌晨好';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

Page({
  data: {
    user: null,
    roleText: '',
    isCenter: false,
    greeting: '你好',
    clockTime: '',
    clockDate: '',
    unreadCount: 0,
    todayChange: 0,
    pendingCount: 0,
    summary: { deviceTotal: 0, partTotal: 0 },
    status: { inUse: 0, standby: 0, idle: 0, stopped: 0 },
    statusTotal: 0,
    statusPct: { inUse: 0, standby: 0, idle: 0, stopped: 0 }
  },
  _timer: null,
  onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({
      user,
      roleText: ROLE_TEXT[user.role] || '',
      isCenter: user.isCenter,
      greeting: greetingByHour()
    });
    this.tick();
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this.tick(), 30 * 1000);
    this.loadAll();
  },
  onHide() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },
  onUnload() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },
  onPullDownRefresh() {
    this.loadAll().finally(() => wx.stopPullDownRefresh());
  },
  tick() {
    const d = new Date();
    this.setData({
      clockTime: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      clockDate: `${d.getMonth() + 1}月${d.getDate()}日`
    });
  },
  async loadAll() {
    try {
      const tasks = [
        req.get('/stock/summary'),
        req.get('/message/unread-count'),
        req.get('/change-log', { pageSize: 50 }),
        req.get('/transfer-request/pending-count')
      ];
      const [summary, msg, logs, pend] = await Promise.all(tasks);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayChange = logs.rows.filter((l) => new Date(l.createdAt) >= startOfDay).length;
      const sb = summary.statusBreakdown || { inUse: 0, standby: 0, idle: 0, stopped: 0 };
      const total = sb.inUse + sb.standby + sb.idle + sb.stopped;
      const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);
      this.setData({
        summary: { deviceTotal: summary.deviceTotal, partTotal: summary.partTotal },
        unreadCount: msg.count,
        todayChange,
        pendingCount: pend.count,
        status: sb,
        statusTotal: total,
        statusPct: {
          inUse: pct(sb.inUse),
          standby: pct(sb.standby),
          idle: pct(sb.idle),
          stopped: pct(sb.stopped)
        }
      });
    } catch (e) {}
  },
  goMessage() { wx.switchTab({ url: '/pages/change/index' }); },
  goChange() { wx.switchTab({ url: '/pages/change/index' }); },
  goDevice() { wx.switchTab({ url: '/pages/device/list' }); },
  goPending() { wx.switchTab({ url: '/pages/change/index' }); },
  goTransfer() { wx.navigateTo({ url: '/pages/transfer/index' }); },
  goNewDevice() { wx.navigateTo({ url: '/pages/model/device-form' }); },
  goNewPart() { wx.navigateTo({ url: '/pages/model/part-form' }); }
});
