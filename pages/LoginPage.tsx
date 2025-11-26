
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/apiService';
import { jwtDecode } from 'jwt-decode';
import { EyeIcon, EyeOffIcon } from '../components/icons';

const LoginPage: React.FC = () => {
  const [emailOrUserName, setEmailOrUserName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
      setEmailOrUserName(rememberedUser);
      setRememberMe(true);
    }
  }, []);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authResponse = await apiService.login(emailOrUserName, password);
      
      if (!authResponse || !authResponse.token) {
        throw new Error("Respuesta de login inválida o token no encontrado.");
      }
      
      // Decode token to get UserID
      const decodedToken: { UserID: string } = jwtDecode(authResponse.token);
      const userId = parseInt(decodedToken.UserID, 10);
      
      if (!userId) {
          throw new Error("No se pudo decodificar el ID de usuario del token.");
      }
      
      // Fetch full user details with the new token
      const userDetails = await apiService.getUserDetailsById(userId, authResponse.token);
      
      if (!userDetails || !userDetails.schoolID) {
        throw new Error("No se pudieron obtener los detalles del usuario o falta el ID del colegio.");
      }

      const allowedRoles = [2, 6, 7, 8, 9, 10]; // Profesor or Admin-level roles
      
      // Permitir padres (Rol 3) solo para colegios específicos (5-9)
      const isAllowedParent = userDetails.roleID === 3 && [5, 6, 7, 8, 9].includes(userDetails.schoolID);

      if (!allowedRoles.includes(userDetails.roleID) && !isAllowedParent) {
          throw new Error("El usuario no tiene permisos para acceder.");
      }
      
      if (rememberMe) {
        localStorage.setItem('rememberedUser', emailOrUserName);
      } else {
        localStorage.removeItem('rememberedUser');
      }

      auth.login(authResponse.token, userDetails);
      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Credenciales inválidas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen w-full overflow-hidden">
      <div className="flex-none w-full md:w-5/12 bg-primary text-text-on-primary flex flex-col justify-center items-center p-8 text-center">
        <img src="https://i.postimg.cc/85N2SD88/San-Gabriel-Logo.png" alt="SchoolApp Logo" className="w-32 md:w-48 mb-6" />
        <div className="hidden md:block">
          <h1 className="text-3xl font-bold text-text-on-primary">Bienvenido a <span className="text-accent">Colegio San Gabriel Arcángel</span></h1>
          <p className="mt-2 text-lg text-text-on-primary">La plataforma para gestionar tu éxito.</p>
        </div>
      </div>
      <div className="flex-1 bg-background flex justify-center items-center p-4 md:p-8">
        <div className="w-full max-w-md bg-surface text-text-primary p-8 rounded-lg shadow-2xl">
          <h2 className="text-center text-2xl font-bold mb-6 text-primary">Iniciar sesion</h2>
          {error && <p className="bg-danger-light/20 text-danger p-3 rounded mb-4 text-center">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="emailOrUserName" className="block text-text-secondary text-sm font-bold mb-2">Correo o Usuario</label>
              <input
                id="emailOrUserName"
                type="text"
                value={emailOrUserName}
                onChange={(e) => setEmailOrUserName(e.target.value)}
                className="shadow appearance-none border border-login-inputBorder rounded w-full py-2 px-3 text-text-primary bg-login-inputBg leading-tight focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                required
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password"  className="block text-text-secondary text-sm font-bold mb-2">Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="shadow appearance-none border border-login-inputBorder rounded w-full py-2 pl-3 pr-10 text-text-primary bg-login-inputBg leading-tight focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-start mb-6">
                <label htmlFor="rememberMe" className="flex items-center text-sm text-text-secondary cursor-pointer select-none">
                    <input
                        id="rememberMe"
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 rounded border-login-inputBorder bg-login-inputBg text-accent focus:ring-accent/50 focus:ring-offset-surface"
                    />
                    <span className="ml-2">Recordarme</span>
                </label>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={loading}
                className="bg-primary hover:bg-secondary text-text-on-primary font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
