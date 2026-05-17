<template>
  <div class="login-page">
    <div class="login-card">
      <div class="title">彬渭运营中心管理后台</div>
      <el-form :model="form" label-width="60px" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="form.username" placeholder="账号" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="form.password" type="password" show-password placeholder="密码" />
        </el-form-item>
        <el-button type="primary" :loading="loading" style="width: 100%" @click="submit">登录</el-button>
        <div class="tip">演示：admin / admin123</div>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { authApi } from '../api';
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

const form = reactive({ username: 'admin', password: 'admin123' });
const loading = ref(false);
const router = useRouter();
const store = useUserStore();

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号密码');
    return;
  }
  loading.value = true;
  try {
    const res = await authApi.login(form);
    if (!res.user.isCenter && res.user.role !== 'SUPER_ADMIN') {
      ElMessage.warning('管理后台仅限彬渭运营中心账号登录');
      return;
    }
    store.setLogin(res.token, res.user);
    router.replace('/');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1890ff, #4dabff);
  display: flex; align-items: center; justify-content: center;
}
.login-card {
  width: 380px; background: #fff;
  padding: 40px 32px; border-radius: 12px;
  box-shadow: 0 12px 32px rgba(0,0,0,0.18);
}
.title { font-size: 22px; font-weight: 700; text-align: center; margin-bottom: 28px; }
.tip { color: #999; text-align: center; margin-top: 12px; font-size: 12px; }
</style>
