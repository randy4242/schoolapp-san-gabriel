
import React, { useEffect, useState, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { Certificate } from '../../types';
import { CalendarIcon, PlusIcon, TrashIcon, BookOpenIcon, SchoolIcon } from '../../components/icons';
import Modal from '../../components/Modal';

const CERT_TYPE_PLAN = "Plan de Contenido";

interface PlanJson {
    title: string;
    course: string;
    classroom: string;
    contenido: string;
    indicadores: string;
}

const PlanEvaluacionPage: React.FC = () => {
    const [plans, setPlans] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState<PlanJson>({
        title: '',
        course: '',
        classroom: '',
        contenido: '',
        indicadores: ''
    });

    const { user, hasPermission } = useAuth();
    
    // CAMBIO CRÍTICO: Solo administradores (6) y super admins (7) pueden gestionar (Crear/Eliminar)
    const canManage = useMemo(() => hasPermission([6, 7]), [hasPermission]);

    const fetchData = async () => {
        if (user?.schoolId) {
            try {
                setLoading(true);
                setError('');
                const data = await apiService.getCertificates(user.schoolId);
                // Filtrar solo planes de contenido (antes plan de evaluación)
                // Nota: Por compatibilidad también podría filtrar por el tipo viejo si existieran registros previos
                const filtered = data.filter(c => c.certificateType === CERT_TYPE_PLAN || c.certificateType === "Plan de Evaluación");
                setPlans(filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()));
            } catch (err: any) {
                setError('No se pudo cargar el listado de planes.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        fetchData();
    }, [user]);

    const parsePlanContent = (content: string): PlanJson => {
        try {
            return JSON.parse(content);
        } catch (e) {
            return {
                title: 'Plan sin título',
                course: 'N/A',
                classroom: 'N/A',
                contenido: content,
                indicadores: ''
            };
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.schoolId || !canManage) return;

        setIsSaving(true);
        try {
            const payload = {
                userId: user.userId, 
                certificateType: CERT_TYPE_PLAN,
                content: JSON.stringify(formData),
                schoolId: user.schoolId,
                issueDate: new Date().toISOString(),
                signatoryName: "", 
                signatoryTitle: ""  
            };

            await apiService.createCertificate(payload);
            setFormData({ title: '', course: '', classroom: '', contenido: '', indicadores: '' });
            setIsCreateModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete || !user?.schoolId || !canManage) return;
        try {
            await apiService.deleteCertificate(planToDelete, user.schoolId);
            setPlanToDelete(null);
            fetchData();
        } catch (err: any) {
            alert("Error al eliminar.");
        }
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-3 bg-accent text-white rounded-xl shadow-lg">
                            <CalendarIcon className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-text-primary">Planes de Contenido</h1>
                    </div>
                    <p className="text-text-secondary text-lg">Información descriptiva del curso y los indicadores de avance académico.</p>
                </div>
                {/* Botón visible solo para administradores */}
                {canManage && (
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary text-white py-2 px-6 rounded-xl shadow-md hover:opacity-90 transition-all flex items-center gap-2 font-bold"
                    >
                        <PlusIcon className="w-5 h-5" /> Nuevo Plan
                    </button>
                )}
            </header>

            {error && <div className="bg-danger-light text-danger p-4 rounded-lg mb-6 border border-danger/20">{error}</div>}

            {plans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plans.map((plan) => {
                        const info = parsePlanContent(plan.content);
                        return (
                            <div key={plan.certificateId} className="bg-surface rounded-3xl border border-border shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col group relative">
                                {/* Botón de eliminar visible solo para administradores */}
                                {canManage && (
                                    <button 
                                        onClick={() => setPlanToDelete(plan.certificateId)}
                                        className="absolute top-4 right-4 p-2 text-text-tertiary hover:text-danger bg-background/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                )}
                                
                                <div className="p-6 bg-background border-b border-border">
                                    <div className="flex gap-4 mb-4">
                                        <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <BookOpenIcon className="w-3 h-3" /> {info.course}
                                        </div>
                                        <div className="bg-accent/10 text-accent px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                            <SchoolIcon className="w-3 h-3" /> {info.classroom}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-black text-text-primary leading-tight mb-2">
                                        {info.title}
                                    </h3>
                                    <span className="text-[10px] text-text-tertiary font-bold uppercase">Publicado: {new Date(plan.issueDate).toLocaleDateString()}</span>
                                </div>

                                <div className="p-6 flex-grow space-y-6">
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center">
                                            <span className="w-1.5 h-4 bg-primary rounded-full mr-2"></span>
                                            Contenido Temático
                                        </h4>
                                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap pl-3.5">
                                            {info.contenido}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <h4 className="text-xs font-black text-accent uppercase tracking-widest flex items-center">
                                            <span className="w-1.5 h-4 bg-accent rounded-full mr-2"></span>
                                            Indicadores
                                        </h4>
                                        <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap pl-3.5 italic bg-accent/5 p-4 rounded-2xl border border-accent/10">
                                            {info.indicadores}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border shadow-sm">
                    <div className="bg-background w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CalendarIcon className="w-8 h-8 text-text-tertiary" />
                    </div>
                    <p className="text-text-secondary text-lg">No hay planes de contenido publicados.</p>
                </div>
            )}

            {/* Create Modal */}
            {isCreateModalOpen && canManage && (
                <Modal isOpen={true} onClose={() => setIsCreateModalOpen(false)} title="Crear Plan de Contenido">
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Título del Plan</label>
                            <input 
                                type="text" 
                                required
                                value={formData.title}
                                onChange={e => setFormData({...formData, title: e.target.value})}
                                className="w-full p-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-accent/50 outline-none"
                                placeholder="Ej: Contenido Programático 1er Lapso"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Curso / Materia</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.course}
                                    onChange={e => setFormData({...formData, course: e.target.value})}
                                    className="w-full p-2 border border-border rounded-lg bg-background"
                                    placeholder="Ej: Matemáticas"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Salón / Sección</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.classroom}
                                    onChange={e => setFormData({...formData, classroom: e.target.value})}
                                    className="w-full p-2 border border-border rounded-lg bg-background"
                                    placeholder="Ej: 3er Año A"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Contenido Académico</label>
                            <textarea 
                                required
                                rows={4}
                                value={formData.contenido}
                                onChange={e => setFormData({...formData, contenido: e.target.value})}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                                placeholder="Describa los temas..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Indicadores</label>
                            <textarea 
                                required
                                rows={4}
                                value={formData.indicadores}
                                onChange={e => setFormData({...formData, indicadores: e.target.value})}
                                className="w-full p-2 border border-border rounded-lg bg-background"
                                placeholder="Criterios u objetivos..."
                            />
                        </div>
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-text-secondary hover:underline font-bold">Cancelar</button>
                            <button 
                                type="submit" 
                                disabled={isSaving}
                                className="bg-primary text-white py-2 px-6 rounded-lg font-bold shadow-md hover:opacity-90 disabled:bg-secondary"
                            >
                                {isSaving ? 'Guardando...' : 'Publicar Plan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Delete Modal */}
            {planToDelete && canManage && (
                <Modal isOpen={true} onClose={() => setPlanToDelete(null)} title="Eliminar Plan">
                    <p className="mb-6">¿Estás seguro de que deseas eliminar este plan de contenido? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setPlanToDelete(null)} className="px-4 py-2 border rounded-lg font-bold">Cancelar</button>
                        <button onClick={handleDelete} className="bg-danger text-white py-2 px-6 rounded-lg font-bold">Eliminar permanentemente</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PlanEvaluacionPage;
