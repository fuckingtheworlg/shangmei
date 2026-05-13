const app = getApp();

// wx.request 不会自动剔除 undefined/null/'' 字段，会把它们序列化成 ?foo=undefined
// 导致后端拿到字符串 "undefined" 当成有效值过滤，必须在发请求前清掉
function cleanParams(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const out = {};
  Object.keys(data).forEach((k) => {
    const v = data[k];
    if (v === undefined || v === null) return;
    if (typeof v === 'string' && v === '') return;
    out[k] = v;
  });
  return out;
}

function request(method, url, data = {}, options = {}) {
  return new Promise((resolve, reject) => {
    const isExport = !!options.responseType;
    wx.request({
      url: app.globalData.apiBase + url,
      method,
      data: cleanParams(data),
      header: {
        'content-type': 'application/json',
        Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : ''
      },
      responseType: options.responseType,
      success(res) {
        if (isExport) {
          resolve(res.data);
          return;
        }
        if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.removeStorageSync('user');
          app.globalData.token = '';
          app.globalData.user = null;
          wx.reLaunch({ url: '/pages/login/login' });
          reject(new Error('未登录'));
          return;
        }
        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = (res.data && res.data.message) || `请求失败(${res.statusCode})`;
          wx.showToast({ title: msg, icon: 'none' });
          reject(new Error(msg));
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = {
  get: (url, data, options) => request('GET', url, data, options),
  post: (url, data, options) => request('POST', url, data, options),
  patch: (url, data, options) => request('PATCH', url, data, options),
  del: (url, data, options) => request('DELETE', url, data, options)
};
