const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    factories: [],
    fromIndex: 0,
    toIndex: 0,
    type: 'DEVICE',
    targets: [],
    targetIndex: 0,
    quantity: '',
    remark: '',
    loading: false
  },
  async onLoad() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    if (!user.isCenter) {
      wx.showModal({ title: '提示', content: '仅彬渭中心可使用此功能', showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    try {
      const factories = await req.get('/factory');
      this.setData({ factories });
      await this.loadTargets();
    } catch (e) {}
  },
  onFromChange(e) { this.setData({ fromIndex: Number(e.detail.value) }); },
  onToChange(e) { this.setData({ toIndex: Number(e.detail.value) }); },
  switchType(e) {
    this.setData({ type: e.currentTarget.dataset.type, targetIndex: 0 }, () => this.loadTargets());
  },
  onTargetChange(e) { this.setData({ targetIndex: Number(e.detail.value) }); },
  onQty(e) { this.setData({ quantity: e.detail.value }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  async loadTargets() {
    try {
      if (this.data.type === 'DEVICE') {
        const list = await req.get('/device-model');
        this.setData({
          targets: list.map((d) => ({ id: d.id, label: `${d.name} ${d.spec || ''}` }))
        });
      } else {
        const list = await req.get('/part-model');
        this.setData({
          targets: list.map((p) => ({ id: p.id, label: `${p.name} ${p.spec || ''}` }))
        });
      }
    } catch (e) {}
  },
  async submit() {
    const { factories, fromIndex, toIndex, type, targets, targetIndex, quantity, remark } = this.data;
    if (!factories[fromIndex] || !factories[toIndex]) {
      wx.showToast({ title: '请选择工厂', icon: 'none' }); return;
    }
    if (factories[fromIndex].id === factories[toIndex].id) {
      wx.showToast({ title: '调入调出不能相同', icon: 'none' }); return;
    }
    if (!targets[targetIndex]) {
      wx.showToast({ title: '请选择型号', icon: 'none' }); return;
    }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      wx.showToast({ title: '数量必须 > 0', icon: 'none' }); return;
    }
    this.setData({ loading: true });
    try {
      await req.post('/transfer', {
        fromFactoryId: factories[fromIndex].id,
        toFactoryId: factories[toIndex].id,
        targetType: type,
        targetId: targets[targetIndex].id,
        quantity: qty,
        remark
      });
      wx.showToast({ title: '调动成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  }
});
