import api from '../lib/api';

const authApi = {
  login: api.login,
  register: api.register,
  me: api.me,
};

export default authApi;