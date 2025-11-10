import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { User } from '../../types';

type TemplateKey = 'estudios' | 'conducta' | 'retiro' | 'custom';

type FormInputs = {
    userId: number;
    certificateType: string;
    signatoryName: string;
    signatoryTitle: string;
    content: string;
};

const CertificateFormPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormInputs>({
        defaultValues: {
            signatoryName: "PEDRO ÁNGEL MENDOZA CARRILLO",
            signatoryTitle: "Director(a)"
        }
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [students, setStudents] = useState<User[]>([]);
    
    // Template state
    const [template, setTemplate] = useState<TemplateKey>('estudios');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [templateFields, setTemplateFields] = useState<Record<string, string>>({});
    
    const selectedUserId = watch('userId');
    const formContent = watch('content');

    useEffect(() => {
        if (user?.schoolId) {
            apiService.getStudents(user.schoolId).then(setStudents).catch(() => setError("No se pudo cargar la lista de estudiantes."));
            const today = new Date().toISOString().substring(0, 10);
            setTemplateFields(prev => ({ ...prev, fldFechaEmision: today, fldFechaRetiro: today }));
        }
    }, [user]);

    const filteredStudents = useMemo(() => {
        if (!userSearch) return students;
        return students.filter(s => 
            s.userName.toLowerCase().includes(userSearch.toLowerCase()) || 
            (s.cedula && s.cedula.includes(userSearch))
        );
    }, [students, userSearch]);

    const applyTemplate = useCallback(() => {
        if (!autoRefresh) return;

        const selectedStudent = students.find(s => s.userID === Number(selectedUserId));
        const studentName = selectedStudent?.userName.toUpperCase() || "[NOMBRE DEL ESTUDIANTE]";
        const {
            signatoryName = "MENDOZA CARRILLO, PEDRO ÁNGEL",
            signatoryTitle = "Director(a)",
            fldCiudad = "NAGUANAGUA",
            fldFechaEmision,
            fldCodigoPlantel = "S1934D0810",
            fldPlantel = "UNIDAD EDUCATIVA CAMORUCO",
            fldGrado = "1er año de EDUCACIÓN MEDIA GENERAL",
            fldPeriodo = "2025/2026",
            fldGradoCond = "1er de EDUCACIÓN MEDIA GENERAL",
            fldPeriodoCond = "2025/2026",
            fldConducta = "BUENA CONDUCTA",
            fldFechaRetiro,
        } = templateFields;

        const longDate = (isoDate?: string) => {
            if (!isoDate) return "[FECHA]";
            const d = new Date(isoDate + 'T00:00:00');
            return d.toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        
        const fechaEmisionStr = longDate(fldFechaEmision);

        let content = "";
        let certType = "Personalizada";

        switch (template) {
            case 'estudios':
                certType = "Constancia de Estudios";
                content = `El suscrito Director(a) del plantel ${fldPlantel}, Código Plantel ${fldCodigoPlantel}, hace constar por medio de la presente que el/la estudiante ${studentName}, cursa ${fldGrado} en esta institución durante el año escolar ${fldPeriodo}.\n\nConstancia que se expide a petición de la parte interesada el ${fechaEmisionStr}.\n\n${signatoryName}\n${signatoryTitle}`;
                break;
            case 'conducta':
                certType = "Carta de Buena Conducta";
                content = `Quien suscribe, Director(a) de ${fldCodigoPlantel}, hace constar que el/la estudiante ${studentName} cursó en este plantel ${fldGradoCond} en el año escolar ${fldPeriodoCond} y durante su permanencia observó ${fldConducta}.\n\nConstancia que se expide a petición del interesado, ${fldCiudad}, el ${fechaEmisionStr}.\n\n${signatoryName}\n${signatoryTitle}`;
                break;
            case 'retiro':
                certType = "Constancia de Retiro";
                const fechaRetiroStr = longDate(fldFechaRetiro);
                content = `Quien suscribe, ${signatoryName}, ${signatoryTitle} de ${fldPlantel}, hace constar por medio de la presente que el/la estudiante ${studentName}, fue retirado(a) voluntariamente por su representante de esta institución el día ${fechaRetiroStr}.\n\nConstancia que se expide a petición del interesado, ${fldCiudad}, el ${fechaEmisionStr}.\n\n${signatoryName}\n${signatoryTitle}`;
                break;
        }

        if (template !== 'custom') {
            setValue('content', content);
        }
        setValue('certificateType', certType);
    }, [autoRefresh, template, selectedUserId, students, setValue, templateFields]);

    useEffect(() => {
        applyTemplate();
    }, [applyTemplate]);

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setTemplateFields(prev => ({...prev, [id]: value }));
    }

    const onSubmit: SubmitHandler<FormInputs> = async (data) => {
        if (!user?.schoolId) {
            setError("No se ha podido identificar el colegio.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            await apiService.createCertificate({ ...data, schoolId: user.schoolId });
            navigate('/certificates');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error al guardar la constancia.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="max-w-3xl mx-auto bg-surface p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Generar Constancia</h1>

            {error && <p className="bg-danger-light text-danger-text p-3 rounded mb-4">{error}</p>}
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <input type="hidden" {...register('certificateType')} />
                
                <div>
                    <label className="block text-sm font-medium text-text-primary">Plantilla de Constancia:</label>
                    <select value={template} onChange={e => setTemplate(e.target.value as TemplateKey)} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md shadow-sm">
                        <option value="estudios">Constancia de Estudios</option>
                        <option value="conducta">Carta de Buena Conducta</option>
                        <option value="retiro">Constancia de Retiro</option>
                        <option value="custom">Personalizada (escribir texto libre)</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-primary">Buscar Estudiante:</label>
                    <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" placeholder="Escribe un nombre o cédula..." />
                    <select {...register('userId', { required: 'Debe seleccionar un estudiante', valueAsNumber: true })} className="mt-2 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md">
                        <option value="">Seleccione un estudiante...</option>
                        {filteredStudents.map(s => <option key={s.userID} value={s.userID}>{s.userName} (C.I: {s.cedula})</option>)}
                    </select>
                    {errors.userId && <p className="text-danger text-xs mt-1">{errors.userId.message}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Nombre del Firmante</label>
                        <input {...register('signatoryName', { required: true })} onChange={handleFieldChange} id="signatoryName" className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-text-primary">Cargo del Firmante</label>
                        <input {...register('signatoryTitle', { required: true })} onChange={handleFieldChange} id="signatoryTitle" className="mt-1 block w-full px-3 py-2 border border-border bg-surface text-text-primary rounded-md" />
                    </div>
                </div>

                {/* Dynamic Fields */}
                <div className="space-y-4 p-4 border rounded-md bg-background">
                    <div className={`grid-cols-1 md:grid-cols-2 gap-4 ${template === 'estudios' ? 'grid' : 'hidden'}`}>
                        <div><label className="text-sm">Grado/Año</label><input onChange={handleFieldChange} id="fldGrado" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. 1er año..." /></div>
                        <div><label className="text-sm">Año Escolar</label><input onChange={handleFieldChange} id="fldPeriodo" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. 2025/2026" /></div>
                    </div>
                     <div className={`grid-cols-1 md:grid-cols-2 gap-4 ${template === 'conducta' ? 'grid' : 'hidden'}`}>
                        <div><label className="text-sm">Grado/Año cursado</label><input onChange={handleFieldChange} id="fldGradoCond" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. 1er año..." /></div>
                        <div><label className="text-sm">Año Escolar</label><input onChange={handleFieldChange} id="fldPeriodoCond" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. 2025/2026" /></div>
                        <div><label className="text-sm">Conducta</label><input onChange={handleFieldChange} id="fldConducta" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. BUENA CONDUCTA" /></div>
                    </div>
                    <div className={`grid-cols-1 md:grid-cols-2 gap-4 ${template === 'retiro' ? 'grid' : 'hidden'}`}>
                         <div><label className="text-sm">Fecha de Retiro</label><input type="date" value={templateFields.fldFechaRetiro || ''} onChange={handleFieldChange} id="fldFechaRetiro" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" /></div>
                    </div>
                     <div className={`grid-cols-1 md:grid-cols-2 gap-4 ${template !== 'custom' ? 'grid' : 'hidden'}`}>
                        <div><label className="text-sm">Ciudad firma</label><input onChange={handleFieldChange} id="fldCiudad" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. NAGUANAGUA" /></div>
                        <div><label className="text-sm">Fecha de emisión</label><input type="date" value={templateFields.fldFechaEmision || ''} onChange={handleFieldChange} id="fldFechaEmision" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" /></div>
                        <div><label className="text-sm">Código Plantel</label><input onChange={handleFieldChange} id="fldCodigoPlantel" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. S1934D0810" /></div>
                        <div><label className="text-sm">Nombre Plantel</label><input onChange={handleFieldChange} id="fldPlantel" className="w-full p-1 border border-border bg-surface text-text-primary rounded text-sm" placeholder="Ej. UNIDAD EDUCATIVA CAMORUCO" /></div>
                    </div>
                    <div className="flex items-center">
                        <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} id="autoRefresh" className="h-4 w-4 rounded border-border text-primary" />
                        <label htmlFor="autoRefresh" className="ml-2 text-sm">Actualizar contenido automáticamente</label>
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-text-primary">Contenido de la Constancia (Editable):</label>
                    <textarea {...register('content', { required: 'El contenido es obligatorio' })} rows={8} className="mt-1 block w-full px-3 py-2 bg-surface text-text-primary border border-border rounded-md shadow-sm"></textarea>
                    {errors.content && <p className="text-danger text-xs mt-1">{errors.content.message}</p>}
                </div>
                
                <div className="flex justify-end space-x-4 pt-4">
                    <Link to="/certificates" className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border">Cancelar</Link>
                    <button type="submit" disabled={loading} className="bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-primary/90 disabled:bg-secondary">
                        {loading ? 'Generando...' : 'Generar y Guardar'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CertificateFormPage;