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
    categories: [],
    currentCategory: null,
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
    if (this.data.categories.length === 0) {
      try {
        const cats = await req.get('/category');
        this.setData({ categories: cats });
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
  selectCategory(e) {
    const v = e.currentTarget.dataset.id;
    this.setData({ currentCategory: v ? Number(v) : null }, () => this.loadList());
  },
  async loadList() {
    const params = { keyword: this.data.keyword || undefined };
    if (this.data.isCenter && this.data.currentFactory && this.data.currentFactory.id) {
      params.factoryId = this.data.currentFactory.id;
    }
    if (this.data.currentCategory) params.categoryId = this.data.currentCategory;
    try {
      const list = await req.get('/stock/devices', params);
      this.setData({ list });
    } catch (e) {}
  },
  editStock(e) {
    const item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: `/pages/device/edit?stockId=${item.id}&inUse=${item.qtyInUse}&standby=${item.qtyStandby}&idle=${item.qtyIdle}&stopped=${item.qtyStopped}&factoryId=${item.factoryId}&deviceModelId=${item.deviceModelId}&name=${encodeURIComponent(item.name)}&spec=${encodeURIComponent(item.spec || '')}`
    });
  },
  goDetail(e) {
    const { id, factoryid } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/device/detail?deviceModelId=${id}&factoryId=${factoryid}` });
  },
  goAddStock() {
    wx.navigateTo({ url: '/pages/model/part-form' });
  },
  noop() {}
});
