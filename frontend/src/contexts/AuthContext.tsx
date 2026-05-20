import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../../services/supabase';
import axios from 'axios';
import { Perfil } from '../types';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  user: any;
  session: any;
  perfil: Perfil | null;
  loading: boolean;
  signIn: (e: string, p: string) => Promise<any>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isMicrored: boolean;
  isEstablecimiento: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const queryClient = useQueryClient();

  // Configurar el token de Axios para todas las peticiones al backend
  const setAuthToken = (token: string | null) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Obtener el perfil del usuario desde la tabla 'perfiles'
  const fetchPerfil = async (userId: string) => {
    const { data, error } = await supabase
      .from('perfiles')
      .select('rol, nombres, establecimiento_id, microred_id')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Error al obtener perfil:', error);
      return null;
    }
    return { ...data, id: userId };
  };

  // Iniciar sesión
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // data.session contiene el token
    setSession(data.session);
    setUser(data.user);
    setAuthToken(data.session.access_token);
    // Cargar perfil
    const perfilData = await fetchPerfil(data.user.id);
    setPerfil(perfilData);
    return data;
  };

  // Cerrar sesión
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setPerfil(null);
    setAuthToken(null);
    queryClient.clear();
  };

  // Verificar la sesión al cargar la app
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthToken(session.access_token);
        const perfilData = await fetchPerfil(session.user.id);
        setPerfil(perfilData);
      }
      setLoading(false);
    };

    getSession();

    // Escuchar cambios en la autenticación
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setAuthToken(session.access_token);
        fetchPerfil(session.user.id).then(setPerfil);
      } else {
        setAuthToken(null);
        setPerfil(null);
        queryClient.clear();
      }
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    perfil,
    loading,
    signIn,
    signOut,
    isAdmin: perfil?.rol === 'admin',
    isMicrored: perfil?.rol === 'microred',
    isEstablecimiento: perfil?.rol === 'establecimiento',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};