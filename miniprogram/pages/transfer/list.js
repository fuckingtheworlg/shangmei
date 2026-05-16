const req = require('../../utils/request');
const auth = require('../../utils/auth');

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
    currentTab: 'PENDING',
    tabs: [
      { key: 'PENDING', label: '待审批' },
      { key: 'COMPLETED', label: '已完成' },
      { key: 'REJECTED', label: '已拒绝' },
      { key: '', label: '全部' }
    ],
    list: [],
    statusText: STATUS_TEXT,
    isCenter: false,
    currentUserId: 0,
    formatTime
  },
  onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({ isCenter: user.isCenter, currentUserId: user.id });
    this.load();
  },
  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },
  switchTab(e) {
    this.setData({ currentTab: e.currentTarget.dataset.tab }, () => this.load());
  },
  async load() {
    try {
      const params = { pageSize: 50 };
      if (this.data.currentTab) params.status = this.data.currentTab;
      const res = await req.get('/transfer-request', params);
      this.setData({ list: res.rows });
    } catch (e) {}
  },
  approve(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '通过申请',
      editable: true,
      placeholderText: '审批意见（可选）',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await req.post(`/transfer-request/${id}/approve`, { reviewRemark: res.content || undefined });
          wx.showToast({ title: '已通过', icon: 'success' });
          this.load();
        } catch (e) {}
      }
    });
  },
  reject(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '拒绝申请',
      editable: true,
      placeholderText: '请填写拒绝原因（必填）',
      success: async (res) => {
        if (!res.confirm) return;
        if (!res.content) { wx.showToast({ title: '拒绝原因必填', icon: 'none' }); return; }
        try {
          await req.post(`/transfer-request/${id}/reject`, { reviewRemark: res.content });
          wx.showToast({ title: '已拒绝', icon: 'success' });
          this.load();
        } catch (e) {}
      }
    });
  },
  cancel(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '提示',
      content: '确定取消此申请？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await req.post(`/transfer-request/${id}/cancel`, {});
          wx.showToast({ title: '已取消', icon: 'success' });
          this.load();
        } catch (e) {}
      }
    });
  }
});
