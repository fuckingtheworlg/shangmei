import axios from 'axios';
import { ElMessage } from 'element-plus';
import router from '../router';

const instance = axios.create({
  baseURL: '/api',
  timeout: 30000
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

instance.interceptors.response.use(
  (res) => {
    if (res.config.responseType === 'blob') return res.data;
    if (res.data && res.data.code === 0) return res.data.data;
    ElMessage.error(res.data?.message || '请求失败');
    return Promise.reject(new Error(res.data?.message || '请求失败'));
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.replace('/login');
    }
    ElMessage.error(err.response?.data?.message || err.message || '网络错误');
    return Promise.reject(err);
  }
);

export default instance;
