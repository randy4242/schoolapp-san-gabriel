
import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { ROLES, User } from '../../types';
import { SpinnerIcon, UserCheckIcon, XIcon, BlockIcon, PlusIcon, PencilAltIcon, TrashIcon, MaleIcon, FemaleIcon } from '../../components/icons';

// --- TYPES ---

type UserStatus = 'new' | 'duplicate' | 'to_verify';

interface ExtractedUser {
    id: number; // internal UI id
    userName: string;
    cedulaPrefix: string;
    cedulaNumber: string;
    email: string;
    phoneNumber: string;
    roleID: number;
    sexo: 'M' | 'F' | null;
    isValid: boolean;
    creationError?: string;
    isEmailManuallyEdited: boolean;
    duplicateReason?: string;
    status: UserStatus;
    isBeingEdited?: boolean;
    criticalChange?: boolean; 
}

const CEDULA_PREFIXES = ['V', 'E', 'J', 'P', 'G', 'M'];
const MAX_FILES = 10;

// --- SUB-COMPONENTS ---

const UserCard: React.FC<{
    u: ExtractedUser;
    onChange: (id: number, field: keyof ExtractedUser, value: any) => void;
    onBlur: (id: number) => void;
    onRemove: (id: number) => void;
}> = memo(({ u, onChange, onBlur, onRemove }) => {
    let borderColor = 'border-border';
    let bgColor = 'bg-surface';
    let statusIcon = null;

    if (u.creationError) {
        borderColor = 'border-danger';
        bgColor = 'bg-danger-light/10';
    } else if (u.isBeingEdited) {
        borderColor = 'border-warning';
        bgColor = 'bg-warning/10';
        statusIcon = <PencilAltIcon className="w-5 h-5 text-warning-dark animate-pulse" />;
    } else {
        switch (u.status) {
            case 'duplicate':
                borderColor = 'border-danger';
                bgColor = 'bg-danger-light/10';
                statusIcon = <BlockIcon className="w-5 h-5 text-danger" />;
                break;
            case 'to_verify':
                borderColor = 'border-warning';
                bgColor = 'bg-warning/10';
                statusIcon = <span className="text-xl font-bold text-warning-dark">?</span>;
                break;
            case 'new':
                borderColor = u.isValid ? 'border-success' : 'border-border';
                statusIcon = u.isValid ? <UserCheckIcon className="w-5 h-5 text-success" /> : null;
                break;
        }
    }

    return (
        <div className={`p-4 rounded-lg shadow-sm border-2 transition-all relative ${bgColor} ${borderColor}`}>
            <button 
                onClick={() => onRemove(u.id)} 
                className="absolute top-2 right-2 text-text-tertiary hover:text-danger p-1"
                tabIndex={-1}
            >
                <XIcon className="w-5 h-5" />
            </button>

            <div className="absolute top-2 left-2" title={u.isBeingEdited ? "Editando..." : (u.duplicateReason || u.status)}>
                {statusIcon}
            </div>

            <div className="space-y-3 mt-4">
                {u.creationError && (
                    <div className="text-xs bg-danger text-white p-2 rounded">
                        <strong>Error:</strong> {u.creationError}
                    </div>
                )}
                
                {!u.isBeingEdited && u.status === 'duplicate' && u.duplicateReason && (
                    <div className="text-xs bg-danger-light text-danger-text p-2 rounded font-semibold border border-danger">
                        {u.duplicateReason}
                    </div>
                )}

                {(u.isBeingEdited || u.status === 'to_verify') && (
                    <div className="text-xs bg-warning text-black p-1 rounded font-semibold text-center border border-warning">
                        {u.isBeingEdited ? 'Editando...' : 'Editado - Requiere Verificación'}
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase">Nombre Completo</label>
                    <input 
                        type="text" 
                        value={u.userName} 
                        onChange={(e) => onChange(u.id, 'userName', e.target.value)}
                        onBlur={() => onBlur(u.id)}
                        className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary text-sm ${!u.userName.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                        placeholder="Requerido"
                    />
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Prefijo</label>
                        <select 
                            value={u.cedulaPrefix}
                            onChange={(e) => onChange(u.id, 'cedulaPrefix', e.target.value)}
                            onBlur={() => onBlur(u.id)}
                            className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary text-sm"
                        >
                            {CEDULA_PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Nº Cédula</label>
                        <input 
                            type="text" 
                            value={u.cedulaNumber} 
                            onChange={(e) => onChange(u.id, 'cedulaNumber', e.target.value)}
                            onBlur={() => onBlur(u.id)}
                            className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary text-sm ${!u.cedulaNumber.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                            placeholder="Número/Letras"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Sexo</label>
                        <div className="flex items-center gap-2 mt-1">
                            <button 
                                type="button"
                                onClick={() => onChange(u.id, 'sexo', 'M')}
                                className={`p-1 rounded-md transition-colors ${u.sexo === 'M' ? 'bg-info text-white shadow-sm' : 'bg-background text-text-tertiary hover:bg-gray-200'}`}
                                title="Masculino"
                            >
                                <MaleIcon className="w-4 h-4" />
                            </button>
                            <button 
                                type="button"
                                onClick={() => onChange(u.id, 'sexo', 'F')}
                                className={`p-1 rounded-md transition-colors ${u.sexo === 'F' ? 'bg-pink-500 text-white shadow-sm' : 'bg-background text-text-tertiary hover:bg-gray-200'}`}
                                title="Femenino"
                            >
                                <FemaleIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Rol</label>
                        <select 
                            value={u.roleID} 
                            onChange={(e) => onChange(u.id, 'roleID', Number(e.target.value))}
                            onBlur={() => onBlur(u.id)}
                            className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary text-sm"
                        >
                            {ROLES.map(r => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                    <div>
                        <label className="block text-[10px] font-bold text-text-secondary uppercase">Teléfono</label>
                        <input 
                            type="text" 
                            value={u.phoneNumber} 
                            onChange={(e) => onChange(u.id, 'phoneNumber', e.target.value)}
                            onBlur={() => onBlur(u.id)}
                            className="w-full p-1 bg-transparent border-b border-border focus:border-accent focus:outline-none text-text-primary text-sm"
                            placeholder="Opcional"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-bold text-text-secondary uppercase">Email</label>
                    <input 
                        type="email" 
                        value={u.email} 
                        onChange={(e) => onChange(u.id, 'email', e.target.value)}
                        onBlur={() => onBlur(u.id)}
                        className={`w-full p-1 bg-transparent border-b focus:outline-none text-text-primary text-sm ${!u.email.trim() ? 'border-danger' : 'border-border focus:border-accent'}`}
                        placeholder="Requerido"
                    />
                </div>
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---

const BulkUserCreationPage: React.FC = () => {
    const { user: authUser, hasPermission } = useAuth();
    const navigate = useNavigate();
    
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const [inputMode, setInputMode] = useState<'file' | 'text'>('file');
    const [files, setFiles] = useState<File[]>([]);
    const [inputText, setInputText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [extractedUsers, setExtractedUsers] = useState<ExtractedUser[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [creationStatus, setCreationStatus] = useState<{success: number, failed: number} | null>(null);
    
    const [existingDbUsers, setExistingDbUsers] = useState<User[]>([]);
    const [autoGenerateEmail, setAutoGenerateEmail] = useState(true);
    const [useCedulaAsPassword, setUseCedulaAsPassword] = useState(true);
    const [customEmailDomain, setCustomEmailDomain] = useState('schoolapp');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const toVerifySectionRef = useRef<HTMLDivElement>(null);
    const prevToVerifyCountRef = useRef(0);

    const canAccess = useMemo(() => hasPermission([6, 7]), [hasPermission]);

    useEffect(() => {
        if (authUser?.schoolId && canAccess) {
            apiService.getUsers(authUser.schoolId)
                .then(setExistingDbUsers)
                .catch(console.error);
        }
    }, [authUser, canAccess]);

    const toVerifyUsers = useMemo(() => extractedUsers.filter(u => u.status === 'to_verify'), [extractedUsers]);
    const duplicateUsers = useMemo(() => extractedUsers.filter(u => u.status === 'duplicate'), [extractedUsers]);
    const newUsers = useMemo(() => extractedUsers.filter(u => u.status === 'new'), [extractedUsers]);

    useEffect(() => {
        if (toVerifyUsers.length > prevToVerifyCountRef.current) {
            toVerifySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        prevToVerifyCountRef.current = toVerifyUsers.length;
    }, [toVerifyUsers.length]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length + files.length > MAX_FILES) {
            setError(`Límite excedido. Puedes subir máximo ${MAX_FILES} archivos.`);
            return;
        }
        setFiles(prev => [...prev, ...selectedFiles]);
        setError('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const fileToGenerativePart = async (file: File) => {
        const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
        });
        return {
            inlineData: {
                data: await base64EncodedDataPromise,
                mimeType: file.type,
            },
        };
    };

    const readExcelFile = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = e.target?.result;
                    const workbook = XLSX.read(data, { type: 'array' });
                    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]);
                    resolve(`--- ARCHIVO: ${file.name} ---\n${csv}\n`);
                } catch (err) { reject(err); }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    };

    const generateEmailFromData = (name: string, cedulaNumber: string, domain: string): string => {
        if (!name) return '';
        const cleanStr = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z\s]/g, '');
        const stopWords = ['de', 'del', 'la', 'los', 'las'];
        const parts = cleanStr.split(/\s+/).filter(p => p.length > 0 && !stopWords.includes(p));
        if (parts.length === 0) return `usuario@${domain.toLowerCase()}.com`;
        let emailPrefix = "";
        if (parts.length === 1) emailPrefix = parts[0];
        else if (parts.length === 2 || parts.length === 3) emailPrefix = parts[0] + parts[1];
        else emailPrefix = parts[0] + parts[2];
        const cleanCedula = cedulaNumber.replace(/[^0-9]/g, '');
        const lastTwoDigits = cleanCedula.length >= 2 ? cleanCedula.slice(-2) : (cleanCedula || '');
        return `${emailPrefix}${lastTwoDigits}@${domain.toLowerCase()}.com`.toLowerCase();
    };

    const checkValidity = (u: Partial<ExtractedUser>): boolean => {
        return !!((u.userName || '').trim() && (u.cedulaNumber || '').trim() && (u.email || '').trim() && u.sexo);
    };

    const checkForDuplicates = (number: string, email: string): { isDuplicate: boolean, reason?: string } => {
        const cedulaMatch = existingDbUsers.find(db => db.cedula?.replace(/[^0-9]/g, '') === number && number.length > 4);
        if (cedulaMatch) return { isDuplicate: true, reason: `Cédula duplicada (${cedulaMatch.userName})` };
        const emailMatch = existingDbUsers.find(db => db.email.toLowerCase() === email.toLowerCase());
        if (emailMatch) return { isDuplicate: true, reason: `Email duplicado (${emailMatch.userName})` };
        return { isDuplicate: false };
    };

    const analyzeData = async () => {
        if (inputMode === 'file' && files.length === 0) return;
        if (inputMode === 'text' && !inputText.trim()) return;

        setIsAnalyzing(true);
        setError('');

        try {
            const promptParts: any[] = [];
            let promptText = "Extrae una lista de usuarios (Nombre completo, Cédula, Teléfono, Rol). ";
            promptText += "Si la cédula no tiene prefijo, asume 'V'. ";
            promptText += "Devuelve un JSON ARRAY puro.";

            promptParts.push({ text: promptText });

            if (inputMode === 'file') {
                for (const f of files) {
                    const ext = f.name.split('.').pop()?.toLowerCase();
                    if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
                        const csv = await readExcelFile(f);
                        promptParts.push({ text: csv });
                    } else {
                        const part = await fileToGenerativePart(f);
                        promptParts.push(part);
                    }
                }
            } else {
                promptParts.push({ text: inputText });
            }

            const response = await geminiService.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptParts,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                userName: { type: Type.STRING },
                                cedula: { type: Type.STRING },
                                email: { type: Type.STRING },
                                phoneNumber: { type: Type.STRING },
                                role: { type: Type.STRING }
                            }
                        }
                    }
                }
            });

            const rawUsers = JSON.parse(response.text || '[]');
            const sanitize = (val: any) => (val === null || val === undefined || String(val).toLowerCase() === 'null') ? '' : String(val).trim();

            const processed = rawUsers.map((u: any, index: number) => {
                const sName = sanitize(u.userName);
                const sCedula = sanitize(u.cedula);
                const sEmail = sanitize(u.email).toLowerCase();
                const sPhone = sanitize(u.phoneNumber);
                const sRole = sanitize(u.role).toLowerCase();

                const { prefix, number } = parseCedula(sCedula);
                let email = sEmail;
                const isEmailManuallyEdited = !!email;
                
                if (!email && autoGenerateEmail) {
                    email = generateEmailFromData(sName, number, customEmailDomain);
                }
                
                const dupCheck = checkForDuplicates(number, email);
                const roleID = sRole.includes('profesor') ? 2 : sRole.includes('padre') || sRole.includes('representante') ? 3 : 1;

                const userObj: ExtractedUser = {
                    id: Date.now() + index,
                    userName: sName,
                    cedulaPrefix: prefix,
                    cedulaNumber: number,
                    email,
                    phoneNumber: sPhone,
                    roleID,
                    sexo: null, // IA no predice, usuario elige manualmente
                    isValid: false,
                    isEmailManuallyEdited,
                    duplicateReason: dupCheck.reason,
                    status: dupCheck.isDuplicate ? 'duplicate' : 'new',
                    isBeingEdited: false
                };
                return { ...userObj, isValid: checkValidity(userObj) };
            });

            setExtractedUsers(processed);
            setStep('review');
        } catch (err) {
            setError("Error al procesar. Verifique los archivos e intente nuevamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const parseCedula = (raw: string) => {
        const clean = (raw || '').toUpperCase().trim();
        const match = clean.match(/^([VEJPGM])[- ]?(\d+)$/);
        if (match) return { prefix: match[1], number: match[2] };
        return { prefix: 'V', number: clean.replace(/[^0-9]/g, '') };
    };

    const handleUserChange = (id: number, field: keyof ExtractedUser, value: any) => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.id !== id) return u;
            let updated = { ...u, [field]: value, isBeingEdited: true };
            if (field === 'email' || field === 'cedulaNumber' || field === 'cedulaPrefix') updated.criticalChange = true;
            if (field === 'email') updated.isEmailManuallyEdited = true;
            else if (autoGenerateEmail && !updated.isEmailManuallyEdited && (field === 'userName' || field === 'cedulaNumber')) {
                updated.email = generateEmailFromData(updated.userName, updated.cedulaNumber, customEmailDomain);
            }
            updated.isValid = checkValidity(updated);
            return updated;
        }));
    };

    const handleUserBlur = (id: number) => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.id === id) {
                const newStatus = u.criticalChange ? 'to_verify' : u.status;
                return { ...u, isBeingEdited: false, status: newStatus, criticalChange: false };
            }
            return u;
        }));
    };

    const removeUser = (id: number) => setExtractedUsers(prev => prev.filter(u => u.id !== id));

    const verifyPending = () => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.status !== 'to_verify') return u;
            const check = checkForDuplicates(u.cedulaNumber, u.email);
            return { ...u, status: check.isDuplicate ? 'duplicate' : 'new', duplicateReason: check.reason };
        }));
    };

    const handleBulkCreate = async () => {
        if (!authUser?.schoolId) return;
        const toCreate = extractedUsers.filter(u => u.isValid && u.status === 'new');
        if (toCreate.length === 0) return;

        setIsCreating(true);
        let successCount = 0;
        let failedCount = 0;
        const remaining = [...extractedUsers];

        for (const u of toCreate) {
            try {
                await apiService.createUser({
                    userName: u.userName,
                    cedula: `${u.cedulaPrefix}-${u.cedulaNumber}`,
                    email: u.email,
                    phoneNumber: u.phoneNumber,
                    roleID: u.roleID,
                    sexo: u.sexo, 
                    schoolID: authUser.schoolId,
                    passwordHash: useCedulaAsPassword ? u.cedulaNumber : "123456"
                });
                successCount++;
                const idx = remaining.findIndex(r => r.id === u.id);
                if (idx !== -1) remaining.splice(idx, 1);
            } catch (err: any) {
                failedCount++;
                const idx = remaining.findIndex(r => r.id === u.id);
                if (idx !== -1) remaining[idx] = { ...remaining[idx], creationError: err.message, isValid: false };
            }
        }

        setExtractedUsers(remaining);
        setCreationStatus({ success: successCount, failed: failedCount });
        setIsCreating(false);
        if (failedCount === 0 && remaining.length === 0) setTimeout(() => navigate('/users'), 1500);
        else apiService.getUsers(authUser.schoolId).then(setExistingDbUsers);
    };

    const applyNameFormat = (format: 'uppercase' | 'lowercase' | 'capitalize') => {
        setExtractedUsers(prev => prev.map(u => {
            let newName = u.userName;
            if (format === 'uppercase') newName = u.userName.toUpperCase();
            if (format === 'lowercase') newName = u.userName.toLowerCase();
            if (format === 'capitalize') newName = u.userName.toLowerCase().replace(/(?:^|\s)\S/g, l => l.toUpperCase());
            let updated = { ...u, userName: newName };
            if (autoGenerateEmail && !updated.isEmailManuallyEdited) {
                updated.email = generateEmailFromData(updated.userName, updated.cedulaNumber, customEmailDomain);
            }
            updated.isValid = checkValidity(updated);
            return updated;
        }));
    };

    const applyGlobalRole = (roleId: number) => {
        setExtractedUsers(prev => prev.map(u => ({ ...u, roleID: roleId, isValid: checkValidity({...u, roleID: roleId}) })));
    };

    useEffect(() => {
        if (extractedUsers.length === 0) return;
        const timer = setTimeout(() => {
            setExtractedUsers(prev => prev.map(u => {
                if (u.isEmailManuallyEdited) return u;
                if (autoGenerateEmail) {
                    const newEmail = generateEmailFromData(u.userName, u.cedulaNumber, customEmailDomain);
                    if (newEmail !== u.email) {
                        const updatedUser = { ...u, email: newEmail };
                        updatedUser.isValid = checkValidity(updatedUser);
                        return updatedUser;
                    }
                }
                return u;
            }));
        }, 300);
        return () => clearTimeout(timer);
    }, [customEmailDomain, autoGenerateEmail, extractedUsers.length]); 
    
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-text-primary mb-6">Crear Usuarios Masivamente con IA</h1>

            {step === 'upload' ? (
                <div className="max-w-xl mx-auto bg-surface p-8 rounded-lg shadow-md">
                    <div className="flex border-b border-border mb-6">
                        <button className={`flex-1 py-2 text-center font-medium ${inputMode === 'file' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`} onClick={() => setInputMode('file')}>Archivos</button>
                        <button className={`flex-1 py-2 text-center font-medium ${inputMode === 'text' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary'}`} onClick={() => setInputMode('text')}>Texto</button>
                    </div>

                    {inputMode === 'file' ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-primary/50 rounded-lg p-10 cursor-pointer hover:bg-background transition-colors text-center" onClick={() => fileInputRef.current?.click()}>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,application/pdf,.xlsx,.xls,.csv" onChange={handleFileChange} />
                                <div className="text-text-tertiary">
                                    <span className="block text-4xl mb-2">📂</span>
                                    {files.length === 0 ? "Haz clic para seleccionar hasta 10 archivos" : `${files.length} archivos seleccionados`}
                                </div>
                            </div>
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-bold text-text-secondary uppercase">
                                        <span>Archivos ({files.length} / {MAX_FILES})</span>
                                        <button onClick={() => setFiles([])} className="text-danger hover:underline">Limpiar todo</button>
                                    </div>
                                    <ul className="max-h-40 overflow-y-auto border border-border rounded p-2 bg-background space-y-1">
                                        {files.map((f, i) => (
                                            <li key={i} className="flex justify-between items-center text-sm p-1 hover:bg-surface rounded">
                                                <span className="truncate flex-1 mr-2">{f.name}</span>
                                                <button onClick={() => removeFile(i)} className="text-text-tertiary hover:text-danger"><TrashIcon className="w-4 h-4"/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <textarea className="w-full p-4 border border-border rounded-md bg-background h-60 text-sm" placeholder="Pega aquí la lista de usuarios..." value={inputText} onChange={e => setInputText(e.target.value)} />
                    )}
                    {error && <p className="text-danger my-4 text-center">{error}</p>}
                    <button onClick={analyzeData} disabled={isAnalyzing || (inputMode === 'file' ? files.length === 0 : !inputText.trim())} className="w-full mt-6 bg-primary text-text-on-primary py-3 rounded-lg font-bold hover:bg-opacity-90 disabled:bg-secondary flex justify-center items-center">
                        {isAnalyzing ? <><SpinnerIcon className="mr-2" /> Analizando...</> : "Analizar con IA"}
                    </button>
                </div>
            ) : (
                <div>
                    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border mb-6 flex flex-col gap-4">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-4 items-center">
                                <label className="flex items-center text-sm"><input type="checkbox" checked={autoGenerateEmail} onChange={e => setAutoGenerateEmail(e.target.checked)} className="mr-2"/> Autogenerar Email</label>
                                {autoGenerateEmail && <div className="flex items-center text-sm font-medium">@ <input type="text" value={customEmailDomain} onChange={e => setCustomEmailDomain(e.target.value)} className="mx-1 p-1 border rounded w-24"/> .com</div>}
                                <label className="flex items-center text-sm"><input type="checkbox" checked={useCedulaAsPassword} onChange={e => setUseCedulaAsPassword(e.target.checked)} className="mr-2"/> Cédula como Password</label>
                            </div>
                            <button onClick={() => { setExtractedUsers([]); setStep('upload'); setFiles([]); setInputText(''); }} className="text-sm text-text-secondary hover:text-danger">Atrás / Reiniciar</button>
                        </div>
                        <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-border">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-text-secondary uppercase">Asignar Rol:</span>
                                <select onChange={(e) => applyGlobalRole(Number(e.target.value))} className="p-1 border rounded text-sm bg-background">
                                    <option value="">-- Seleccionar --</option>
                                    {ROLES.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-text-secondary uppercase">Nombres:</span>
                                <button onClick={() => applyNameFormat('uppercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="MAYÚSCULAS">AA</button>
                                <button onClick={() => applyNameFormat('lowercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="minúsculas">aa</button>
                                <button onClick={() => applyNameFormat('capitalize')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="Nombre Propio">Aa</button>
                            </div>
                            <button onClick={() => setExtractedUsers([ { id: Date.now(), userName: '', cedulaPrefix: 'V', cedulaNumber: '', email: '', phoneNumber: '', roleID: 1, sexo: null, isValid: false, isEmailManuallyEdited: false, status: 'new' }, ...extractedUsers])} className="bg-primary text-text-on-primary px-3 py-1 rounded text-sm flex items-center gap-1">
                                <PlusIcon className="w-4 h-4"/> Manual
                            </button>
                        </div>
                    </div>
                    {creationStatus && <div className="mb-4 p-3 bg-success-light text-success-text rounded text-center font-bold">Resumen: {creationStatus.success} creados, {creationStatus.failed} fallidos.</div>}
                    <div className="space-y-8">
                        {duplicateUsers.length > 0 && (
                            <section>
                                <h3 className="text-lg font-bold text-danger mb-2 border-b border-danger pb-1">Duplicados en Sistema ({duplicateUsers.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {duplicateUsers.map(u => <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />)}
                                </div>
                            </section>
                        )}
                        {toVerifyUsers.length > 0 && (
                            <section ref={toVerifySectionRef}>
                                <div className="flex justify-between items-center mb-2 border-b border-warning pb-1">
                                    <h3 className="text-lg font-bold text-warning-dark">Por Verificar ({toVerifyUsers.length})</h3>
                                    <button onClick={verifyPending} className="bg-warning text-black px-3 py-1 rounded text-xs font-bold shadow-sm">Validar Cambios</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {toVerifyUsers.map(u => <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />)}
                                </div>
                            </section>
                        )}
                        <section className="mb-24">
                            <h3 className="text-lg font-bold text-success-text mb-2 border-b border-success pb-1">Nuevos Usuarios ({newUsers.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {newUsers.map(u => <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />)}
                            </div>
                        </section>
                    </div>
                    <div className="fixed bottom-0 left-0 right-0 bg-surface p-4 shadow-lg border-t border-border flex justify-end items-center gap-4 z-40 md:pl-64">
                        <button onClick={handleBulkCreate} disabled={isCreating || newUsers.filter(u => u.isValid).length === 0} className="bg-success text-text-on-primary py-3 px-8 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary shadow-md flex items-center">
                            {isCreating ? <><SpinnerIcon className="mr-2"/> Procesando...</> : `Crear ${newUsers.filter(u => u.isValid).length} Usuarios`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUserCreationPage;
