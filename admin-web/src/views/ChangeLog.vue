<template>
  <div class="card-shadow">
    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:12px;">
      <el-select v-model="filter.factoryId" placeholder="工厂" clearable style="width:160px">
        <el-option v-for="f in factories" :key="f.id" :label="f.name" :value="f.id" />
      </el-select>
      <el-select v-model="filter.targetType" placeholder="类型" clearable style="width:120px">
        <el-option label="设备" value="DEVICE" />
        <el-option label="配件" value="PART" />
      </el-select>
      <el-select v-model="filter.action" placeholder="动作" clearable style="width:140px">
        <el-option v-for="(t, k) in ACTION_TEXT" :key="k" :label="t" :value="k" />
      </el-select>
      <el-input v-model="filter.keyword" placeholder="对象名称关键字" clearable style="width:200px" />
      <el-date-picker v-model="dateRange" type="datetimerange" range-separator="至" start-placeholder="开始" end-placeholder="结束" />
      <el-button type="primary" @click="load">搜索</el-button>
      <el-button @click="resetFilter">重置</el-button>
    </div>

    <el-table :data="rows" stripe>
      <el-table-column label="时间" width="160">
        <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column prop="factoryName" label="工厂" width="120" />
      <el-table-column prop="userName" label="操作人" width="100" />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">{{ row.targetType === 'DEVICE' ? '设备' : '配件' }}</template>
      </el-table-column>
      <el-table-column prop="targetName" label="对象" min-width="180" />
      <el-table-column label="变化" width="180">
        <template #default="{ row }">
          {{ row.beforeQty }} → {{ row.afterQty }}
          <el-tag size="small" :type="row.delta > 0 ? 'success' : row.delta < 0 ? 'danger' : ''">
            {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="动作" width="100">
        <template #default="{ row }">{{ ACTION_TEXT[row.action] || row.action }}</template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" />
    </el-table>

    <el-pagination
      style="margin-top:12px; text-align:right;"
      v-model:current-page="page"
      v-model:page-size="pageSize"
      :total="total"
      :page-sizes="[20, 50, 100]"
      layout="sizes, prev, pager, next, total"
      @current-change="load"
      @size-change="load"
    />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { changeLogApi, factoryApi } from '../api';

const ACTION_TEXT = {
  CREATE: '新增', UPDATE: '更新', DELETE: '删除',
  TRANSFER_IN: '调入', TRANSFER_OUT: '调出', IMPORT: '导入'
};

const factories = ref([]);
const rows = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const dateRange = ref([]);
const filter = reactive({ factoryId: null, targetType: null, action: null, keyword: '' });

function formatTime(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load() {
  const params = {
    page: page.value,
    pageSize: pageSize.value,
    factoryId: filter.factoryId || undefined,
    targetType: filter.targetType || undefined,
    action: filter.action || undefined,
    keyword: filter.keyword || undefined,
    startTime: dateRange.value?.[0] ? new Date(dateRange.value[0]).toISOString() : undefined,
    endTime: dateRange.value?.[1] ? new Date(dateRange.value[1]).toISOString() : undefined
  };
  const res = await changeLogApi.list(params);
  rows.value = res.rows;
  total.value = res.total;
}
function resetFilter() {
  Object.assign(filter, { factoryId: null, targetType: null, action: null, keyword: '' });
  dateRange.value = [];
  page.value = 1;
  load();
}
onMounted(async () => {
  factories.value = await factoryApi.list();
  load();
});
</script>
