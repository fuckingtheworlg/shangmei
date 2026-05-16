const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    stockId: 0, factoryId: 0, deviceModelId: 0,
    name: '', spec: '',
    inUse: 0, standby: 0, idle: 0, stopped: 0,
    total: 0, remark: '', saving: false
  },
  onLoad(opts) {
    if (!auth.ensureLogin()) return;
    const inUse = Number(opts.inUse) || 0;
    const standby = Number(opts.standby) || 0;
    const idle = Number(opts.idle) || 0;
    const stopped = Number(opts.stopped) || 0;
    this.setData({
      stockId: Number(opts.stockId),
      factoryId: Number(opts.factoryId),
      deviceModelId: Number(opts.deviceModelId),
      name: decodeURIComponent(opts.name || ''),
      spec: decodeURIComponent(opts.spec || ''),
      inUse, standby, idle, stopped,
      total: inUse + standby + idle + stopped
    });
  },
  recomputeTotal() {
    const { inUse, standby, idle, stopped } = this.data;
    this.setData({ total: (inUse || 0) + (standby || 0) + (idle || 0) + (stopped || 0) });
  },
  step(e) {
    const key = e.currentTarget.dataset.key;
    const d = Number(e.currentTarget.dataset.d);
    const v = Math.max(0, (this.data[key] || 0) + d);
    this.setData({ [key]: v }, () => this.recomputeTotal());
  },
  onInput(e) {
    const key = e.currentTarget.dataset.key;
    const v = Math.max(0, Math.floor(Number(e.detail.value) || 0));
    this.setData({ [key]: v }, () => this.recomputeTotal());
  },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  async save() {
    this.setData({ saving: true });
    try {
      await req.post('/stock/devices', {
        factoryId: this.data.factoryId,
        deviceModelId: this.data.deviceModelId,
        qtyInUse: this.data.inUse,
        qtyStandby: this.data.standby,
        qtyIdle: this.data.idle,
        qtyStopped: this.data.stopped,
        remark: this.data.remark || undefined
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (e) {
    } finally {
      this.setData({ saving: false });
    }
  }
});
