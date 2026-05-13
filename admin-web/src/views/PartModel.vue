<template>
  <div class="card-shadow">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between;">
      <div>
        <el-input v-model="keyword" placeholder="搜索名称/规格" clearable style="width:200px;margin-right:8px;" @keyup.enter="load" @clear="load" />
        <el-select v-model="deviceFilter" placeholder="所属设备" clearable style="width:200px;" @change="load">
          <el-option v-for="d in devices" :key="d.id" :label="`${d.name} ${d.spec || ''}`" :value="d.id" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">+ 新建配件型号</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="spec" label="规格" />
      <el-table-column prop="unit" label="单位" width="80" />
      <el-table-column label="所属设备" width="180">
        <template #default="{ row }">{{ row.deviceModel?.name || '（独立）' }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="remove(row)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" :title="editing.id ? '编辑配件型号' : '新建配件型号'" width="480px">
      <el-form :model="editing" label-width="100px">
        <el-form-item label="名称"><el-input v-model="editing.name" /></el-form-item>
        <el-form-item label="规格"><el-input v-model="editing.spec" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="editing.unit" /></el-form-item>
        <el-form-item label="所属设备">
          <el-select v-model="editing.deviceModelId" clearable placeholder="（独立配件）">
            <el-option v-for="d in devices" :key="d.id" :label="`${d.name} ${d.spec || ''}`" :value="d.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="editing.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { partModelApi, deviceModelApi } from '../api';
import { ElMessage } from 'element-plus';

const list = ref([]);
const devices = ref([]);
const keyword = ref('');
const deviceFilter = ref(null);
const dlg = ref(false);
const editing = reactive({ id: null, name: '', spec: '', unit: '个', deviceModelId: null, remark: '' });

async function load() {
  list.value = await partModelApi.list({
    keyword: keyword.value || undefined,
    deviceModelId: deviceFilter.value || undefined
  });
}
onMounted(async () => {
  devices.value = await deviceModelApi.list();
  await load();
});
function openCreate() {
  Object.assign(editing, { id: null, name: '', spec: '', unit: '个', deviceModelId: null, remark: '' });
  dlg.value = true;
}
function openEdit(row) {
  Object.assign(editing, {
    id: row.id, name: row.name, spec: row.spec, unit: row.unit,
    deviceModelId: row.deviceModelId, remark: row.remark
  });
  dlg.value = true;
}
async function save() {
  if (!editing.name) return ElMessage.warning('请输入名称');
  if (editing.id) await partModelApi.update(editing.id, editing);
  else await partModelApi.create(editing);
  ElMessage.success('保存成功');
  dlg.value = false;
  load();
}
async function remove(row) {
  await partModelApi.remove(row.id);
  ElMessage.success('已删除');
  load();
}
</script>
