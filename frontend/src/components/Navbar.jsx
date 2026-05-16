import { Link } from 'react-router-dom';

export default function Navbar({ onLogout }) {
  return (
    <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0f0f0' }}>
      <Link to="/">Mamografías</Link>
      <button onClick={onLogout}>Cerrar sesión</button>
    </nav>
  );
}