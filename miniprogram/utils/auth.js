function getUser() {
  const app = getApp();
  return app.globalData.user || wx.getStorageSync('user') || null;
}

function isCenter() {
  const u = getUser();
  return !!(u && u.isCenter);
}

function isWriter() {
  const u = getUser();
  return !!u && (u.role === 'SUPER_ADMIN' || u.role === 'FACTORY_ADMIN');
}

function ensureLogin() {
  const app = getApp();
  if (!app.globalData.token) {
    wx.reLaunch({ url: '/pages/login/login' });
    return false;
  }
  return true;
}

function logout() {
  const app = getApp();
  app.globalData.token = '';
  app.globalData.user = null;
  wx.removeStorageSync('token');
  wx.removeStorageSync('user');
  wx.reLaunch({ url: '/pages/login/login' });
}

module.exports = { getUser, isCenter, isWriter, ensureLogin, logout };
