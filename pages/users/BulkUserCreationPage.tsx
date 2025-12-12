
import React, { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Type } from "@google/genai";
import * as XLSX from 'xlsx';
import { useAuth } from '../../hooks/useAuth';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { ROLES, User } from '../../types';
import { SpinnerIcon, UserCheckIcon, XIcon, BlockIcon, PlusIcon, PencilAltIcon } from '../../components/icons';

// --- TYPES ---

type UserStatus = 'new' | 'duplicate' | 'to_verify';

interface ExtractedUser {
    id: number; // internal UI id
    userName: string;
    cedulaPrefix: string; // New: V, E, P, etc.
    cedulaNumber: string; // New: Numbers + Letters allowed
    email: string;
    phoneNumber: string;
    roleID: number;
    isValid: boolean;
    creationError?: string; // To store backend errors per user
    isEmailManuallyEdited: boolean; // To track if the email was touched by the user
    duplicateReason?: string; // New: "Cedula exists" or "Email exists"
    status: UserStatus;
    isBeingEdited?: boolean; // New: To track active typing state without moving lists
}

const CEDULA_PREFIXES = ['V', 'E', 'J', 'P', 'G', 'M'];

// --- SUB-COMPONENTS (Defined OUTSIDE to prevent re-renders/focus loss) ---

interface UserCardProps {
    u: ExtractedUser;
    onChange: (id: number, field: keyof ExtractedUser, value: any) => void;
    onBlur: (id: number) => void;
    onRemove: (id: number) => void;
}

