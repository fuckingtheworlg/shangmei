<template>
  <div class="card-shadow" style="max-width:600px;">
    <div style="font-weight:600; margin-bottom:16px;">跨厂调动</div>
    <el-form :model="form" label-width="100px">
      <el-form-item label="调出工厂">
        <el-select v-model="form.fromFactoryId" placeholder="请选择" style="width:100%">
          <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="调入工厂">
        <el-select v-model="form.toFactoryId" placeholder="请选择" style="width:100%">
          <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="类型">
        <el-radio-group v-model="form.targetType" @change="loadTargets">
          <el-radio-button :value="'DEVICE'">设备</el-radio-button>
          <el-radio-button :value="'PART'">配件</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="型号">
        <el-select v-model="form.targetId" filterable placeholder="请选择" style="width:100%">
          <el-option v-for="t in targets" :key="t.id" :label="`${t.name} ${t.spec || ''}`" :value="t.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="数量"><el-input-number v-model="form.quantity" :min="1" /></el-form-item>
      <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submit" :loading="loading">确认调动</el-button>
      </el-form-item>
    </el-form>

    <div style="font-weight:600; margin:24px 0 12px;">最近调动</div>
    <el-table :data="recent" size="small" stripe>
      <el-table-column label="时间" width="140">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="fromFactoryName" label="调出" width="120" />
      <el-table-column prop="toFactoryName" label="调入" width="120" />
      <el-table-column prop="targetName" label="对象" min-width="140" />
      <el-table-column prop="quantity" label="数量" width="80" />
      <el-table-column prop="operatorName" label="操作人" width="100" />
    </el-table>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { factoryApi, deviceModelApi, partModelApi, transferApi, messageApi } from '../api';
import { ElMessage } from 'element-plus';

const factories = ref([]);
const targets = ref([]);
const recent = ref([]);
const loading = ref(false);

const form = reactive({
  fromFactoryId: null,
  toFactoryId: null,
  targetType: 'DEVICE',
  targetId: null,
  quantity: 1,
  remark: ''
});

function formatTime(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadTargets() {
  form.targetId = null;
  targets.value = form.targetType === 'DEVICE' ? await deviceModelApi.list() : await partModelApi.list();
}
async function loadRecent() {
  const res = await messageApi.list({ pageSize: 20 });
  recent.value = res.rows;
}
onMounted(async () => {
  factories.value = await factoryApi.list();
  await loadTargets();
  await loadRecent();
});
async function submit() {
  if (!form.fromFactoryId || !form.toFactoryId) return ElMessage.warning('请选择调出调入工厂');
  if (form.fromFactoryId === form.toFactoryId) return ElMessage.warning('调入调出不能相同');
  if (!form.targetId) return ElMessage.warning('请选择型号');
  if (form.quantity <= 0) return ElMessage.warning('数量必须大于 0');
  loading.value = true;
  try {
    await transferApi.transfer({ ...form });
    ElMessage.success('调动成功');
    form.quantity = 1; form.remark = '';
    loadRecent();
  } finally {
    loading.value = false;
  }
}
</script>
