import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Role } from '@/types/user';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => void;
  updateAvatar: (file: File) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'local' }).catch((error) => {
      console.error('Error clearing local session:', error);
    });
    setUser(null);
  }, []);

  const fetchUserMapping = useCallback(async (supabaseUid: string) => {
    try {
      const { data, error } = await supabase
        .from('fdc_user_mapping')
        .select('*')
        .eq('supabase_uid', supabaseUid)
        .maybeSingle();

      if (error) throw error;

      if (!data || data.is_active === false) {
        await clearSession();
        return;
      }

      setUser({
        id: data.id,
        supabaseUid,
        name: data.full_name,
        email: data.email,
        role: data.role as Role,
        department: data.department_name,
        avatarUrl: data.avatar_url,
        isActive: data.is_active ?? true,
        hikvisionEmployeeId: data.hikvision_employee_id || undefined,
      });
    } catch (error) {
      console.error('Error fetching user mapping:', error);
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserMapping(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setLoading(true);
        fetchUserMapping(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserMapping]);

  useEffect(() => {
    if (!user?.supabaseUid) return;

    const channel = supabase
      .channel(`public:fdc_user_mapping:${user.supabaseUid}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'fdc_user_mapping',
          filter: `supabase_uid=eq.${user.supabaseUid}`,
        },
        () => {
          fetchUserMapping(user.supabaseUid!);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchUserMapping, user?.supabaseUid]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateAvatar = async (file: File): Promise<boolean> => {
    if (!user) return false;

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("fdc_user_mapping")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      setUser({ ...user, avatarUrl: publicUrl });
      return true;
    } catch (error) {
      console.error("Error uploading avatar:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
