<template>
  <div class="card-shadow">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between;">
      <el-input v-model="keyword" placeholder="搜索名称/规格" clearable style="width:240px" @keyup.enter="load" @clear="load" />
      <el-button type="primary" @click="openCreate">+ 新建设备型号</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="spec" label="规格" />
      <el-table-column prop="unit" label="单位" width="80" />
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

    <el-dialog v-model="dlg" :title="editing.id ? '编辑设备型号' : '新建设备型号'" width="480px">
      <el-form :model="editing" label-width="80px">
        <el-form-item label="名称"><el-input v-model="editing.name" /></el-form-item>
        <el-form-item label="规格"><el-input v-model="editing.spec" /></el-form-item>
        <el-form-item label="单位"><el-input v-model="editing.unit" /></el-form-item>
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
import { deviceModelApi } from '../api';
import { ElMessage } from 'element-plus';

const list = ref([]);
const keyword = ref('');
const dlg = ref(false);
const editing = reactive({ id: null, name: '', spec: '', unit: '台', remark: '' });

async function load() { list.value = await deviceModelApi.list({ keyword: keyword.value || undefined }); }
onMounted(load);

function openCreate() {
  Object.assign(editing, { id: null, name: '', spec: '', unit: '台', remark: '' });
  dlg.value = true;
}
function openEdit(row) {
  Object.assign(editing, { id: row.id, name: row.name, spec: row.spec, unit: row.unit, remark: row.remark });
  dlg.value = true;
}
async function save() {
  if (!editing.name) return ElMessage.warning('请输入名称');
  if (editing.id) await deviceModelApi.update(editing.id, editing);
  else await deviceModelApi.create(editing);
  ElMessage.success('保存成功');
  dlg.value = false;
  load();
}
async function remove(row) {
  await deviceModelApi.remove(row.id);
  ElMessage.success('已删除');
  load();
}
</script>
