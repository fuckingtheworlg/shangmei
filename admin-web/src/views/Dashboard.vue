<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="6">
        <div class="card-shadow stat" style="background:linear-gradient(135deg,#52c41a,#73d13d); color:#fff">
          <div class="label">设备总数</div>
          <div class="value">{{ summary.deviceTotal }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card-shadow stat" style="background:linear-gradient(135deg,#1890ff,#40a9ff); color:#fff">
          <div class="label">配件总数</div>
          <div class="value">{{ summary.partTotal }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card-shadow stat" style="background:linear-gradient(135deg,#fa8c16,#ffa940); color:#fff">
          <div class="label">工厂数量</div>
          <div class="value">{{ summary.factoryCount }}</div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="card-shadow stat" style="background:linear-gradient(135deg,#13c2c2,#36cfc9); color:#fff">
          <div class="label">今日跨厂调动</div>
          <div class="value">{{ todayTransfer }}</div>
        </div>
      </el-col>
    </el-row>

    <div class="card-shadow" style="margin-top:20px;">
      <div style="font-weight:600;margin-bottom:12px;">最近变动</div>
      <el-table :data="recent" size="small" stripe>
        <el-table-column prop="factoryName" label="工厂" width="120" />
        <el-table-column prop="userName" label="操作人" width="100" />
        <el-table-column prop="targetName" label="对象" min-width="180" />
        <el-table-column label="变化" width="160">
          <template #default="{ row }">
            {{ row.beforeQty }} → {{ row.afterQty }}
            <el-tag size="small" :type="row.delta > 0 ? 'success' : row.delta < 0 ? 'danger' : ''">
              {{ row.delta > 0 ? '+' : '' }}{{ row.delta }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="动作" width="100">
          <template #default="{ row }">{{ ACTION_TEXT[row.action] || row.action }}</template>
        </el-table-column>
        <el-table-column label="时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { stockApi, changeLogApi, messageApi } from '../api';

const ACTION_TEXT = {
  CREATE: '新增', UPDATE: '更新', DELETE: '删除',
  TRANSFER_IN: '调入', TRANSFER_OUT: '调出', IMPORT: '导入'
};

const summary = ref({ deviceTotal: 0, partTotal: 0, factoryCount: 0 });
const recent = ref([]);
const todayTransfer = ref(0);

function formatTime(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

onMounted(async () => {
  summary.value = await stockApi.summary();
  const logs = await changeLogApi.list({ pageSize: 10 });
  recent.value = logs.rows;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const msg = await messageApi.list({ pageSize: 100 });
  todayTransfer.value = msg.rows.filter((m) => new Date(m.createdAt) >= today).length;
});
</script>

<style scoped>
.stat .label { font-size: 14px; opacity: 0.95; }
.stat .value { font-size: 32px; font-weight: 700; margin-top: 8px; }
</style>
