const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    isCenter: false,
    factories: [],          // 全部工厂，给「调入」选
    fromFactories: [],      // 给「调出」选：中心可全选，分厂只本厂
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
    this.setData({ isCenter: user.isCenter });
    try {
      const factories = await req.get('/factory');
      const fromFactories = user.isCenter
        ? factories.filter((f) => !f.isCenter)
        : factories.filter((f) => f.id === user.factoryId);
      const toFactories = factories.filter((f) => !f.isCenter);
      this.setData({ factories: toFactories, fromFactories });
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
      const list = this.data.type === 'DEVICE'
        ? await req.get('/device-model')
        : await req.get('/part-model');
      this.setData({
        targets: list.map((d) => ({
          id: d.id,
          label: `${d.name} ${d.spec || ''}${d.category ? ' [' + d.category.name + ']' : ''}`
        }))
      });
    } catch (e) {}
  },
  async submit() {
    const { fromFactories, factories, fromIndex, toIndex, type, targets, targetIndex, quantity, remark } = this.data;
    if (!fromFactories[fromIndex]) { wx.showToast({ title: '请选择调出工厂', icon: 'none' }); return; }
    if (!factories[toIndex]) { wx.showToast({ title: '请选择调入工厂', icon: 'none' }); return; }
    if (fromFactories[fromIndex].id === factories[toIndex].id) {
      wx.showToast({ title: '调入调出不能相同', icon: 'none' }); return;
    }
    if (!targets[targetIndex]) { wx.showToast({ title: '请选择型号', icon: 'none' }); return; }
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) { wx.showToast({ title: '数量必须 > 0', icon: 'none' }); return; }
    this.setData({ loading: true });
    try {
      await req.post('/transfer-request', {
        fromFactoryId: fromFactories[fromIndex].id,
        toFactoryId: factories[toIndex].id,
        targetType: type,
        targetId: targets[targetIndex].id,
        quantity: qty,
        applicantRemark: remark || undefined
      });
      wx.showToast({ title: '已提交，等待审批', icon: 'success' });
      setTimeout(() => wx.redirectTo({ url: '/pages/transfer/list' }), 800);
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  },
  goList() { wx.navigateTo({ url: '/pages/transfer/list' }); }
});