const UserCard: React.FC<UserCardProps> = memo(({ u, onChange, onBlur, onRemove }) => {
    // Determine visual style based on status
    let borderColor = 'border-border';
    let bgColor = 'bg-surface';
    let statusIcon = null;

    if (u.creationError) {
        borderColor = 'border-danger';
        bgColor = 'bg-danger-light/10';
    } else if (u.isBeingEdited) {
        // Visual state while typing: Yellow (To Verify style) but keeps focus
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
                bgColor = u.isValid ? 'bg-surface' : 'bg-surface';
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

            {/* Status Indicator */}
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
    const [file, setFile] = useState<File | null>(null);
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [extractedUsers, setExtractedUsers] = useState<ExtractedUser[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [creationStatus, setCreationStatus] = useState<{success: number, failed: number} | null>(null);
    const [isExcel, setIsExcel] = useState(false);
    const [isBackConfirmOpen, setIsBackConfirmOpen] = useState(false);
    
    // Existing DB Data for comparison
    const [existingDbUsers, setExistingDbUsers] = useState<User[]>([]);

    // Configuration Options
    const [autoGenerateEmail, setAutoGenerateEmail] = useState(true);
    const [useCedulaAsPassword, setUseCedulaAsPassword] = useState(true);
    const [customEmailDomain, setCustomEmailDomain] = useState('schoolapp');

    // Refs
    const fileInputRef = useRef<HTMLInputElement>(null);
    const toVerifySectionRef = useRef<HTMLDivElement>(null);
    const prevToVerifyCountRef = useRef(0);

    const canAccess = useMemo(() => {
        return hasPermission([6, 7]);
    }, [hasPermission]);

    // Categorized Users (Moved up for useEffect usage)
    const duplicateUsers = extractedUsers.filter(u => u.status === 'duplicate');
    const toVerifyUsers = extractedUsers.filter(u => u.status === 'to_verify');
    const newUsers = extractedUsers.filter(u => u.status === 'new');
    const hasInvalidNewUsers = newUsers.some(u => !u.isValid || u.creationError);

    // Fetch existing users on mount to check for duplicates later
    useEffect(() => {
        if (authUser?.schoolId && canAccess) {
            apiService.getUsers(authUser.schoolId)
                .then(setExistingDbUsers)
                .catch(console.error);
        }
    }, [authUser, canAccess]);

    // Auto-scroll effect: When items move to "To Verify", scroll to that section
    useEffect(() => {
        if (toVerifyUsers.length > prevToVerifyCountRef.current) {
            // Only scroll if the count INCREASED (meaning an item was moved here)
            toVerifySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        prevToVerifyCountRef.current = toVerifyUsers.length;
    }, [toVerifyUsers.length]);

    if (!authUser) {
        return <div>Cargando...</div>;
    }

    if (!canAccess) {
        return (
            <div className="text-center p-8 bg-surface rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-danger">Acceso Denegado</h1>
                <p className="text-secondary mt-2">Esta funcionalidad solo está disponible para usuarios con rol de Administrador o Super Admin.</p>
                <Link to="/dashboard" className="mt-4 inline-block bg-primary text-text-on-primary py-2 px-4 rounded hover:bg-opacity-80 transition-colors">
                    Volver al Inicio
                </Link>
            </div>
        );
    }


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            
            const fileType = selectedFile.name.split('.').pop()?.toLowerCase();
            if (['xls', 'xlsx', 'csv'].includes(fileType || '')) {
                setIsExcel(true);
                setImagePreview(null);
            } else if (selectedFile.type.startsWith('image/')) {
                setIsExcel(false);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(selectedFile);
            } else {
                setIsExcel(false);
                setImagePreview(null);
            }
        }
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
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const csv = XLSX.utils.sheet_to_csv(worksheet);
                    resolve(csv);
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    };

    // --- Helper logic ---
    const generateEmailFromData = (name: string, cedulaNumber: string, domain: string): string => {
        if (!name || !cedulaNumber) return '';
        
        const cleanName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase().replace(/[^a-z\s]/g, '');
        const parts = cleanName.split(/\s+/);
        const firstName = parts[0] || 'usuario';
        const lastName = parts.length > 1 ? parts[1] : '';
        
        const cleanCedula = cedulaNumber.replace(/[^0-9]/g, '');
        const lastTwoDigits = cleanCedula.length >= 2 ? cleanCedula.slice(-2) : '00';
        
        return `${firstName}${lastName}${lastTwoDigits}@${domain}.com`;
    };
    
    const checkValidity = (u: Partial<ExtractedUser>): boolean => {
        return !!((u.userName || '').trim() && (u.cedulaNumber || '').trim() && (u.email || '').trim());
    };

    const checkForDuplicates = (number: string, email: string): { isDuplicate: boolean, reason?: string } => {
        // Check Cedula
        const cedulaMatch = existingDbUsers.find(dbUser => {
            if (!dbUser.cedula) return false;
            // Normalize DB cedula to just numbers for comparison
            const dbNums = dbUser.cedula.replace(/[^0-9]/g, '');
            return dbNums === number && number.length > 4; // Ensure we don't match small false positives
        });

        if (cedulaMatch) return { isDuplicate: true, reason: `Cédula ya registrada (${cedulaMatch.userName})` };

        // Check Email
        const emailMatch = existingDbUsers.find(dbUser => dbUser.email.toLowerCase() === email.toLowerCase());
        if (emailMatch) return { isDuplicate: true, reason: `Email ya registrado (${emailMatch.userName})` };

        return { isDuplicate: false };
    };

    // Name formatting helpers
    const toTitleCase = (str: string) => {
        return str.toLowerCase().replace(/(?:^|\s|['"([{])+\S/g, (match) => match.toUpperCase());
    };

    const applyNameFormat = (format: 'uppercase' | 'lowercase' | 'capitalize') => {
        setExtractedUsers(prev => prev.map(u => {
            let newName = u.userName;
            if (format === 'uppercase') newName = u.userName.toUpperCase();
            if (format === 'lowercase') newName = u.userName.toLowerCase();
            if (format === 'capitalize') newName = toTitleCase(u.userName);
            
            // Check if email needs update after name change
            let newEmail = u.email;
            if (autoGenerateEmail && !u.isEmailManuallyEdited) {
                newEmail = generateEmailFromData(newName, u.cedulaNumber, customEmailDomain);
            }
            
            // If the user was already a duplicate, moving them to verify happens on change now,
            // but for bulk actions we might want to keep status or reset. 
            // Let's assume bulk actions are intentional fixes.
            const status = u.status === 'duplicate' ? 'to_verify' : u.status;

            return { 
                ...u, 
                userName: newName, 
                email: newEmail, 
                isValid: checkValidity({ ...u, userName: newName, email: newEmail }),
                status: status
            };
        }));
    };

    const applyGlobalRole = (roleIdStr: string) => {
        const roleId = Number(roleIdStr);
        if (!roleId) return;
        setExtractedUsers(prev => prev.map(u => ({ ...u, roleID: roleId })));
    };

    // Effect to apply auto-generation when toggled ON or domain changes in review step
    useEffect(() => {
        if (step !== 'review') return;
    
        setExtractedUsers(prev => prev.map(u => {
            let newEmail = u.email;
            let needsUpdate = false;
    
            if (autoGenerateEmail && !u.isEmailManuallyEdited) {
                const potentialNewEmail = generateEmailFromData(u.userName, u.cedulaNumber, customEmailDomain);
                if (potentialNewEmail !== u.email) {
                    newEmail = potentialNewEmail;
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                const status = u.status === 'duplicate' ? 'to_verify' : u.status;
                return { 
                    ...u, 
                    email: newEmail, 
                    isValid: checkValidity({ ...u, email: newEmail }),
                    status: status
                };
            }
            
            return u;
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoGenerateEmail, customEmailDomain, step]);

    const parseCedula = (rawCedula: string): { prefix: string, number: string } => {
        if (!rawCedula) return { prefix: 'V', number: '' };
        
        const clean = rawCedula.toUpperCase().trim();
        
        // Match explicit prefixes like "V-1234", "E 1234", "P1234"
        const match = clean.match(/^([VEJPGM])[- ]?(\d+)$/);
        if (match) {
            return { prefix: match[1], number: match[2] };
        }
        
        // Just numbers? Default to V
        const numsOnly = clean.replace(/[^0-9]/g, '');
        if (numsOnly.length > 0) {
            return { prefix: 'V', number: numsOnly };
        }

        return { prefix: 'V', number: '' };
    };

    const analyzeFile = async () => {
        if (inputMode === 'file' && !file) return;
        if (inputMode === 'text' && !inputText.trim()) {
            setError("Por favor, ingrese el texto a analizar.");
            return;
        }

        setIsAnalyzing(true);
        setError('');

        try {
            const modelId = 'gemini-2.5-flash'; 

            let contentPart: any;
            let promptText = "";

            if (inputMode === 'file' && file) {
                if (isExcel) {
                     const csvData = await readExcelFile(file);
                     contentPart = { text: `Datos extraídos del archivo Excel/CSV:\n${csvData}` };
                     promptText = `Analiza los datos de texto (hoja de cálculo) y extrae usuarios.`;
                } else {
                     contentPart = await fileToGenerativePart(file);
                     promptText = `Analiza este documento visualmente y extrae la lista de personas.`;
                }
            } else {
                // Text Mode
                contentPart = { text: `TEXTO PROPORCIONADO POR EL USUARIO:\n${inputText}` };
                promptText = "Analiza el texto proporcionado y extrae la lista de personas.";
            }

            const prompt = `
                ${promptText}
                Instrucciones CRÍTICAS:
                1. Extrae: Nombre completo (userName), Cédula (cedula), Teléfono (phoneNumber), Rol (role).
                2. **NO INVENTES DATOS.** Si un campo (email, cédula, teléfono) no aparece explícitamente en el documento, devuélvelo como null o string vacío "".
                3. Si la cédula tiene letra (V, E, P), inclúyela. Si no, devuelve solo el número.
                4. Trata de inferir el rol (Estudiante, Profesor, Representante). Default: "Estudiante".
                
                Devuelve un JSON array puro.
            `;

            const response = await geminiService.generateContent({
                model: modelId,
                contents: [
                    { text: prompt },
                    contentPart
                ],
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

            const jsonText = response.text;
            if (!jsonText) throw new Error("No se pudo obtener respuesta de la IA.");

            const rawUsers = JSON.parse(jsonText);
            
            // Transform to internal state
            const processedUsers: ExtractedUser[] = rawUsers.map((u: any, index: number) => {
                let roleID = 1; // Default Student
                const roleStr = (u.role || '').toLowerCase();
                if (roleStr.includes('profesor') || roleStr.includes('docente')) roleID = 2;
                if (roleStr.includes('representante') || roleStr.includes('padre')) roleID = 3;
                
                // Parse Cedula
                const { prefix, number } = parseCedula(u.cedula || '');

                let email = u.email || '';
                const isEmailManuallyEdited = !!email;

                if (!email && autoGenerateEmail) {
                    email = generateEmailFromData(u.userName, number, customEmailDomain);
                }

                // CHECK FOR DUPLICATES
                const dupCheck = checkForDuplicates(number, email);
                const status: UserStatus = dupCheck.isDuplicate ? 'duplicate' : 'new';

                const userObj: ExtractedUser = {
                    id: Date.now() + index,
                    userName: u.userName || '',
                    cedulaPrefix: prefix,
                    cedulaNumber: number,
                    email: email,
                    phoneNumber: u.phoneNumber || '',
                    roleID: roleID,
                    isValid: false,
                    isEmailManuallyEdited: isEmailManuallyEdited,
                    duplicateReason: dupCheck.reason,
                    status: status,
                    isBeingEdited: false
                };
                
                return { ...userObj, isValid: checkValidity(userObj) };
            });

            setExtractedUsers(processedUsers);
            setStep('review');

        } catch (err: any) {
            console.error("AI Error:", err);
            setError("Ocurrió un error al analizar la información. Intente con datos más claros.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleUserChange = (id: number, field: keyof ExtractedUser, value: any) => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.id === id) {
                // @ts-ignore - dynamic key
                let updatedUser: ExtractedUser = { ...u, [field]: value };
    
                if (updatedUser.creationError) {
                    delete updatedUser.creationError;
                }
                
                // Mark as being edited so it gets visual "To Verify" style but stays in list
                updatedUser.isBeingEdited = true;
    
                if (field === 'email') {
                    updatedUser.isEmailManuallyEdited = true;
                } else if (autoGenerateEmail && (field === 'userName' || field === 'cedulaNumber')) {
                    if (!updatedUser.isEmailManuallyEdited) {
                        updatedUser.email = generateEmailFromData(updatedUser.userName, updatedUser.cedulaNumber, customEmailDomain);
                    }
                }
                
                updatedUser.isValid = checkValidity(updatedUser);
                return updatedUser;
            }
            return u;
        }));
    };

    const handleUserBlur = (id: number) => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.id === id) {
                // When finishing edit, remove edit flag AND move to "to_verify" list
                // This ensures re-rendering happens only when user leaves the field
                return { 
                    ...u, 
                    isBeingEdited: false, 
                    status: 'to_verify', 
                    duplicateReason: undefined // Clear duplications warning since user took action
                };
            }
            return u;
        }));
    };

    const verifyPendingUsers = () => {
        setExtractedUsers(prev => prev.map(u => {
            if (u.status === 'to_verify') {
                const dupCheck = checkForDuplicates(u.cedulaNumber, u.email);
                if (dupCheck.isDuplicate) {
                    return { ...u, status: 'duplicate', duplicateReason: dupCheck.reason };
                } else {
                    return { ...u, status: 'new', duplicateReason: undefined };
                }
            }
            return u;
        }));
    };

    const removeUser = (id: number) => {
        setExtractedUsers(prev => prev.filter(u => u.id !== id));
    };
    
    const addUser = () => {
        const newUser: ExtractedUser = {
            id: Date.now(),
            userName: '',
            cedulaPrefix: 'V',
            cedulaNumber: '',
            email: '',
            phoneNumber: '',
            roleID: 1,
            isValid: false,
            isEmailManuallyEdited: false,
            status: 'new'
        };
        setExtractedUsers([...extractedUsers, newUser]);
    };

    const handleBulkCreate = async () => {
        if (!authUser?.schoolId) return;
        
        // Filter out duplicates and invalid
        const validUsersToCreate = extractedUsers.filter(u => u.isValid && u.status === 'new');
        
        if (validUsersToCreate.length === 0) {
            setError("No hay usuarios nuevos válidos para crear. Verifique los duplicados o pendientes.");
            return;
        }

        setIsCreating(true);
        setError('');
        
        let successCount = 0;
        let failedCount = 0;

        const remainingUsers: ExtractedUser[] = [...extractedUsers];

        for (const u of validUsersToCreate) {
            try {
                const finalCedula = `${u.cedulaPrefix}-${u.cedulaNumber}`;
                const password = useCedulaAsPassword && u.cedulaNumber ? u.cedulaNumber : "123456";

                await apiService.createUser({
                    userName: u.userName,
                    cedula: finalCedula,
                    email: u.email,
                    phoneNumber: u.phoneNumber,
                    roleID: u.roleID,
                    schoolID: authUser.schoolId,
                    passwordHash: password 
                });
                successCount++;
                
                const idx = remainingUsers.findIndex(rem => rem.id === u.id);
                if (idx !== -1) remainingUsers.splice(idx, 1);

            } catch (err: any) {
                console.error(`Failed to create user ${u.userName}`, err);
                failedCount++;
                const idx = remainingUsers.findIndex(rem => rem.id === u.id);
                if (idx !== -1) {
                    remainingUsers[idx] = {
                        ...remainingUsers[idx],
                        creationError: err.message || "Error desconocido.",
                        isValid: false
                    };
                }
            }
        }

        setExtractedUsers(remainingUsers);
        setCreationStatus({ success: successCount, failed: failedCount });
        setIsCreating(false);
        
        if (failedCount === 0 && remainingUsers.length === 0) {
            setTimeout(() => navigate('/users'), 1500);
        } else if (successCount > 0) {
            apiService.getUsers(authUser.schoolId).then(setExistingDbUsers);
        }
    };

    const ExcelIcon = () => (
        <svg className="w-20 h-20 text-success mx-auto mb-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
        </svg>
    );

    return (
        <div className="p-6">
             {isBackConfirmOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" aria-modal="true" role="dialog">
                    <div className="bg-surface p-6 rounded-lg shadow-xl max-w-sm w-full">
                        <h3 className="text-lg font-bold text-text-primary">¿Estás seguro?</h3>
                        <p className="mt-2 text-sm text-text-secondary">
                            Si vuelves atrás, perderás todos los datos extraídos y los cambios que hayas realizado.
                        </p>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button 
                                onClick={() => setIsBackConfirmOpen(false)}
                                className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={() => {
                                    setStep('upload');
                                    setExtractedUsers([]);
                                    setFile(null);
                                    setInputText('');
                                    setImagePreview(null);
                                    setCreationStatus(null);
                                    setError('');
                                    setIsBackConfirmOpen(false);
                                }}
                                className="bg-danger text-text-on-primary py-2 px-4 rounded hover:bg-danger-dark transition-colors">
                                Sí, Volver
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-2xl font-bold text-text-primary mb-6">Crear Usuarios Masivamente con IA</h1>

            {step === 'upload' && (
                <div className="max-w-xl mx-auto bg-surface p-8 rounded-lg shadow-md text-center">
                    <div className="flex border-b border-border mb-6">
                        <button 
                            className={`flex-1 py-2 text-center font-medium text-lg ${inputMode === 'file' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setInputMode('file')}
                        >
                            Subir Archivo
                        </button>
                        <button 
                            className={`flex-1 py-2 text-center font-medium text-lg ${inputMode === 'text' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                            onClick={() => setInputMode('text')}
                        >
                            Pegar Texto
                        </button>
                    </div>

                    <div className="mb-6">
                        {inputMode === 'file' ? (
                            <>
                                <p className="text-text-secondary mb-4 text-center">
                                    Sube una imagen, PDF o archivo Excel (.xls, .xlsx) que contenga una lista de usuarios.
                                </p>
                                <div 
                                    className="border-2 border-dashed border-primary/50 rounded-lg p-10 cursor-pointer hover:bg-background transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*,application/pdf,.xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
                                        onChange={handleFileChange} 
                                    />
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded shadow" />
                                    ) : isExcel ? (
                                        <div>
                                            <ExcelIcon />
                                            <div className="text-primary font-bold">{file?.name}</div>
                                        </div>
                                    ) : file ? (
                                        <div className="text-primary font-bold">{file.name}</div>
                                    ) : (
                                        <div className="text-text-tertiary">
                                            <span className="block text-4xl mb-2">📂</span>
                                            Haz clic para seleccionar un archivo
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-text-secondary mb-4 text-center">
                                    Pega aquí la lista de usuarios (Nombre, Cédula, Email, etc.).
                                </p>
                                <textarea
                                    className="w-full p-4 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 text-sm h-60"
                                    placeholder="Ejemplo:
Juan Perez, V-12345678, juan@example.com, Estudiante
Maria Rodriguez, V-87654321, maria@example.com, Profesor"
                                    value={inputText}
                                    onChange={e => setInputText(e.target.value)}
                                />
                            </>
                        )}
                    </div>

                    {error && <p className="text-danger mb-4">{error}</p>}

                    <button 
                        onClick={analyzeFile} 
                        disabled={(inputMode === 'file' && !file) || (inputMode === 'text' && !inputText) || isAnalyzing}
                        className="w-full bg-primary text-text-on-primary py-3 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary flex justify-center items-center"
                    >
                        {isAnalyzing ? (
                            <>
                                <SpinnerIcon className="mr-2" /> Analizando con IA...
                            </>
                        ) : "Analizar y Extraer Datos"}
                    </button>
                </div>
            )}

            {step === 'review' && (
                <div>
                    {/* Top Toolbar */}
                    <div className="bg-surface p-4 rounded-lg shadow-sm border border-border mb-6 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <label className="flex items-center text-sm"><input type="checkbox" checked={autoGenerateEmail} onChange={e => setAutoGenerateEmail(e.target.checked)} className="mr-2"/> Autogenerar Email</label>
                            {autoGenerateEmail && <div className="flex items-center text-sm font-medium">@ <input type="text" value={customEmailDomain} onChange={e => setCustomEmailDomain(e.target.value)} className="mx-1 p-1 border rounded w-24"/> .com</div>}
                            <label className="flex items-center text-sm"><input type="checkbox" checked={useCedulaAsPassword} onChange={e => setUseCedulaAsPassword(e.target.checked)} className="mr-2"/> Cédula como Password</label>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-text-secondary">Asignar Rol:</span>
                                <select 
                                    className="p-1 border border-border rounded bg-background text-text-primary text-sm"
                                    onChange={(e) => applyGlobalRole(e.target.value)}
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {ROLES.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2 border-l border-border pl-4">
                                <span className="text-sm font-bold text-text-secondary">Nombres:</span>
                                <button onClick={() => applyNameFormat('uppercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="MAYÚSCULAS">AA</button>
                                <button onClick={() => applyNameFormat('lowercase')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="minúsculas">aa</button>
                                <button onClick={() => applyNameFormat('capitalize')} className="px-2 py-1 bg-background border border-border rounded text-xs hover:bg-border" title="Nombre Propio">Aa</button>
                            </div>
                            <button onClick={addUser} className="bg-info text-white px-3 py-2 rounded hover:bg-info-dark flex items-center text-sm ml-4"><PlusIcon className="w-4 h-4 mr-1"/> Manual</button>
                        </div>
                    </div>

                    {creationStatus && (
                        <div className={`mb-4 p-4 rounded text-center ${creationStatus.failed === 0 ? 'bg-success-light text-success-text' : 'bg-warning/20 text-warning-dark'}`}>
                            Resultado: {creationStatus.success} creados correctamente. {creationStatus.failed} fallidos.
                        </div>
                    )}
                    
                    {error && <div className="mb-4 bg-danger-light text-danger p-3 rounded text-center font-bold">{error}</div>}

                    {/* SECCION 1: DUPLICADOS */}
                    {duplicateUsers.length > 0 && (
                        <div className="mb-8 border border-danger rounded-lg overflow-hidden">
                            <div className="bg-danger text-white p-2 font-bold flex justify-between items-center">
                                <span>1. Duplicados Detectados ({duplicateUsers.length})</span>
                                <span className="text-xs font-normal opacity-90">Edite los campos para corregir y mover a "Por Verificar"</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-danger-light/10">
                                {duplicateUsers.map(u => (
                                    <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECCION 2: POR VERIFICAR (Editados) */}
                    {toVerifyUsers.length > 0 && (
                        <div ref={toVerifySectionRef} className="mb-8 border border-warning rounded-lg overflow-hidden">
                            <div className="bg-warning text-black p-2 font-bold flex justify-between items-center">
                                <span>2. Por Verificar ({toVerifyUsers.length})</span>
                                <button onClick={verifyPendingUsers} className="bg-white text-warning-dark px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 flex items-center shadow-sm">
                                    <UserCheckIcon className="w-4 h-4 mr-1"/> Verificar Correcciones
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-warning/10">
                                {toVerifyUsers.map(u => (
                                    <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECCION 3: NUEVOS (Listos) */}
                    <div className="mb-24">
                        <h3 className="text-lg font-bold text-success-text mb-2 border-b border-success pb-1">3. Nuevos Usuarios a Cargar ({newUsers.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {newUsers.map((u) => (
                                <UserCard key={u.id} u={u} onChange={handleUserChange} onBlur={handleUserBlur} onRemove={removeUser} />
                            ))}
                        </div>
                        {newUsers.length === 0 && (
                            <div className="text-center py-8 text-secondary border border-dashed rounded">
                                No hay usuarios nuevos para cargar.
                            </div>
                        )}
                    </div>
                    
                    {extractedUsers.length === 0 && (
                        <div className="text-center py-8 text-secondary">Lista vacía. Agrega manualmente o vuelve a subir un archivo.</div>
                    )}

                    <div className="fixed bottom-0 left-0 right-0 bg-surface p-4 shadow-lg border-t border-border flex justify-end items-center gap-4 z-40 md:pl-64">
                        <div className="text-sm text-text-secondary hidden sm:block">
                            {newUsers.length} listos. {toVerifyUsers.length} pendientes. {duplicateUsers.length} duplicados.
                        </div>
                         <button onClick={() => setIsBackConfirmOpen(true)} className="bg-background text-text-primary py-3 px-6 rounded-lg hover:bg-border border border-border">
                            Atrás
                        </button>
                        
                        <button 
                            onClick={handleBulkCreate} 
                            disabled={isCreating || hasInvalidNewUsers || newUsers.length === 0}
                            className="bg-success text-text-on-primary py-3 px-8 rounded-lg font-bold text-lg hover:bg-opacity-90 disabled:bg-secondary disabled:cursor-not-allowed shadow-md transform transition hover:-translate-y-1 flex items-center"
                            title={hasInvalidNewUsers ? "Corrija los errores antes de guardar" : "Guardar usuarios"}
                        >
                            {isCreating ? (
                                <><SpinnerIcon className="mr-2"/> Procesando...</>
                            ) : (
                                `Crear ${newUsers.length} Usuarios`
                            )}
                        </button>
                    </div>
                    <div className="h-24"></div> {/* Spacer for fixed footer */}
                </div>
            )}
        </div>
    );
};

export default BulkUserCreationPage;
