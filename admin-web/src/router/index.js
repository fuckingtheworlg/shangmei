import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'dashboard', meta: { title: '工作台' }, component: () => import('../views/Dashboard.vue') },
      { path: 'factory', name: 'factory', meta: { title: '工厂管理' }, component: () => import('../views/Factory.vue') },
      { path: 'user', name: 'user', meta: { title: '用户管理' }, component: () => import('../views/User.vue') },
      { path: 'device-model', name: 'device-model', meta: { title: '设备型号' }, component: () => import('../views/DeviceModel.vue') },
      { path: 'part-model', name: 'part-model', meta: { title: '配件型号' }, component: () => import('../views/PartModel.vue') },
      { path: 'stock', name: 'stock', meta: { title: '库存总览' }, component: () => import('../views/Stock.vue') },
      { path: 'transfer', name: 'transfer', meta: { title: '跨厂调动' }, component: () => import('../views/Transfer.vue') },
      { path: 'change-log', name: 'change-log', meta: { title: '变动日志' }, component: () => import('../views/ChangeLog.vue') },
      { path: 'excel', name: 'excel', meta: { title: 'Excel 导入导出' }, component: () => import('../views/Excel.vue') }
    ]
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token');
  if (to.path === '/login') return next();
  if (!token) return next('/login');
  next();
});

export default router;
