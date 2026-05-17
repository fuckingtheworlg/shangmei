<template>
  <div class="layout">
    <aside class="sider">
      <div class="brand">彬渭运营中心</div>
      <el-menu :default-active="$route.path" router background-color="transparent" text-color="#cbd5e1" active-text-color="#fff">
        <el-menu-item index="/dashboard">工作台</el-menu-item>
        <el-menu-item index="/stock">库存总览</el-menu-item>
        <el-menu-item index="/transfer">跨厂调动</el-menu-item>
        <el-menu-item index="/change-log">变动日志</el-menu-item>
        <el-menu-item index="/excel">Excel 导入导出</el-menu-item>
        <el-menu-item index="/device-model">设备型号</el-menu-item>
        <el-menu-item index="/part-model">配件型号</el-menu-item>
        <el-menu-item index="/factory">工厂管理</el-menu-item>
        <el-menu-item index="/user">用户管理</el-menu-item>
      </el-menu>
    </aside>
    <div class="main-wrapper">
      <div class="topbar">
        <div>{{ $route.meta.title }}</div>
        <el-dropdown @command="onCmd">
          <span style="cursor:pointer">{{ store.user?.name }} ({{ store.user?.factoryName }}) ▾</span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/user';
import { useRouter } from 'vue-router';
const store = useUserStore();
const router = useRouter();
function onCmd(cmd) {
  if (cmd === 'logout') {
    store.logout();
    router.replace('/login');
  }
}
</script>
