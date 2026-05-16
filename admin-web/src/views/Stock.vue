<template>
  <div class="card-shadow">
    <el-tabs v-model="tab" @tab-change="load">
      <el-tab-pane label="设备库存" name="device" />
      <el-tab-pane label="配件库存" name="part" />
    </el-tabs>

    <div style="display:flex; justify-content:space-between; margin-bottom:12px; flex-wrap:wrap; gap:8px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <el-select v-model="factoryId" placeholder="工厂" clearable style="width:160px" @change="load">
          <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
        </el-select>
        <el-select v-model="categoryId" placeholder="设备分类" clearable style="width:160px" @change="load">
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
        <el-input v-model="keyword" placeholder="搜索名称/规格" clearable style="width:200px" @keyup.enter="load" @clear="load" />
      </div>
      <el-button type="primary" @click="openAdjust">+ 新增/调整库存</el-button>
    </div>

    <el-table :data="rows" stripe v-loading="loading">
      <el-table-column prop="factoryName" label="工厂" width="120" />
      <el-table-column prop="categoryName" label="分类" width="100" v-if="tab === 'device'">
        <template #default="{ row }">
          <el-tag v-if="row.categoryName" size="small">{{ row.categoryName }}</el-tag>
          <span v-else class="muted">—</span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="名称" min-width="120" />
      <el-table-column prop="spec" label="规格" width="120" />
      <el-table-column prop="unit" label="单位" width="60" />
      <template v-if="tab === 'device'">
        <el-table-column label="在用" width="78">
          <template #default="{ row }">
            <span class="tag-num in-use">{{ row.qtyInUse }}</span>
          </template>
        </el-table-column>
        <el-table-column label="备用" width="78">
          <template #default="{ row }">
            <span class="tag-num standby">{{ row.qtyStandby }}</span>
          </template>
        </el-table-column>
        <el-table-column label="闲置" width="78">
          <template #default="{ row }">
            <span class="tag-num idle">{{ row.qtyIdle }}</span>
          </template>
        </el-table-column>
        <el-table-column label="停用" width="78">
          <template #default="{ row }">
            <span class="tag-num stopped">{{ row.qtyStopped }}</span>
          </template>
        </el-table-column>
      </template>
      <el-table-column label="总数" width="80">
        <template #default="{ row }">
          <span style="font-weight:600; color:#1890ff;">{{ row.quantity }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
      <el-table-column label="操作" width="180">
        <template #default="{ row }">
          <el-button size="small" link @click="editRow(row)">编辑</el-button>
          <el-popconfirm title="确定删除？" @confirm="remove(row)">
            <template #reference><el-button size="small" link type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑 -->
    <el-dialog v-model="dlg" :title="form.id ? '编辑库存' : '新增/调整库存'" width="540px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="工厂">
          <el-select v-model="form.factoryId" placeholder="请选择" :disabled="!!form.id">
            <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="tab === 'device' ? '设备型号' : '配件型号'">
          <el-select v-model="form.modelId" filterable placeholder="请选择" :disabled="!!form.id">
            <el-option v-for="m in models" :key="m.id" :label="modelLabel(m)" :value="m.id" />
          </el-select>
        </el-form-item>
        <template v-if="tab === 'device'">
          <div class="bucket-row">
            <div class="bucket-cell"><div class="b-lbl in-use">在用</div><el-input-number v-model="form.qtyInUse" :min="0" controls-position="right" /></div>
            <div class="bucket-cell"><div class="b-lbl standby">备用</div><el-input-number v-model="form.qtyStandby" :min="0" controls-position="right" /></div>
            <div class="bucket-cell"><div class="b-lbl idle">闲置</div><el-input-number v-model="form.qtyIdle" :min="0" controls-position="right" /></div>
            <div class="bucket-cell"><div class="b-lbl stopped">停用</div><el-input-number v-model="form.qtyStopped" :min="0" controls-position="right" /></div>
          </div>
          <div class="bucket-total">合计：<b>{{ totalQty }}</b></div>
        </template>
        <template v-else>
          <el-form-item label="数量">
            <el-input-number v-model="form.quantity" :min="0" />
          </el-form-item>
        </template>
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { stockApi, factoryApi, deviceModelApi, partModelApi, categoryApi } from '../api';
import { ElMessage } from 'element-plus';

const tab = ref('device');
const factoryId = ref(null);
const categoryId = ref(null);
const keyword = ref('');
const rows = ref([]);
const factories = ref([]);
const categories = ref([]);
const models = ref([]);
const loading = ref(false);

const dlg = ref(false);
const form = reactive({
  id: null, factoryId: null, modelId: null,
  qtyInUse: 0, qtyStandby: 0, qtyIdle: 0, qtyStopped: 0,
  quantity: 0, remark: ''
});

const totalQty = computed(() => (form.qtyInUse || 0) + (form.qtyStandby || 0) + (form.qtyIdle || 0) + (form.qtyStopped || 0));

function modelLabel(m) {
  return `${m.name}${m.spec ? ' / ' + m.spec : ''}`;
}

async function load() {
  loading.value = true;
  try {
    const params = {
      factoryId: factoryId.value || undefined,
      categoryId: categoryId.value || undefined,
      keyword: keyword.value || undefined
    };
    rows.value = tab.value === 'device' ? await stockApi.devices(params) : await stockApi.parts(params);
    models.value = tab.value === 'device'
      ? await deviceModelApi.list({ categoryId: categoryId.value || undefined })
      : await partModelApi.list();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  [factories.value, categories.value] = await Promise.all([factoryApi.list(), categoryApi.list()]);
  await load();
});

function openAdjust() {
  Object.assign(form, {
    id: null, factoryId: factoryId.value || factories.value[0]?.id, modelId: null,
    qtyInUse: 0, qtyStandby: 0, qtyIdle: 0, qtyStopped: 0, quantity: 0, remark: ''
  });
  dlg.value = true;
}
function editRow(row) {
  Object.assign(form, {
    id: row.id, factoryId: row.factoryId,
    modelId: tab.value === 'device' ? row.deviceModelId : row.partModelId,
    qtyInUse: row.qtyInUse ?? 0, qtyStandby: row.qtyStandby ?? 0,
    qtyIdle: row.qtyIdle ?? 0, qtyStopped: row.qtyStopped ?? 0,
    quantity: row.quantity ?? 0, remark: row.remark ?? ''
  });
  dlg.value = true;
}
async function save() {
  if (!form.factoryId || !form.modelId) return ElMessage.warning('请选择工厂和型号');
  if (tab.value === 'device') {
    await stockApi.upsertDevice({
      factoryId: form.factoryId,
      deviceModelId: form.modelId,
      qtyInUse: form.qtyInUse,
      qtyStandby: form.qtyStandby,
      qtyIdle: form.qtyIdle,
      qtyStopped: form.qtyStopped,
      remark: form.remark
    });
  } else {
    await stockApi.upsertPart({
      factoryId: form.factoryId,
      partModelId: form.modelId,
      quantity: form.quantity,
      remark: form.remark
    });
  }
  ElMessage.success('已保存');
  dlg.value = false;
  load();
}
async function remove(row) {
  const api = tab.value === 'device' ? stockApi.removeDevice : stockApi.removePart;
  await api(row.id);
  ElMessage.success('已删除');
  load();
}
</script>

<style scoped>
.tag-num {
  display: inline-block;
  min-width: 36px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
.tag-num.in-use   { background:#e6f7ff; color:#1890ff; }
.tag-num.standby  { background:#f6ffed; color:#52c41a; }
.tag-num.idle     { background:#fff7e6; color:#fa8c16; }
.tag-num.stopped  { background:#f9f0ff; color:#722ed1; }
.bucket-row {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; padding: 0 0 12px;
}
.bucket-cell { text-align: center; }
.b-lbl {
  display:inline-block; padding: 2px 12px; border-radius: 10px;
  font-size: 12px; font-weight: 600; margin-bottom: 6px;
}
.b-lbl.in-use   { background:#e6f7ff; color:#1890ff; }
.b-lbl.standby  { background:#f6ffed; color:#52c41a; }
.b-lbl.idle     { background:#fff7e6; color:#fa8c16; }
.b-lbl.stopped  { background:#f9f0ff; color:#722ed1; }
.bucket-total { text-align: right; color:#666; padding-right: 12px; padding-bottom: 8px; }
.muted { color: #ccc; }
</style>
