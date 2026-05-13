const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: {
    devices: [{ id: null, label: '(独立配件)' }],
    devIndex: 0,
    name: '',
    spec: '',
    unit: '个',
    quantity: '',
    remark: '',
    factoryId: null,
    deviceModelIdPreset: null,
    loading: false
  },
  async onLoad(options) {
    if (!auth.ensureLogin()) return;
    const factoryId = options.factoryId ? Number(options.factoryId) : null;
    const deviceModelId = options.deviceModelId ? Number(options.deviceModelId) : null;
    this.setData({ factoryId, deviceModelIdPreset: deviceModelId });
    try {
      const list = await req.get('/device-model');
      const devices = [{ id: null, label: '(独立配件)' }].concat(
        list.map((d) => ({ id: d.id, label: `${d.name} ${d.spec || ''}` }))
      );
      let devIndex = 0;
      if (deviceModelId) {
        const i = devices.findIndex((d) => d.id === deviceModelId);
        if (i > 0) devIndex = i;
      }
      this.setData({ devices, devIndex });
    } catch (e) {}
  },
  onDevChange(e) { this.setData({ devIndex: Number(e.detail.value) }); },
  onName(e) { this.setData({ name: e.detail.value }); },
  onSpec(e) { this.setData({ spec: e.detail.value }); },
  onUnit(e) { this.setData({ unit: e.detail.value }); },
  onQty(e) { this.setData({ quantity: e.detail.value }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  async submit() {
    if (!this.data.name) {
      wx.showToast({ title: '请输入配件名称', icon: 'none' }); return;
    }
    this.setData({ loading: true });
    try {
      const dev = this.data.devices[this.data.devIndex];
      const part = await req.post('/part-model', {
        name: this.data.name,
        spec: this.data.spec || undefined,
        unit: this.data.unit || '个',
        deviceModelId: dev.id || undefined,
        remark: this.data.remark || undefined
      });

      const qty = Number(this.data.quantity);
      if (Number.isFinite(qty) && qty > 0) {
        const user = auth.getUser();
        const factoryId = this.data.factoryId || user.factoryId;
        await req.post('/stock/parts', {
          factoryId,
          partModelId: part.id,
          quantity: qty,
          remark: this.data.remark || undefined
        });
      }

      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  }
});
