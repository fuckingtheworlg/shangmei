App({
  globalData: {
    // 开发期可直接指向服务器 IP；正式上线必须改为 HTTPS + 已备案域名
    apiBase: 'http://8.137.191.28/api',
    token: '',
    user: null
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token) this.globalData.token = token;
    if (user) this.globalData.user = user;
  }
});
