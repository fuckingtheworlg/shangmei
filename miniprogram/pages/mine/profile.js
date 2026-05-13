const req = require('../../utils/request');
const auth = require('../../utils/auth');

const ROLE_TEXT = {
  SUPER_ADMIN: '超级管理员',
  FACTORY_ADMIN: '厂管理员',
  FACTORY_USER: '员工'
};

Page({
  data: {
    user: null,
    name: '',
    avatarUrl: '',
    avatarFull: '',
    roleText: '',
    saving: false
  },
  onLoad() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    const app = getApp();
    const base = app.globalData.apiBase.replace(/\/api\/?$/, '');
    this.setData({
      user,
      name: user.name,
      avatarUrl: user.avatarUrl || '',
      avatarFull: user.avatarUrl ? base + user.avatarUrl : '',
      roleText: ROLE_TEXT[user.role] || ''
    });
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.uploadAvatar(tempPath);
      }
    });
  },
  uploadAvatar(filePath) {
    const app = getApp();
    wx.showLoading({ title: '上传中', mask: true });
    wx.uploadFile({
      url: app.globalData.apiBase + '/upload/avatar',
      filePath,
      name: 'file',
      header: { Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '' },
      success: (res) => {
        wx.hideLoading();
        try {
          const body = JSON.parse(res.data);
          if (body.code === 0) {
            const base = app.globalData.apiBase.replace(/\/api\/?$/, '');
            this.setData({
              avatarUrl: body.data.url,
              avatarFull: base + body.data.url
            });
            wx.showToast({ title: '已上传，记得保存', icon: 'none' });
          } else {
            wx.showToast({ title: body.message || '上传失败', icon: 'none' });
          }
        } catch (e) {
          wx.showToast({ title: '解析失败', icon: 'none' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '上传失败', icon: 'none' });
      }
    });
  },
  async save() {
    if (!this.data.name || this.data.name.trim() === '') {
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      const updated = await req.patch('/auth/profile', {
        name: this.data.name.trim(),
        avatarUrl: this.data.avatarUrl || null
      });
      const app = getApp();
      app.globalData.user = updated;
      wx.setStorageSync('user', updated);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
    } finally {
      this.setData({ saving: false });
    }
  }
});
