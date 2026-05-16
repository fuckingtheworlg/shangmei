<template>
  <div>
    <el-tabs v-model="tab">
      <el-tab-pane label="提交调动申请" name="new" />
      <el-tab-pane :label="`待审批 (${pendingCount})`" name="pending" v-if="store.isSuper" />
      <el-tab-pane label="申请列表" name="list" />
      <el-tab-pane label="免审直接调拨（中心）" name="direct" v-if="store.isSuper" />
    </el-tabs>

    <!-- 提交申请 -->
    <div v-if="tab === 'new'" class="card-shadow" style="max-width:640px;">
      <div style="font-weight:600; margin-bottom:16px;">提交跨厂调动申请</div>
      <el-form :model="form" label-width="100px">
        <el-form-item label="调出工厂">
          <el-select v-model="form.fromFactoryId" placeholder="请选择" style="width:100%" :disabled="!store.isSuper" filterable>
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="调入工厂">
          <el-select v-model="form.toFactoryId" placeholder="请选择" style="width:100%" filterable>
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
          <el-select v-model="form.targetId" filterable placeholder="请选择，可搜索" style="width:100%">
            <el-option v-for="t in targets" :key="t.id" :label="`${t.name} ${t.spec || ''}`" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量"><el-input-number v-model="form.quantity" :min="1" /></el-form-item>
        <el-form-item label="申请说明"><el-input v-model="form.applicantRemark" type="textarea" :rows="2" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitRequest" :loading="loading">提交申请</el-button>
          <span class="muted" style="margin-left:12px;">提交后由彬渭中心审批，通过后自动调拨</span>
        </el-form-item>
      </el-form>
    </div>

    <!-- 待审批 -->
    <div v-else-if="tab === 'pending'" class="card-shadow">
      <el-table :data="pending" v-loading="loading" stripe>
        <el-table-column prop="createdAt" label="申请时间" width="160">
          <template #default="{ row }">{{ time(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="applicantName" label="申请人" width="120" />
        <el-table-column prop="fromFactoryName" label="调出" width="120" />
        <el-table-column prop="toFactoryName" label="调入" width="120" />
        <el-table-column label="对象" min-width="160">
          <template #default="{ row }">
            <el-tag size="small" :type="row.targetType === 'DEVICE' ? '' : 'success'">
              {{ row.targetType === 'DEVICE' ? '设备' : '配件' }}
            </el-tag>
            {{ row.targetName }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column prop="applicantRemark" label="申请说明" />
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="success" @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" @click="reject(row)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 申请列表（含历史） -->
    <div v-else-if="tab === 'list'" class="card-shadow">
      <div style="margin-bottom:12px;">
        <el-select v-model="listFilter.status" placeholder="状态" clearable style="width:160px" @change="loadList">
          <el-option v-for="(t, k) in STATUS_TEXT" :key="k" :label="t" :value="k" />
        </el-select>
      </div>
      <el-table :data="reqList" v-loading="loading" stripe>
        <el-table-column prop="createdAt" label="申请时间" width="160">
          <template #default="{ row }">{{ time(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="applicantName" label="申请人" width="100" />
        <el-table-column prop="fromFactoryName" label="调出" width="100" />
        <el-table-column prop="toFactoryName" label="调入" width="100" />
        <el-table-column label="对象" min-width="180">
          <template #default="{ row }">
            {{ row.targetType === 'DEVICE' ? '设备' : '配件' }} · {{ row.targetName }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="70" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status]">{{ STATUS_TEXT[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批人" width="100">
          <template #default="{ row }">{{ row.reviewerName || '—' }}</template>
        </el-table-column>
        <el-table-column prop="reviewRemark" label="审批意见" />
      </el-table>
    </div>

    <!-- 免审直接调拨 -->
    <div v-else class="card-shadow" style="max-width:640px;">
      <div style="font-weight:600; margin-bottom:16px;">免审直接调拨（中心专用）</div>
      <el-alert type="warning" :closable="false" style="margin-bottom:16px;"
        title="此通道不走审批，请确认无误后再操作" />
      <el-form :model="direct" label-width="100px">
        <el-form-item label="调出工厂">
          <el-select v-model="direct.fromFactoryId" filterable style="width:100%">
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="调入工厂">
          <el-select v-model="direct.toFactoryId" filterable style="width:100%">
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="direct.targetType" @change="loadDirectTargets">
            <el-radio-button :value="'DEVICE'">设备</el-radio-button>
            <el-radio-button :value="'PART'">配件</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="型号">
          <el-select v-model="direct.targetId" filterable placeholder="请选择" style="width:100%">
            <el-option v-for="t in directTargets" :key="t.id" :label="`${t.name} ${t.spec || ''}`" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量"><el-input-number v-model="direct.quantity" :min="1" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="direct.remark" /></el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitDirect" :loading="loading">确认调拨</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import { factoryApi, deviceModelApi, partModelApi, transferApi, transferRequestApi } from '../api';
import { useUserStore } from '../stores/user';
import { ElMessage, ElMessageBox } from 'element-plus';

const STATUS_TEXT = {
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  COMPLETED: '已完成',
  CANCELLED: '已取消'
};
const STATUS_TYPE = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  COMPLETED: 'success',
  CANCELLED: 'info'
};

