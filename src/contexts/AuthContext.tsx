import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types/user';
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

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserMapping(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          fetchUserMapping(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserMapping = async (supabaseUid: string) => {
    try {
      const { data, error } = await supabase
        .from('fdc_user_mapping')
        .select('*')
        .eq('supabase_uid', supabaseUid)
        .single();

      if (error) throw error;

      if (data) {
        setUser({
          id: data.id,
          name: data.full_name,
          email: data.email,
          role: data.role as any,
          department: data.department_name,
          avatarUrl: data.avatar_url,
        });
      }
    } catch (error) {
      console.error('Error fetching user mapping:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (err) {
      console.error("Error uploading avatar:", err);
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
