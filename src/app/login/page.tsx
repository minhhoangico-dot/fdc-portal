import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function normalizeLoginEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  if (trimmed.includes('@')) return trimmed;
  return `${trimmed}@fdc.vn`;
}

export default function LoginPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  if (user) {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizeLoginEmail(email),
      password,
    });

    if (signInError) {
      setError('Dang nhap that bai. Vui long kiem tra lai ten dang nhap/email va mat khau.');
      setIsLoading(false);
      return;
    }

    if (!data.user) {
      setError('Khong the xac thuc tai khoan dang nhap.');
      setIsLoading(false);
      return;
    }

    const { data: mapping, error: mappingError } = await supabase
      .from('fdc_user_mapping')
      .select('is_active')
      .eq('supabase_uid', data.user.id)
      .maybeSingle();

    if (mappingError || !mapping) {
      await supabase.auth.signOut({ scope: 'local' });
      setError('Tai khoan chua duoc cap quyen truy cap vao he thong.');
      setIsLoading(false);
      return;
    }

    if (mapping.is_active === false) {
      await supabase.auth.signOut({ scope: 'local' });
      setError('Tai khoan da bi vo hieu hoa. Vui long lien he quan tri vien.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-2xl">FDC</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Dang nhap he thong
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Phong kham Gia Dinh
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email hoac ten dang nhap
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2 border"
                  placeholder="vd: pthue hoac pthue@fdc.vn"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mat khau
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 py-2 border"
                />
              </div>
            </div>

            <p className="text-sm text-gray-500">
              Quen mat khau? Lien he quan tri vien de duoc cap lai mat khau tam thoi.
            </p>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Dang xu ly...' : 'Dang nhap'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