const store = useUserStore();
const tab = ref('new');
const factories = ref([]);
const targets = ref([]);
const directTargets = ref([]);
const loading = ref(false);
const pendingCount = ref(0);
const pending = ref([]);
const reqList = ref([]);
const listFilter = reactive({ status: undefined });

const form = reactive({
  fromFactoryId: null, toFactoryId: null,
  targetType: 'DEVICE', targetId: null,
  quantity: 1, applicantRemark: ''
});
const direct = reactive({
  fromFactoryId: null, toFactoryId: null,
  targetType: 'DEVICE', targetId: null,
  quantity: 1, remark: ''
});

function time(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function loadTargets() {
  form.targetId = null;
  targets.value = form.targetType === 'DEVICE' ? await deviceModelApi.list() : await partModelApi.list();
}
async function loadDirectTargets() {
  direct.targetId = null;
  directTargets.value = direct.targetType === 'DEVICE' ? await deviceModelApi.list() : await partModelApi.list();
}
async function loadPending() {
  const res = await transferRequestApi.list({ status: 'PENDING', pageSize: 50 });
  pending.value = res.rows;
  pendingCount.value = res.total;
}
async function loadList() {
  const res = await transferRequestApi.list({ status: listFilter.status, pageSize: 50 });
  reqList.value = res.rows;
}
async function refreshPendingBadge() {
  if (!store.isSuper) return;
  const r = await transferRequestApi.pendingCount();
  pendingCount.value = r.count;
}

onMounted(async () => {
  factories.value = await factoryApi.list();
  // 分厂账号：调出工厂锁定本厂
  if (!store.isSuper) form.fromFactoryId = store.user.factoryId;
  await loadTargets();
  await loadDirectTargets();
  await refreshPendingBadge();
});

watch(tab, async (v) => {
  if (v === 'pending') loadPending();
  if (v === 'list') loadList();
});

async function submitRequest() {
  if (!form.fromFactoryId || !form.toFactoryId) return ElMessage.warning('请选择调出/调入工厂');
  if (form.fromFactoryId === form.toFactoryId) return ElMessage.warning('调入调出不能相同');
  if (!form.targetId) return ElMessage.warning('请选择型号');
  if (form.quantity <= 0) return ElMessage.warning('数量必须大于 0');
  loading.value = true;
  try {
    await transferRequestApi.create({ ...form });
    ElMessage.success('已提交，等待中心审批');
    form.quantity = 1; form.applicantRemark = '';
    refreshPendingBadge();
  } finally { loading.value = false; }
}

async function approve(row) {
  try {
    const { value } = await ElMessageBox.prompt('审批意见（可选）', '通过申请', {
      confirmButtonText: '通过', cancelButtonText: '取消'
    });
    await transferRequestApi.approve(row.id, { reviewRemark: value });
    ElMessage.success('已通过并完成调拨');
    loadPending();
    refreshPendingBadge();
  } catch {}
}
async function reject(row) {
  try {
    const { value } = await ElMessageBox.prompt('拒绝原因', '拒绝申请', {
      confirmButtonText: '确认拒绝', cancelButtonText: '取消',
      inputValidator: (v) => (v && v.trim() ? true : '请填写原因')
    });
    await transferRequestApi.reject(row.id, { reviewRemark: value });
    ElMessage.success('已拒绝');
    loadPending();
    refreshPendingBadge();
  } catch {}
}

async function submitDirect() {
  if (!direct.fromFactoryId || !direct.toFactoryId) return ElMessage.warning('请选择工厂');
  if (direct.fromFactoryId === direct.toFactoryId) return ElMessage.warning('调入调出不能相同');
  if (!direct.targetId) return ElMessage.warning('请选择型号');
  if (direct.quantity <= 0) return ElMessage.warning('数量必须大于 0');
  loading.value = true;
  try {
    await transferApi.transfer({ ...direct });
    ElMessage.success('调拨完成');
    direct.quantity = 1; direct.remark = '';
  } finally { loading.value = false; }
}
</script>

<style scoped>
.muted { color: #999; font-size: 12px; }
</style>
