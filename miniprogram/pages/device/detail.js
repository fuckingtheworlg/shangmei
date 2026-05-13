const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    deviceModelId: 0,
    factoryId: 0,
    deviceName: '',
    factoryName: '',
    parts: [],
    isWriter: false
  },
  onLoad(options) {
    this.setData({
      deviceModelId: Number(options.deviceModelId),
      factoryId: Number(options.factoryId)
    });
    const user = auth.getUser();
    this.setData({ isWriter: user.role === 'SUPER_ADMIN' || user.role === 'FACTORY_ADMIN' });
  },
  onShow() {
    this.load();
  },
  async load() {
    try {
      const [dev, parts] = await Promise.all([
        req.get('/device-model').then((rows) => rows.find((r) => r.id === this.data.deviceModelId)),
        req.get('/stock/parts', {
          factoryId: this.data.factoryId,
          deviceModelId: this.data.deviceModelId
        })
      ]);
      this.setData({
        deviceName: dev ? `${dev.name} ${dev.spec || ''}` : '',
        parts,
        factoryName: parts[0] ? parts[0].factoryName : ''
      });
    } catch (e) {}
  },
  async adjust(e) {
    const id = e.currentTarget.dataset.id;
    const delta = Number(e.currentTarget.dataset.delta);
    try {
      await req.patch(`/stock/parts/${id}/adjust`, { delta });
      wx.showToast({ title: '已更新', icon: 'success' });
      this.load();
    } catch (e) {}
  },
  addPart() {
    wx.navigateTo({
      url: `/pages/model/part-form?factoryId=${this.data.factoryId}&deviceModelId=${this.data.deviceModelId}`
    });
  }
});
