<template>
  <div>
    <el-row :gutter="20">
      <el-col :span="12">
        <div class="card-shadow">
          <div style="font-weight:600; margin-bottom:12px;">设备库存</div>
          <el-button @click="downloadTpl('device')">下载模板</el-button>
          <el-button type="primary" @click="exportData('device')">导出全部</el-button>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="(f) => onUpload(f, 'device')"
            accept=".xlsx"
          >
            <el-button type="warning">导入 Excel</el-button>
          </el-upload>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="card-shadow">
          <div style="font-weight:600; margin-bottom:12px;">配件库存</div>
          <el-button @click="downloadTpl('part')">下载模板</el-button>
          <el-button type="primary" @click="exportData('part')">导出全部</el-button>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            :on-change="(f) => onUpload(f, 'part')"
            accept=".xlsx"
          >
            <el-button type="warning">导入 Excel</el-button>
          </el-upload>
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="resultDlg" title="导入结果" width="560px">
      <div>共 {{ result.total }} 行，成功 {{ result.success }}，失败 {{ result.failed }}</div>
      <el-table v-if="result.errors?.length" :data="result.errors" size="small" style="margin-top:12px">
        <el-table-column prop="row" label="行号" width="80" />
        <el-table-column prop="reason" label="原因" />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { excelApi, downloadBlob } from '../api';
import { ElMessage } from 'element-plus';

const result = ref({ total: 0, success: 0, failed: 0, errors: [] });
const resultDlg = ref(false);

async function downloadTpl(kind) {
  const blob = kind === 'device' ? await excelApi.downloadDeviceTpl() : await excelApi.downloadPartTpl();
  downloadBlob(blob, kind === 'device' ? '设备库存模板.xlsx' : '配件库存模板.xlsx');
}
async function exportData(kind) {
  const blob = kind === 'device' ? await excelApi.exportDevice() : await excelApi.exportPart();
  downloadBlob(blob, kind === 'device' ? '设备库存.xlsx' : '配件库存.xlsx');
}
async function onUpload(file, kind) {
  const real = file.raw || file;
  const api = kind === 'device' ? excelApi.importDevice : excelApi.importPart;
  const res = await api(real);
  result.value = res;
  resultDlg.value = true;
  ElMessage.success(`导入完成：成功 ${res.success} 行，失败 ${res.failed} 行`);
}
</script>
