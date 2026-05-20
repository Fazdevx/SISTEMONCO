const supabase = require('../config/supabase');

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const loadProfile = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
  
  try {
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('rol, establecimiento_id, microred_id')
      .eq('id', req.user.id)
      .single();
    
    if (error || !perfil) {
      return res.status(403).json({ error: 'Profile not found' });
    }
    
    req.user.rol = perfil.rol;
    req.user.establecimiento_id = perfil.establecimiento_id;
    req.user.microred_id = perfil.microred_id;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error loading profile' });
  }
};

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    // Asumimos que loadProfile ya se ejecutó o lo ejecutamos aquí si no está
    if (!req.user.rol) {
      await loadProfile(req, res, () => {});
      if (res.headersSent) return;
    }
    
    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
};

module.exports = { verifyToken, loadProfile, requireRole };