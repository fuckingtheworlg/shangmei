<template>
  <div class="dashboard-bg">
    <!-- Top banner -->
    <div class="db-header">
      <div class="db-title">
        <span class="logo-dot"></span>
        彬渭运营中心 · 设备配件管控驾驶舱
      </div>
      <div class="db-meta">
        <span class="meta-item">{{ now }}</span>
        <span class="meta-item">在线 {{ store.user?.name }} · {{ store.user?.factoryName }}</span>
      </div>
    </div>

    <!-- Top stats -->
    <div class="kpi-row">
      <div class="kpi-card kc-blue">
        <div class="kpi-label">设备总数</div>
        <div class="kpi-value">{{ summary.deviceTotal }}</div>
        <div class="kpi-bar"><i :style="{ width: pct(summary.deviceTotal, maxKpi) + '%' }"></i></div>
      </div>
      <div class="kpi-card kc-green">
        <div class="kpi-label">配件总数</div>
        <div class="kpi-value">{{ summary.partTotal }}</div>
        <div class="kpi-bar"><i :style="{ width: pct(summary.partTotal, maxKpi) + '%' }"></i></div>
      </div>
      <div class="kpi-card kc-orange">
        <div class="kpi-label">工厂数量</div>
        <div class="kpi-value">{{ summary.factoryCount }}</div>
        <div class="kpi-bar"><i style="width:100%"></i></div>
      </div>
      <div class="kpi-card kc-purple">
        <div class="kpi-label">待审批申请</div>
        <div class="kpi-value">{{ pendingCount }}</div>
        <div class="kpi-bar"><i :style="{ width: pct(pendingCount, 20) + '%' }"></i></div>
      </div>
    </div>

    <!-- charts row -->
    <div class="chart-row">
      <div class="chart-card span2">
        <div class="chart-title">设备状态分布</div>
        <v-chart class="chart" :option="statusOption" autoresize />
      </div>
      <div class="chart-card span3">
        <div class="chart-title">7 日变动趋势</div>
        <v-chart class="chart" :option="trendOption" autoresize />
      </div>
    </div>

    <div class="chart-row">
      <div class="chart-card span3">
        <div class="chart-title">各分厂设备/配件总量</div>
        <v-chart class="chart" :option="factoryOption" autoresize />
      </div>
      <div class="chart-card span2">
        <div class="chart-title">最近变动</div>
        <div class="log-list">
          <div v-for="r in recent" :key="r.id" class="log-item">
            <div class="log-left">
              <span class="log-dot" :class="dotClass(r.delta)"></span>
              <div>
                <div class="log-target">{{ r.targetName }}</div>
                <div class="log-meta">{{ r.factoryName }} · {{ r.userName }} · {{ time(r.createdAt) }}</div>
              </div>
            </div>
            <div class="log-delta" :class="dotClass(r.delta)">
              {{ r.delta > 0 ? '+' : '' }}{{ r.delta }}
            </div>
          </div>
          <div v-if="!recent.length" class="empty">暂无变动</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { PieChart, LineChart, BarChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components';
import VChart from 'vue-echarts';
import { stockApi, changeLogApi, transferRequestApi } from '../api';
import { useUserStore } from '../stores/user';

use([CanvasRenderer, PieChart, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent]);

const store = useUserStore();
const summary = ref({ deviceTotal: 0, partTotal: 0, factoryCount: 0, statusBreakdown: { inUse: 0, standby: 0, idle: 0, stopped: 0 } });
const factories = ref([]);
const trend = ref([]);
const recent = ref([]);
const pendingCount = ref(0);
const now = ref('');
let timer = null;

const maxKpi = computed(() => {
  return Math.max(summary.value.deviceTotal, summary.value.partTotal, 100);
});
function pct(n, m) {
  if (!m) return 0;
  return Math.min(100, Math.round((n / m) * 100));
}
function time(s) {
  const d = new Date(s);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return `${d.getMonth() + 1}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function dotClass(d) {
  if (d > 0) return 'in';
  if (d < 0) return 'out';
  return '';
}

const statusOption = computed(() => {
  const b = summary.value.statusBreakdown;
  return {
    tooltip: { trigger: 'item' },
    legend: {
      bottom: 0,
      left: 'center',
      textStyle: { color: '#9eb3d6' },
      itemWidth: 10, itemHeight: 10
    },
    series: [{
      type: 'pie',
      radius: ['52%', '78%'],
      avoidLabelOverlap: false,
      label: { show: true, color: '#fff', formatter: '{c}' },
      labelLine: { show: false },
      itemStyle: { borderColor: '#0a1929', borderWidth: 2 },
      data: [
        { value: b.inUse, name: '在用', itemStyle: { color: '#00d9ff' } },
        { value: b.standby, name: '备用', itemStyle: { color: '#52c41a' } },
        { value: b.idle, name: '闲置', itemStyle: { color: '#fa8c16' } },
        { value: b.stopped, name: '停用', itemStyle: { color: '#722ed1' } }
      ]
    }]
  };
});

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { top: 0, right: 8, textStyle: { color: '#9eb3d6' } },
  grid: { left: 36, right: 16, bottom: 30, top: 36 },
  xAxis: {
    type: 'category',
    data: trend.value.map((r) => r.date.slice(5)),
    axisLine: { lineStyle: { color: '#2a3f5f' } },
    axisLabel: { color: '#9eb3d6' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#1f3050' } },
    axisLabel: { color: '#9eb3d6' }
  },
  series: [
    {
      name: '调入', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7,
      data: trend.value.map((r) => r.in),
      lineStyle: { color: '#00d9ff', width: 3 },
      itemStyle: { color: '#00d9ff' },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(0,217,255,0.4)' }, { offset: 1, color: 'rgba(0,217,255,0)' }] }
      }
    },
    {
      name: '调出', type: 'line', smooth: true, symbol: 'circle', symbolSize: 7,
      data: trend.value.map((r) => r.out),
      lineStyle: { color: '#fa8c16', width: 3 },
      itemStyle: { color: '#fa8c16' },
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: 'rgba(250,140,22,0.4)' }, { offset: 1, color: 'rgba(250,140,22,0)' }] }
      }
    }
  ]
}));

const factoryOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  legend: { top: 0, right: 8, textStyle: { color: '#9eb3d6' } },
  grid: { left: 36, right: 16, bottom: 30, top: 36 },
  xAxis: {
    type: 'category',
    data: factories.value.map((f) => f.factoryName),
    axisLine: { lineStyle: { color: '#2a3f5f' } },
    axisLabel: { color: '#9eb3d6' }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#1f3050' } },
    axisLabel: { color: '#9eb3d6' }
  },
  series: [
    { name: '设备', type: 'bar', barWidth: 18,
      data: factories.value.map((f) => f.deviceTotal),
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#00d9ff' }, { offset: 1, color: '#1890ff' }] } } },
    { name: '配件', type: 'bar', barWidth: 18,
      data: factories.value.map((f) => f.partTotal),
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: '#52c41a' }, { offset: 1, color: '#237804' }] } } }
  ]
}));

function tick() {
  const d = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  now.value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

async function load() {
  const [s, byF, tr, logs, pend] = await Promise.all([
    stockApi.summary(),
    store.isSuper ? stockApi.byFactory() : Promise.resolve([]),
    stockApi.dailyTrend(7),
    changeLogApi.list({ pageSize: 12 }),
    transferRequestApi.pendingCount()
  ]);
  summary.value = s;
  factories.value = byF;
  trend.value = tr;
  recent.value = logs.rows;
  pendingCount.value = pend.count;
}

onMounted(() => {
  tick();
  timer = setInterval(tick, 1000);
  load();
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
</script>

<style scoped>
.dashboard-bg {
  min-height: calc(100vh - 76px);
  margin: -20px;
  padding: 20px 24px;
  background:
    radial-gradient(ellipse at top, rgba(0, 217, 255, 0.06) 0%, transparent 50%),
    linear-gradient(180deg, #051428 0%, #0a1929 60%, #0a1929 100%);
  color: #e6eef7;
  font-family: 'PingFang SC', sans-serif;
}

.db-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 4px 22px;
  border-bottom: 1px solid rgba(0, 217, 255, 0.18);
}
.db-title {
  display: flex; align-items: center; gap: 12px;
  font-size: 22px; font-weight: 700;
  background: linear-gradient(90deg, #ffffff 0%, #00d9ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 2px;
}
.logo-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: #00d9ff;
  box-shadow: 0 0 12px #00d9ff;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.db-meta { display: flex; gap: 24px; }
.meta-item { color: #9eb3d6; font-size: 13px; }

.kpi-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 18px 0;
}
.kpi-card {
  position: relative;
  background: linear-gradient(135deg, rgba(26, 47, 76, 0.7), rgba(15, 30, 55, 0.7));
  border: 1px solid rgba(0, 217, 255, 0.2);
  border-radius: 10px;
  padding: 18px 20px;
  overflow: hidden;
}
.kpi-card::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
}
.kc-blue::before { background: linear-gradient(180deg, #00d9ff, #1890ff); box-shadow: 0 0 12px #00d9ff; }
.kc-green::before { background: linear-gradient(180deg, #52c41a, #237804); box-shadow: 0 0 12px #52c41a; }
.kc-orange::before { background: linear-gradient(180deg, #fa8c16, #d4380d); box-shadow: 0 0 12px #fa8c16; }
.kc-purple::before { background: linear-gradient(180deg, #722ed1, #391085); box-shadow: 0 0 12px #722ed1; }
.kpi-label { color: #9eb3d6; font-size: 14px; }
.kpi-value { font-size: 36px; font-weight: 700; margin: 6px 0 12px; letter-spacing: 1px;
  font-family: 'DIN', 'Helvetica Neue', sans-serif; }
.kpi-bar { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
.kpi-bar i {
  display: block; height: 100%;
  background: linear-gradient(90deg, #00d9ff, #1890ff);
  transition: width 0.6s;
}
.kc-green .kpi-bar i { background: linear-gradient(90deg, #52c41a, #237804); }
.kc-orange .kpi-bar i { background: linear-gradient(90deg, #fa8c16, #d4380d); }
.kc-purple .kpi-bar i { background: linear-gradient(90deg, #722ed1, #391085); }

.chart-row {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 16px;
  margin-top: 16px;
}
.chart-card {
  background: linear-gradient(135deg, rgba(26, 47, 76, 0.6), rgba(15, 30, 55, 0.6));
  border: 1px solid rgba(0, 217, 255, 0.15);
  border-radius: 10px;
  padding: 16px;
  min-height: 320px;
  display: flex; flex-direction: column;
}
.chart-card.span3 { grid-column: span 1; }
.chart-card.span2 { grid-column: span 1; }
.chart-title {
  color: #e6eef7;
  font-size: 15px;
  font-weight: 600;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 217, 255, 0.1);
  margin-bottom: 8px;
}
.chart { flex: 1; height: 260px; }

.log-list { flex: 1; overflow: auto; max-height: 280px; }
.log-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 4px; border-bottom: 1px dashed rgba(255,255,255,0.05);
}
.log-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.log-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #9eb3d6;
}
.log-dot.in { background: #00d9ff; box-shadow: 0 0 8px #00d9ff; }
.log-dot.out { background: #fa8c16; box-shadow: 0 0 8px #fa8c16; }
.log-target { color: #e6eef7; font-size: 13px; }
.log-meta { color: #6c84a8; font-size: 11px; margin-top: 2px; }
.log-delta { font-weight: 600; font-size: 14px; color: #9eb3d6; }
.log-delta.in { color: #00d9ff; }
.log-delta.out { color: #fa8c16; }

.empty { text-align: center; color: #6c84a8; padding: 40px 0; }
</style>
