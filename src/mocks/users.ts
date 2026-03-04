import { User } from '@/types/user';

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Minh',
    email: 'minh@fdc.vn',
    role: 'super_admin',
    avatarUrl: 'https://i.pravatar.cc/150?u=u1',
  },
  {
    id: 'u2',
    name: 'Dr. Hương',
    email: 'huong@fdc.vn',
    role: 'doctor',
    department: 'Phòng khám',
    avatarUrl: 'https://i.pravatar.cc/150?u=u2',
  },
  {
    id: 'u3',
    name: 'Lan',
    email: 'lan@fdc.vn',
    role: 'dept_head',
    department: 'Phòng khám',
    avatarUrl: 'https://i.pravatar.cc/150?u=u3',
  },
  {
    id: 'u4',
    name: 'Thảo',
    email: 'thao@fdc.vn',
    role: 'accountant',
    department: 'Kế toán',
    avatarUrl: 'https://i.pravatar.cc/150?u=u4',
  },
  {
    id: 'u5',
    name: 'Ông Tuấn',
    email: 'tuan@fdc.vn',
    role: 'director',
    avatarUrl: 'https://i.pravatar.cc/150?u=u5',
  },
  {
    id: 'u6',
    name: 'Ông Nam',
    email: 'nam@fdc.vn',
    role: 'chairman',
    avatarUrl: 'https://i.pravatar.cc/150?u=u6',
  },
];
