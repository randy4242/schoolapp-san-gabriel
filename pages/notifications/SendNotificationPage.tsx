
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { useAuth } from '../../hooks/useAuth';
import { User, Classroom, ROLES } from '../../types';
import { SpinnerIcon, SparklesIcon } from '../../components/icons';

type TemplateFields = {
  // for cobro
  tplMes?: string;
  tplConcepto?: string;
  tplAmount?: string;
  tplDueDate?: string;
  // for reunion
  tplMeetingDate?: string;
  tplMeetingTime?: string;
  tplLocation?: string;
  tplTopic?: string;
}

type FormInputs = {
  title: string;
  content: string;
  target: 'user' | 'all' | 'role' | 'classroom';
  userID?: number;
  roleID?: number;
  classroomID?: number;
  typeSelect: 'custom' | 'cobro_general' | 'cobro_individual' | 'reunion' | 'aviso_general';
  autoRefresh: boolean;
} & TemplateFields;

const SendNotificationPage: React.FC = () => {
  const { user } = useAuth();
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<FormInputs>({ 
      defaultValues: { 
        target: 'all',
        typeSelect: 'custom',
        autoRefresh: true
      } 
  });
  
  const [users, setUsers] = useState<User[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  // AI State
  const [isImproving, setIsImproving] = useState(false);

  const formValues = watch();
  const target = watch('target');
  const typeSelect = watch('typeSelect');

  useEffect(() => {
    if (user?.schoolId) {
      apiService.getUsers(user.schoolId).then(setUsers);
      apiService.getClassrooms(user.schoolId).then(setClassrooms);
    }
  }, [user]);

  const selectedUserName = useCallback(() => {
      const selectedUser = users.find(u => u.userID === Number(formValues.userID));
      return selectedUser ? selectedUser.userName : 'representante';
  }, [users, formValues.userID]);

  const buildTemplate = useCallback((kind: string, values: FormInputs) => {
      const money = (val: any) => {
        const n = parseFloat(val);
        return isNaN(n) ? "" : n.toFixed(2);
      }
      const formatDate = (dateStr: string | undefined) => {
        if(!dateStr) return "";
        const date = new Date(dateStr + 'T00:00:00'); // Adjust for timezone issues
        return date.toLocaleDateString('es-ES');
      }

      switch (kind) {
          case "cobro_general":
              return {
                  title: "Aviso de cobro",
                  content: `Estimadas familias:\n\nSe recuerda que la ${values.tplConcepto || 'cuota escolar'}${values.tplMes ? " del mes " + values.tplMes : ""} vence el ${formatDate(values.tplDueDate)}. Monto: ${money(values.tplAmount)}.\n\nGracias por su atención.`
              };
          case "cobro_individual":
              return {
                  title: "Aviso de cobro individual",
                  content: `Estimado/a ${selectedUserName()}:\n\nLe recordamos que presenta un saldo pendiente por ${money(values.tplAmount)} correspondiente a ${values.tplConcepto || 'cuota escolar'}. Fecha límite: ${formatDate(values.tplDueDate)}.\n\nPor favor, regularice el pago a la brevedad. Muchas gracias.`
              };
          case "reunion":
              return {
                  title: "Convocatoria a reunión",
                  content: `Se convoca a reunión el ${formatDate(values.tplMeetingDate)} a las ${values.tplMeetingTime || ""} en ${values.tplLocation || 'la institución'}. Tema: ${values.tplTopic || "varios"}.\n\nAgradecemos su puntual asistencia.`
              };
          case "aviso_general":
              return {
                  title: "Comunicado",
                  content: `Estimadas familias:\n\nCompartimos el siguiente comunicado del colegio.\n\nMuchas gracias.`
              };
          default:
              return { title: values.title || '', content: values.content || '' };
      }
  }, [selectedUserName]);

  useEffect(() => {
      if (typeSelect === 'cobro_individual') {
          setValue('target', 'user');
      }

      if (formValues.autoRefresh && typeSelect !== 'custom') {
          const { title, content } = buildTemplate(typeSelect, formValues);
          setValue('title', title, { shouldDirty: true });
          setValue('content', content, { shouldDirty: true });
      }
  }, [typeSelect, formValues, setValue, buildTemplate]);

  const handleAiImproveContent = async () => {
        const currentContent = watch('content');
        if (!currentContent?.trim()) return;

        setIsImproving(true);
        try {
            const prompt = `Mejora la redacción del siguiente texto para una notificación escolar formal y clara. Mantén el mensaje original pero hazlo más profesional y amigable. Solo devuelve el texto mejorado, sin explicaciones: "${currentContent}"`;
            const response = await geminiService.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ text: prompt }]
            });
            if (response.text) {
                setValue('content', response.text.trim(), { shouldDirty: true });
            }
        } catch (error) {
            console.error(error);
            alert("Error al mejorar con IA. Intente nuevamente.");
        } finally {
            setIsImproving(false);
        }
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (!user?.schoolId) {
        setError("No se ha podido identificar el colegio.");
        return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
        const notification = { title: data.title, content: data.content };
        switch (data.target) {
            case 'user':
                if (data.userID) {
                    const payload = { ...notification, userID: data.userID, schoolID: user.schoolId };
                    await apiService.sendNotification(payload);
                }
                break;
            case 'all':
                await apiService.sendToAll(user.schoolId, notification);
                break;
            case 'role':
                if (data.roleID) {
                    await apiService.sendToRole(user.schoolId, data.roleID, notification);
                }
                break;
            case 'classroom':
                if (data.classroomID) {
                    await apiService.sendToClassroom(user.schoolId, data.classroomID, notification);
                }
                break;
        }
        setSuccess('Notificación enviada correctamente.');
    } catch (err: any) {
        setError(err.message || 'Error al enviar la notificación.');
    } finally {
        setLoading(false);
    }
  };

  const filteredUsers = userSearch ? users.filter(u => u.userName.toLowerCase().includes(userSearch.toLowerCase())) : users;

  return (
    <div className="max-w-2xl mx-auto bg-surface p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Enviar Notificación</h1>
      
      {error && <p className="bg-danger-light text-danger p-3 rounded mb-4">{error}</p>}
      {success && <p className="bg-success-light text-success p-3 rounded mb-4">{success}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary">Tipo de notificación</label>
          <select {...register('typeSelect')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
            <option value="custom">Personalizada (escribir todo)</option>
            <option value="cobro_general">Aviso de cobro (general)</option>
            <option value="cobro_individual">Aviso de cobro (individual)</option>
            <option value="reunion">Reunión</option>
            <option value="aviso_general">Comunicado general</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-primary">Destino</label>
          <select {...register('target')} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
            <option value="all">Todos los usuarios</option>
            <option value="role">Por Rol</option>
            <option value="classroom">Por Salón</option>
            <option value="user">Usuario específico</option>
          </select>
        </div>

        {target === 'role' && (
          <div>
            <label className="block text-sm font-medium text-text-primary">Rol</label>
            <select {...register('roleID', { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
              {ROLES.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
            </select>
          </div>
        )}
        {target === 'classroom' && (
          <div>
            <label className="block text-sm font-medium text-text-primary">Salón</label>
            <select {...register('classroomID', { valueAsNumber: true })} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
              {classrooms.map(c => <option key={c.classroomID} value={c.classroomID}>{c.name}</option>)}
            </select>
          </div>
        )}
        {target === 'user' && (
          <div>
            <label className="block text-sm font-medium text-text-primary">Usuario</label>
            <input type="text" placeholder="Buscar usuario..." onChange={e => setUserSearch(e.target.value)} className="mb-2 mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
            <select {...register('userID', { valueAsNumber: true })} className="block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent">
              <option value="">Seleccione un usuario...</option>
              {filteredUsers.map(u => <option key={u.userID} value={u.userID}>{u.userName}</option>)}
            </select>
          </div>
        )}

        {typeSelect !== 'custom' && (
             <div className="space-y-4 p-4 border rounded-md bg-background">
                {(typeSelect === 'cobro_general' || typeSelect === 'cobro_individual') && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Mes</label>
                            <input {...register('tplMes')} placeholder="Ej. Septiembre" className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Concepto</label>
                            <input {...register('tplConcepto')} placeholder="Ej. cuota escolar" className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Monto</label>
                            <input type="number" step="0.01" {...register('tplAmount')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Vence</label>
                            <input type="date" {...register('tplDueDate')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                    </div>
                )}
                 {typeSelect === 'reunion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Fecha</label>
                            <input type="date" {...register('tplMeetingDate')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Hora</label>
                            <input type="time" {...register('tplMeetingTime')} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-primary">Lugar</label>
                            <input {...register('tplLocation')} placeholder="Sala/Auditorio" className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-primary">Tema</label>
                            <input {...register('tplTopic')} placeholder="Asuntos a tratar" className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md" />
                        </div>
                    </div>
                 )}
                <div className="flex items-center">
                    <input type="checkbox" {...register('autoRefresh')} id="autoRefresh" className="h-4 w-4 rounded border-border text-primary focus:ring-accent"/>
                    <label htmlFor="autoRefresh" className="ml-2 block text-sm text-text-primary">Actualizar título y contenido automáticamente</label>
                </div>
            </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-text-primary">Título</label>
          <input {...register('title', { required: true })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" />
          {errors.title && <p className="text-danger text-xs mt-1">El título es requerido</p>}
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-text-primary">Contenido</label>
          <textarea {...register('content', { required: true })} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent" rows={6}></textarea>
          <button
                type="button"
                onClick={handleAiImproveContent}
                disabled={isImproving}
                className="absolute top-8 right-2 text-primary hover:text-accent bg-background rounded-full p-1 border border-border shadow-sm transition-colors"
                title="Mejorar redacción con IA"
            >
                {isImproving ? <SpinnerIcon className="w-5 h-5 text-accent" /> : <SparklesIcon className="w-5 h-5" />}
            </button>
          {errors.content && <p className="text-danger text-xs mt-1">El contenido es requerido</p>}
        </div>
        
        <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 disabled:bg-secondary transition-colors">
              {loading ? 'Enviando...' : 'Enviar Notificación'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default SendNotificationPage;
