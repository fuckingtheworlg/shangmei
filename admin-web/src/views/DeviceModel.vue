<template>
  <div class="card-shadow">
    <div style="margin-bottom:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; gap:8px;">
        <el-input v-model="keyword" placeholder="搜索名称/规格" clearable style="width:240px" @keyup.enter="load" @clear="load" />
        <el-select v-model="categoryId" placeholder="按分类筛选" clearable style="width:200px" @change="load">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </div>
      <div>
        <el-button @click="catDlg = true">分类管理</el-button>
        <el-button type="primary" @click="openCreate">+ 新建设备型号</el-button>
      </div>
    </div>
    <el-table :data="list" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="分类" width="120">
        <template #default="{ row }">
          <el-tag v-if="row.category" size="small">{{ row.category.name }}</el-tag>
          <span v-else style="color:#bbb">—</span>
        </template>
      </el-table-column>
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

    <!-- 型号编辑 -->
    <el-dialog v-model="dlg" :title="editing.id ? '编辑设备型号' : '新建设备型号'" width="480px">
      <el-form :model="editing" label-width="80px">
        <el-form-item label="分类">
          <el-select v-model="editing.categoryId" clearable placeholder="选择大分类">
            <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
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

    <!-- 分类管理 -->
    <el-dialog v-model="catDlg" title="设备分类管理" width="640px">
      <div style="display:flex; justify-content:flex-end; margin-bottom:8px;">
        <el-button type="primary" size="small" @click="openNewCat">+ 新建分类</el-button>
      </div>
      <el-table :data="categories" size="small" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="型号数" width="80">
          <template #default="{ row }">{{ row._count?.models || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button size="small" link @click="editCat(row)">编辑</el-button>
            <el-popconfirm title="确定删除？" @confirm="rmCat(row)">
              <template #reference><el-button size="small" link type="danger">删除</el-button></template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="catEditDlg" :title="cat.id ? '编辑分类' : '新建分类'" width="360px">
      <el-form :model="cat" label-width="60px">
        <el-form-item label="名称"><el-input v-model="cat.name" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="cat.sortOrder" :min="0" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="cat.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catEditDlg=false">取消</el-button>
        <el-button type="primary" @click="saveCat">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { deviceModelApi, categoryApi } from '../api';
import { ElMessage } from 'element-plus';

const list = ref([]);
const categories = ref([]);
const keyword = ref('');
const categoryId = ref(null);
const dlg = ref(false);
const editing = reactive({ id: null, name: '', spec: '', unit: '台', categoryId: null, remark: '' });
const catDlg = ref(false);
const catEditDlg = ref(false);
const cat = reactive({ id: null, name: '', sortOrder: 0, remark: '' });

async function load() {
  list.value = await deviceModelApi.list({
    keyword: keyword.value || undefined,
    categoryId: categoryId.value || undefined
  });
}
async function loadCats() { categories.value = await categoryApi.list(); }
onMounted(async () => { await loadCats(); await load(); });

function openCreate() {
  Object.assign(editing, { id: null, name: '', spec: '', unit: '台', categoryId: categoryId.value, remark: '' });
  dlg.value = true;
}
function openEdit(row) {
  Object.assign(editing, {
    id: row.id, name: row.name, spec: row.spec, unit: row.unit,
    categoryId: row.categoryId, remark: row.remark
  });
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

function openNewCat() {
  Object.assign(cat, { id: null, name: '', sortOrder: 0, remark: '' });
  catEditDlg.value = true;
}
function editCat(row) {
  Object.assign(cat, { id: row.id, name: row.name, sortOrder: row.sortOrder, remark: row.remark });
  catEditDlg.value = true;
}
async function saveCat() {
  if (!cat.name) return ElMessage.warning('请输入名称');
  if (cat.id) await categoryApi.update(cat.id, cat);
  else await categoryApi.create(cat);
  ElMessage.success('已保存');
  catEditDlg.value = false;
  loadCats();
}
async function rmCat(row) {
  await categoryApi.remove(row.id);
  ElMessage.success('已删除');
  loadCats();
}
</script>
