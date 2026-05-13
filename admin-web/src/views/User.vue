<template>
  <div class="card-shadow">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between;">
      <span style="font-weight:600">用户列表</span>
      <el-button type="primary" @click="openCreate">+ 新建用户</el-button>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="username" label="账号" width="120" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="factoryName" label="所属工厂" width="140" />
      <el-table-column label="角色" width="140">
        <template #default="{ row }">
          <el-tag :type="roleType(row.role)">{{ roleText(row.role) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="phone" label="手机" width="120" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? '正常' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button size="small" link @click="openEdit(row)">编辑</el-button>
          <el-button size="small" link @click="openReset(row)">重置密码</el-button>
          <el-popconfirm title="确定停用？" @confirm="remove(row)">
            <template #reference><el-button size="small" link type="danger">停用</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dlg" :title="editing.id ? '编辑用户' : '新建用户'" width="500px">
      <el-form :model="editing" label-width="100px">
        <el-form-item v-if="!editing.id" label="账号"><el-input v-model="editing.username" /></el-form-item>
        <el-form-item v-if="!editing.id" label="密码"><el-input v-model="editing.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="editing.name" /></el-form-item>
        <el-form-item label="手机"><el-input v-model="editing.phone" /></el-form-item>
        <el-form-item label="所属工厂">
          <el-select v-model="editing.factoryId" placeholder="请选择">
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editing.role">
            <el-option label="超级管理员" value="SUPER_ADMIN" />
            <el-option label="厂管理员" value="FACTORY_ADMIN" />
            <el-option label="员工" value="FACTORY_USER" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg=false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetDlg" title="重置密码" width="380px">
      <el-input v-model="newPwd" type="password" show-password placeholder="新密码（至少 6 位）" />
      <template #footer>
        <el-button @click="resetDlg=false">取消</el-button>
        <el-button type="primary" @click="doReset">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { userApi, factoryApi } from '../api';
import { ElMessage } from 'element-plus';

const list = ref([]);
const factories = ref([]);
const dlg = ref(false);
const editing = reactive({ id: null, username: '', password: '', name: '', phone: '', factoryId: null, role: 'FACTORY_USER' });
const resetDlg = ref(false);
const newPwd = ref('');
const resetTarget = ref(null);

const roleText = (r) => ({ SUPER_ADMIN: '超级管理员', FACTORY_ADMIN: '厂管理员', FACTORY_USER: '员工' }[r] || r);
const roleType = (r) => ({ SUPER_ADMIN: 'danger', FACTORY_ADMIN: 'warning', FACTORY_USER: '' }[r] || '');

async function load() {
  list.value = await userApi.list();
  factories.value = await factoryApi.list();
}
onMounted(load);

function openCreate() {
  Object.assign(editing, { id: null, username: '', password: '', name: '', phone: '', factoryId: factories.value[0]?.id, role: 'FACTORY_USER' });
  dlg.value = true;
}
function openEdit(row) {
  Object.assign(editing, { id: row.id, name: row.name, phone: row.phone, factoryId: row.factoryId, role: row.role });
  dlg.value = true;
}
async function save() {
  if (editing.id) {
    await userApi.update(editing.id, {
      name: editing.name, phone: editing.phone, factoryId: editing.factoryId, role: editing.role
    });
  } else {
    if (!editing.username || !editing.password) return ElMessage.warning('账号密码必填');
    await userApi.create(editing);
  }
  ElMessage.success('保存成功');
  dlg.value = false;
  load();
}
function openReset(row) {
  resetTarget.value = row;
  newPwd.value = '';
  resetDlg.value = true;
}
async function doReset() {
  if (!newPwd.value || newPwd.value.length < 6) return ElMessage.warning('至少 6 位');
  await userApi.resetPwd(resetTarget.value.id, { newPassword: newPwd.value });
  ElMessage.success('已重置');
  resetDlg.value = false;
}
async function remove(row) {
  await userApi.remove(row.id);
  ElMessage.success('已停用');
  load();
}
</script>
