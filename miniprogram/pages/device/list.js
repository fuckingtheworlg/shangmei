const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    isCenter: false,
    isWriter: false,
    factories: [],
    factoryIndex: 0,
    currentFactory: null,
    keyword: '',
    list: []
  },
  async onShow() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    this.setData({
      user,
      isCenter: user.isCenter,
      isWriter: user.role === 'SUPER_ADMIN' || user.role === 'FACTORY_ADMIN'
    });
    if (user.isCenter && this.data.factories.length === 0) {
      try {
        const factories = await req.get('/factory');
        const list = [{ id: 0, name: '全部' }].concat(factories);
        this.setData({ factories: list, factoryIndex: 0, currentFactory: list[0] });
      } catch (e) {}
    }
    this.loadList();
  },
  onPullDownRefresh() {
    this.loadList().finally(() => wx.stopPullDownRefresh());
  },
  onKeyword(e) { this.setData({ keyword: e.detail.value }); },
  onFactoryChange(e) {
    const idx = Number(e.detail.value);
    const fac = this.data.factories[idx];
    this.setData({ factoryIndex: idx, currentFactory: fac }, () => this.loadList());
  },
  async loadList() {
    const params = { keyword: this.data.keyword || undefined };
    if (this.data.isCenter && this.data.currentFactory && this.data.currentFactory.id) {
      params.factoryId = this.data.currentFactory.id;
    }
    try {
      const list = await req.get('/stock/devices', params);
      this.setData({ list });
    } catch (e) {}
  },
  async adjust(e) {
    const id = e.currentTarget.dataset.id;
    const delta = Number(e.currentTarget.dataset.delta);
    try {
      await req.patch(`/stock/devices/${id}/adjust`, { delta });
      wx.showToast({ title: '已更新', icon: 'success' });
      this.loadList();
    } catch (e) {}
  },
  editStock(e) {
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '修改数量',
      editable: true,
      placeholderText: String(item.quantity),
      success: async (res) => {
        if (!res.confirm) return;
        const v = Number(res.content);
        if (!Number.isFinite(v) || v < 0) {
          wx.showToast({ title: '请输入合法数量', icon: 'none' });
          return;
        }
        try {
          await req.post('/stock/devices', {
            factoryId: item.factoryId,
            deviceModelId: item.deviceModelId,
            quantity: v
          });
          wx.showToast({ title: '已保存', icon: 'success' });
          this.loadList();
        } catch (e) {}
      }
    });
  },
  goDetail(e) {
    const { id, factoryid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/device/detail?deviceModelId=${id}&factoryId=${factoryid}` });
  },
  goAddStock() {
    wx.navigateTo({ url: '/pages/model/part-form?mode=stock' });
  },
  noop() {}
});
