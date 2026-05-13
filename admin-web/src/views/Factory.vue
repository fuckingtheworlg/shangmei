<template>
  <div class="card-shadow">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between;">
      <span style="font-weight:600">工厂列表</span>
      <el-button type="primary" @click="openCreate">+ 新建工厂</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="name" label="名称" />
      <el-table-column prop="code" label="编码" width="120" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.isCenter" type="warning">彬渭中心</el-tag>
          <el-tag v-else>分厂</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="remove(row)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" :title="editing.id ? '编辑工厂' : '新建工厂'" width="480px">
      <el-form :model="editing" label-width="80px">
        <el-form-item label="名称"><el-input v-model="editing.name" /></el-form-item>
        <el-form-item label="编码"><el-input v-model="editing.code" /></el-form-item>
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
import { factoryApi } from '../api';
import { ElMessage } from 'element-plus';

const list = ref([]);
const dlg = ref(false);
const editing = reactive({ id: null, name: '', code: '', remark: '' });

async function load() { list.value = await factoryApi.list(); }
onMounted(load);

function openCreate() {
  Object.assign(editing, { id: null, name: '', code: '', remark: '' });
  dlg.value = true;
}
function openEdit(row) {
  Object.assign(editing, { id: row.id, name: row.name, code: row.code, remark: row.remark });
  dlg.value = true;
}
async function save() {
  if (!editing.name) return ElMessage.warning('请输入名称');
  if (editing.id) await factoryApi.update(editing.id, { name: editing.name, code: editing.code, remark: editing.remark });
  else await factoryApi.create({ name: editing.name, code: editing.code, remark: editing.remark });
  ElMessage.success('保存成功');
  dlg.value = false;
  load();
}
async function remove(row) {
  await factoryApi.remove(row.id);
  ElMessage.success('已删除');
  load();
}
</script>
