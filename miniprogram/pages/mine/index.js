const req = require('../../utils/request');
const auth = require('../../utils/auth');

const ROLE_TEXT = {
  SUPER_ADMIN: '超级管理员',
  FACTORY_ADMIN: '厂管理员',
  FACTORY_USER: '员工'
};

Page({
  data: { user: null, roleText: '', isCenter: false, isWriter: false, avatarFull: '' },
  async onShow() {
    if (!auth.ensureLogin()) return;
    let user = auth.getUser();
    // 拉一次最新 me，确保头像/姓名是最新的（onShow 每次进 tab 都跑）
    try {
      const fresh = await req.get('/auth/me');
      const app = getApp();
      app.globalData.user = fresh;
      wx.setStorageSync('user', fresh);
      user = fresh;
    } catch (e) {}
    const app = getApp();
    const base = app.globalData.apiBase.replace(/\/api\/?$/, '');
    this.setData({
      user,
      roleText: ROLE_TEXT[user.role] || '',
      isCenter: user.isCenter,
      isWriter: user.role === 'SUPER_ADMIN' || user.role === 'FACTORY_ADMIN',
      avatarFull: user.avatarUrl ? base + user.avatarUrl : ''
    });
  },
  goProfile() { wx.navigateTo({ url: '/pages/mine/profile' }); },
  goTransfer() { wx.navigateTo({ url: '/pages/transfer/index' }); },
  goNewDevice() { wx.navigateTo({ url: '/pages/model/device-form' }); },
  goNewPart() { wx.navigateTo({ url: '/pages/model/part-form' }); },
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录？',
      success(res) { if (res.confirm) auth.logout(); }
    });
  }
});
