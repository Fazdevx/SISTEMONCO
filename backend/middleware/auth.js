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

const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    const userId = req.user.id;
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', userId)
      .single();
    if (error || !perfil || !allowedRoles.includes(perfil.rol)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user.rol = perfil.rol;
    next();
  };
};

module.exports = { verifyToken, requireRole };