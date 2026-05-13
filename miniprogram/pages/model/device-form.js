const req = require('../../utils/request');
const auth = require('../../utils/auth');

Page({
  data: { name: '', spec: '', unit: '台', remark: '', loading: false },
  onLoad() {
    if (!auth.ensureLogin()) return;
    const user = auth.getUser();
    if (!user.isCenter) {
      wx.showModal({
        title: '提示',
        content: '仅彬渭中心可新建设备型号',
        showCancel: false,
        success: () => wx.navigateBack()
      });
    }
  },
  onName(e) { this.setData({ name: e.detail.value }); },
  onSpec(e) { this.setData({ spec: e.detail.value }); },
  onUnit(e) { this.setData({ unit: e.detail.value }); },
  onRemark(e) { this.setData({ remark: e.detail.value }); },
  async submit() {
    if (!this.data.name) {
      wx.showToast({ title: '请输入设备名称', icon: 'none' }); return;
    }
    this.setData({ loading: true });
    try {
      await req.post('/device-model', {
        name: this.data.name,
        spec: this.data.spec || undefined,
        unit: this.data.unit || '台',
        remark: this.data.remark || undefined
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
    } finally {
      this.setData({ loading: false });
    }
  }
});
