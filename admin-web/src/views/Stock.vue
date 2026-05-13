<template>
  <div class="card-shadow">
    <el-tabs v-model="tab" @tab-change="load">
      <el-tab-pane label="设备库存" name="device" />
      <el-tab-pane label="配件库存" name="part" />
    </el-tabs>

    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
      <div>
        <el-select v-model="factoryId" placeholder="工厂" clearable style="width:180px; margin-right:8px;" @change="load">
          <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索" clearable style="width:200px" @keyup.enter="load" @clear="load" />
      </div>
      <el-button type="primary" @click="openAdjust">+ 新增/调整库存</el-button>
    </div>

    <el-table :data="rows" stripe>
      <el-table-column prop="factoryName" label="工厂" width="120" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="spec" label="规格" />
      <el-table-column prop="unit" label="单位" width="80" />
      <el-table-column prop="quantity" label="数量" width="100">
        <template #default="{ row }">
          <span style="font-weight:600; color:#1890ff;">{{ row.quantity }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button size="small" link @click="quickAdjust(row, -1)">−1</el-button>
          <el-button size="small" link @click="quickAdjust(row, 1)">+1</el-button>
          <el-button size="small" link @click="editQty(row)">改</el-button>
          <el-popconfirm title="确定删除？" @confirm="remove(row)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" title="新增/调整库存" width="480px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="工厂">
          <el-select v-model="form.factoryId" placeholder="请选择">
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tab === 'device' ? '设备型号' : '配件型号'">
          <el-select v-model="form.modelId" filterable placeholder="请选择">
            <el-option v-for="m in models" :key="m.id" :label="`${m.name} ${m.spec || ''}`" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="form.quantity" :min="0" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { stockApi, factoryApi, deviceModelApi, partModelApi } from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';

const tab = ref('device');
const factoryId = ref(null);
const keyword = ref('');
const rows = ref([]);
const factories = ref([]);
const models = ref([]);

const dlg = ref(false);
const form = reactive({ factoryId: null, modelId: null, quantity: 0, remark: '' });

async function load() {
  const params = { factoryId: factoryId.value || undefined, keyword: keyword.value || undefined };
  rows.value = tab.value === 'device' ? await stockApi.devices(params) : await stockApi.parts(params);
  models.value = tab.value === 'device' ? await deviceModelApi.list() : await partModelApi.list();
}

onMounted(async () => {
  factories.value = await factoryApi.list();
  await load();
});

function openAdjust() {
  form.factoryId = factoryId.value || factories.value[0]?.id;
  form.modelId = null;
  form.quantity = 0;
  form.remark = '';
  dlg.value = true;
}
async function save() {
  if (!form.factoryId || !form.modelId) return ElMessage.warning('请选择工厂和型号');
  const payload = {
    factoryId: form.factoryId,
    quantity: form.quantity,
    remark: form.remark
  };
  if (tab.value === 'device') {
    await stockApi.upsertDevice({ ...payload, deviceModelId: form.modelId });
  } else {
    await stockApi.upsertPart({ ...payload, partModelId: form.modelId });
  }
  ElMessage.success('已保存');
  dlg.value = false;
  load();
}
async function quickAdjust(row, delta) {
  const api = tab.value === 'device' ? stockApi.adjustDevice : stockApi.adjustPart;
  await api(row.id, { delta });
  load();
}
async function editQty(row) {
  const { value } = await ElMessageBox.prompt('新的数量', '修改数量', {
    inputType: 'number',
    inputValue: String(row.quantity)
  });
  const q = Number(value);
  if (!Number.isFinite(q) || q < 0) return ElMessage.warning('数量非法');
  if (tab.value === 'device') {
    await stockApi.upsertDevice({ factoryId: row.factoryId, deviceModelId: row.deviceModelId, quantity: q });
  } else {
    await stockApi.upsertPart({ factoryId: row.factoryId, partModelId: row.partModelId, quantity: q });
  }
  ElMessage.success('已保存');
  load();
}
async function remove(row) {
  const api = tab.value === 'device' ? stockApi.removeDevice : stockApi.removePart;
  await api(row.id);
  ElMessage.success('已删除');
  load();
}
</script>
