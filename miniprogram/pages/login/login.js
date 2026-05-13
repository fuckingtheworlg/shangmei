const req = require('../../utils/request');

Page({
  data: { username: 'admin', password: 'admin123', loading: false },
  onUser(e) { this.setData({ username: e.detail.value }); },
  onPwd(e) { this.setData({ password: e.detail.value }); },
  async submit() {
    const { username, password } = this.data;
    if (!username || !password) {
      wx.showToast({ title: '请输入账号密码', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    try {
      const res = await req.post('/auth/login', { username, password });
      const app = getApp();
      app.globalData.token = res.token;
      app.globalData.user = res.user;
      wx.setStorageSync('token', res.token);
      wx.setStorageSync('user', res.user);
      wx.reLaunch({ url: '/pages/index/index' });
    } catch (e) {
      // toast 已在 request 中弹
    } finally {
      this.setData({ loading: false });
    }
  }
});
