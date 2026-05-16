import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Activity } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError('Credenciales inválidas o error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 selection:bg-accent-soft selection:text-indigo-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="p-10 sm:p-12">
            <div className="flex justify-center mb-10">
              <div className="bg-accent p-5 rounded-[2rem] shadow-xl shadow-accent/20 transform -rotate-6">
                <Activity className="text-white" size={36} />
              </div>
            </div>
            
            <h2 className="text-4xl font-black text-center text-slate-800 tracking-tighter">
              SISTEMONCO
            </h2>
            <p className="text-center text-slate-400 mt-3 font-bold uppercase text-[10px] tracking-[0.2em]">
              Gestión de Tamizaje Oncológico
            </p>

            <form onSubmit={handleSubmit} className="mt-12 space-y-7">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Corporativo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-accent transition-colors">
                    <Mail size={20} />
                  </div>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="block w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-slate-900 font-bold focus:outline-none focus:ring-0 focus:border-accent focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="admin@ejemplo.com"
                    required 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300 group-focus-within:text-accent transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="block w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-slate-900 font-bold focus:outline-none focus:ring-0 focus:border-accent focus:bg-white transition-all placeholder:text-slate-300"
                    placeholder="••••••••"
                    required 
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-rose-50 border-2 border-rose-100 text-rose-600 px-5 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm"
                >
                  <AlertCircle size={20} />
                  {error}
                </motion.div>
              )}

              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-slate-900 hover:bg-accent text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 hover:shadow-accent/20 transform transition-all active:scale-[0.97] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={24} />
                    AUTENTICANDO...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    INICIAR SESIÓN
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="bg-slate-50 p-8 border-t border-slate-100 flex items-center justify-center gap-4">
            <span className="h-px w-8 bg-slate-200"></span>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">
              Seguridad V.2.0
            </p>
            <span className="h-px w-8 bg-slate-200"></span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}