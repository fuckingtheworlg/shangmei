const auth = require('../../utils/auth');

const ROLE_TEXT = {
  SUPER_ADMIN: '超级管理员',
  FACTORY_ADMIN: '厂管理员',
  FACTORY_USER: '员工'
};

Page({
  data: { user: null, roleText: '', isCenter: false, isWriter: false },
  onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({
      user,
      roleText: ROLE_TEXT[user.role] || '',
      isCenter: user.isCenter,
      isWriter: user.role === 'SUPER_ADMIN' || user.role === 'FACTORY_ADMIN'
    });
  },
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
