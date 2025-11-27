
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Type } from "@google/genai";
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { User, ROLES } from '../../types';
import { EyeIcon, EyeOffIcon, CameraIcon, SpinnerIcon } from '../../components/icons';
import Modal from '../../components/Modal';

type FormInputs = Omit<User, 'userID' | 'schoolID' | 'isBlocked'> & { password?: string };

const UserFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = Boolean(id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [cedulaPrefix, setCedulaPrefix] = useState('V');
  const [cedulaNumber, setCedulaNumber] = useState('');

  // AI Extraction States
  const [isExtractionModalOpen, setIsExtractionModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractionError, setExtractionError] = useState('');
  const [aiMissingFields, setAiMissingFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormInputs>();

  useEffect(() => {
    if (isEditMode && user?.schoolId) {
      setLoading(true);
      apiService.getUserById(parseInt(id!), user.schoolId)
        .then(userData => {
          setValue('userName', userData.userName);
          setValue('email', userData.email);
          setValue('phoneNumber', userData.phoneNumber);
          setValue('roleID', userData.roleID);
          if (userData.cedula && userData.cedula.includes('-')) {
              const parts = userData.cedula.split('-');
              setCedulaPrefix(parts[0]);
              setCedulaNumber(parts[1]);
          } else if (userData.cedula) {
              setCedulaNumber(userData.cedula);
          }
        })
        .catch(err => setError('No se pudo cargar el usuario.'))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, setValue, user?.schoolId]);

  useEffect(() => {
    if (cedulaNumber) {
        setValue('cedula', `${cedulaPrefix}-${cedulaNumber}`);
    } else {
        setValue('cedula', '');
    }
  }, [cedulaPrefix, cedulaNumber, setValue]);

  const handleUseCedulaAsPassword = () => {
    if (cedulaNumber) {
        setValue('password', cedulaNumber, { shouldValidate: true });
    }
  };

  // --- AI Extraction Logic ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsAnalyzing(true);
      setExtractionError('');
      setAiMissingFields(new Set());

      try {
          const modelId = 'gemini-2.5-flash';

          // Convert file to base64
          const base64Data = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
              reader.readAsDataURL(file);
          });

          const prompt = `
              Analiza esta imagen de un documento de identidad. Extrae la siguiente información en formato JSON:
              - userName: Nombre completo.
              - cedula: Número de identificación (incluye V-, E-, etc si es visible, sino solo números).
              - email: Correo electrónico (si aparece).
              - phoneNumber: Número de teléfono (si aparece).
              
              Si un campo no está presente, devuélvelo como string vacío "". No inventes datos.
          `;

          const response = await geminiService.generateContent({
              model: modelId,
              contents: [
                  { text: prompt },
                  { inlineData: { mimeType: file.type, data: base64Data } }
              ],
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          userName: { type: Type.STRING },
                          cedula: { type: Type.STRING },
                          email: { type: Type.STRING },
                          phoneNumber: { type: Type.STRING }
                      }
                  }
              }
          });

          const textResponse = response.text;
          if (!textResponse) throw new Error("No se obtuvo respuesta de la IA.");
          
          const data = JSON.parse(textResponse);

          // Helper to clean data
          const sanitize = (val: any) => (!val || val === 'null' || val === 'N/A') ? '' : String(val).trim();

          const cleanUserName = sanitize(data.userName);
          const cleanEmail = sanitize(data.email);
          const cleanPhone = sanitize(data.phoneNumber);
          const rawCedula = sanitize(data.cedula);

          // Populate Form
          setValue('userName', cleanUserName);
          setValue('email', cleanEmail);
          setValue('phoneNumber', cleanPhone);
          
          let cleanCedulaNumber = '';

          if (rawCedula) {
              const cleanCedula = rawCedula.toUpperCase();
              const match = cleanCedula.match(/^([VEPvep])[- ]?(\d+)$/);
              
              if (match) {
                  setCedulaPrefix(match[1]);
                  setCedulaNumber(match[2]);
                  cleanCedulaNumber = match[2];
              } else {
                  // Just numbers? Assume V
                  const numbers = cleanCedula.replace(/[^0-9]/g, '');
                  if (numbers) {
                      setCedulaPrefix('V');
                      setCedulaNumber(numbers);
                      cleanCedulaNumber = numbers;
                  }
              }
          } else {
              // Clear if nothing found
              setCedulaNumber('');
          }

          // Identify Missing Fields for Visual Feedback
          const missing = new Set<string>();
          if (!cleanUserName) missing.add('userName');
          if (!cleanEmail) missing.add('email');
          if (!cleanPhone) missing.add('phoneNumber');
          if (!cleanCedulaNumber) missing.add('cedula');

          setAiMissingFields(missing);
          setIsExtractionModalOpen(false); // Close modal on success

      } catch (err: any) {
          console.error(err);
          setExtractionError("No se pudieron extraer los datos. Intente con una imagen más clara.");
      } finally {
          setIsAnalyzing(false);
          // Clear input
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const clearAiError = (field: string) => {
      if (aiMissingFields.has(field)) {
          setAiMissingFields(prev => {
              const next = new Set(prev);
              next.delete(field);
              return next;
          });
      }
  };


  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
      setError("No se ha podido identificar el colegio.");
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      if (isEditMode) {
        const payload: Partial<User> & { passwordHash?: string } = {
            ...data,
            userID: parseInt(id!),
            schoolID: user.schoolId,
        };
        if(data.password) {
            payload.passwordHash = data.password;
        }
        await apiService.updateUser(parseInt(id!), payload);
      } else {
        const payload = {
            ...data,
            schoolID: user.schoolId,
            passwordHash: data.password || '', 
        };
        await apiService.createUser(payload);
      }
      navigate('/users');
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al guardar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (fieldName: string) => {
      const base = "mt-1 block w-full px-3 py-2 bg-surface text-text-primary border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";
      if (aiMissingFields.has(fieldName)) {
          return `${base} border-danger ring-1 ring-danger`; // Red border for missing AI fields
      }
      return `${base} border-border`;
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-text-primary">{isEditMode ? 'Editar Usuario' : 'Crear Usuario'}</h1>
          {!isEditMode && (
              <button 
                  type="button"
                  onClick={() => setIsExtractionModalOpen(true)}
                  className="bg-accent text-text-on-accent px-4 py-2 rounded-md hover:bg-accent/90 flex items-center text-sm font-bold shadow-md transition-all hover:-translate-y-0.5"
              >
                  <span className="mr-2">✨</span> Autocompletar con IA
              </button>
          )}
      </div>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      
      {loading && isEditMode ? <p>Cargando datos...</p> : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary">Nombre de Usuario</label>
            <input 
                {...register('userName', { required: 'El nombre es requerido' })} 
                className={inputClass('userName')}
                onChange={(e) => {
                    register('userName').onChange(e);
                    clearAiError('userName');
                }}
            />
            {errors.userName && <p className="text-danger text-xs mt-1">{errors.userName.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Email</label>
            <input 
                type="email" 
                {...register('email', { required: 'El email es requerido' })} 
                className={inputClass('email')}
                onChange={(e) => {
                    register('email').onChange(e);
                    clearAiError('email');
                }}
            />
            {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-primary">Cédula</label>
            <div className="flex items-center space-x-2">
                <select 
                value={cedulaPrefix} 
                onChange={(e) => setCedulaPrefix(e.target.value)}
                className="mt-1 block w-24 px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                >
                <option value="V">V</option>
                <option value="CE">CE</option>
                <option value="E">E</option>
                <option value="P">P</option>
                </select>
                <input 
                type="text"
                value={cedulaNumber}
                onChange={(e) => {
                    setCedulaNumber(e.target.value);
                    clearAiError('cedula');
                }}
                placeholder="Número de Cédula"
                className={`mt-1 block w-full px-3 py-2 bg-surface text-text-primary border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent ${aiMissingFields.has('cedula') ? 'border-danger ring-1 ring-danger' : 'border-border'}`}
                />
                <button 
                    type="button" 
                    onClick={handleUseCedulaAsPassword}
                    disabled={!cedulaNumber}
                    className="mt-1 whitespace-nowrap px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-text-primary bg-surface hover:bg-background disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Usar como Contraseña
                </button>
            </div>
            <input type="hidden" {...register('cedula', { required: 'La cédula es requerida' })} />
            {errors.cedula && <p className="text-danger text-xs mt-1">{errors.cedula.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Teléfono</label>
            <input 
                {...register('phoneNumber', { required: 'El teléfono es requerido' })} 
                className={inputClass('phoneNumber')}
                onChange={(e) => {
                    register('phoneNumber').onChange(e);
                    clearAiError('phoneNumber');
                }}
            />
            {errors.phoneNumber && <p className="text-danger text-xs mt-1">{errors.phoneNumber.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Contraseña {isEditMode && '(dejar en blanco para no cambiar)'}</label>
            <div className="relative mt-1">
                <input 
                    type={showPassword ? 'text' : 'password'} 
                    {...register('password', { required: !isEditMode, minLength: { value: isEditMode ? 0 : 1, message: 'La contraseña es requerida' }})} 
                    className="block w-full pl-3 pr-10 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" 
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
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">Rol</label>
            <select {...register('roleID', { valueAsNumber: true, required: 'El rol es requerido' })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
                <option value="">Seleccione un rol</option>
                {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
            {errors.roleID && <p className="text-danger text-xs mt-1">{errors.roleID.message}</p>}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <Link to="/users" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">Cancelar</Link>
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      )}

      {/* Modal for AI Extraction */}
      {isExtractionModalOpen && (
          <Modal isOpen={true} onClose={() => setIsExtractionModalOpen(false)} title="Autocompletar con IA">
              <div className="text-center p-4">
                  <p className="text-text-secondary mb-4">
                      Sube una foto de la cédula o documento de identidad. La IA extraerá los datos y llenará el formulario.
                  </p>
                  
                  {extractionError && (
                      <div className="mb-4 p-3 bg-danger-light text-danger rounded text-sm">
                          {extractionError}
                      </div>
                  )}

                  <div 
                      className={`border-2 border-dashed rounded-lg p-8 transition-colors ${isAnalyzing ? 'border-gray-300 bg-gray-50 cursor-wait' : 'border-primary/50 hover:bg-background cursor-pointer'}`}
                      onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                  >
                      <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*,application/pdf"
                          onChange={handleFileSelect}
                          disabled={isAnalyzing}
                      />
                      
                      {isAnalyzing ? (
                          <div className="flex flex-col items-center justify-center text-primary">
                              <SpinnerIcon className="w-10 h-10 mb-2" />
                              <span className="font-bold">Analizando documento...</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center text-text-tertiary hover:text-primary">
                              <CameraIcon className="w-12 h-12 mb-2" />
                              <span>Haz clic para subir imagen</span>
                          </div>
                      )}
                  </div>
                  
                  <div className="mt-6 flex justify-end">
                      <button 
                          onClick={() => setIsExtractionModalOpen(false)}
                          className="text-text-secondary hover:text-text-primary font-medium text-sm"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </Modal>
      )}
    </div>
  );
};

export default UserFormPage;
