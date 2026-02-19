import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { BoletaEvaluationPlan, IndicatorDto, IndicatorCreateDto } from '../../types';
import { SpinnerIcon, TrashIcon, PlusIcon, EditIcon } from '../../components/icons'; // Ensure EditIcon is exported
import Modal from '../../components/Modal';

const INDICATOR_SECTIONS = [
    { id: 'PersonalSocial', title: 'FORMACIÓN PERSONAL, SOCIAL Y COMUNICACIÓN' },
    { id: 'RelacionAmbiente', title: 'RELACIÓN ENTRE LOS COMPONENTES DEL AMBIENTE' },
    // Elementary Sections
    { id: 'Lenguaje', title: 'LENGUAJE' },
    { id: 'Matematica', title: 'MATEMÁTICA' },
    { id: 'CienciasSociales', title: 'CIENCIAS SOCIALES' },
    { id: 'CienciasNatur', title: 'CIENCIAS DE LA NATURALEZA Y TECNOLOGÍA' },
    { id: 'EducacionEstetica', title: 'EDUCACIÓN ESTÉTICA' },
];

const IndicatorsManagerPage: React.FC = () => {
    const { planId } = useParams<{ planId: string }>();
    const [plan, setPlan] = useState<BoletaEvaluationPlan | null>(null);
    const [indicators, setIndicators] = useState<IndicatorDto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIndicator, setEditingIndicator] = useState<IndicatorDto | null>(null);
    const [formData, setFormData] = useState<Partial<IndicatorCreateDto>>({
        section: '',
        content: '',
        orderIndex: 0
    });

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [indicatorToDelete, setIndicatorToDelete] = useState<number | null>(null);

    // Quick Add State
    const [quickAddValues, setQuickAddValues] = useState<{ [section: string]: string }>({});
    const [quickAddLoading, setQuickAddLoading] = useState<{ [section: string]: boolean }>({});

    // Drag and Drop State
    const [draggedItem, setDraggedItem] = useState<IndicatorDto | null>(null);

    useEffect(() => {
        if (planId) {
            loadData();
        }
    }, [planId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const planData = await apiService.getBoletaPlanById(Number(planId));
            setPlan(planData);
            const indicatorsData = await apiService.getIndicatorsByPlan(Number(planId));
            setIndicators(indicatorsData.sort((a, b) => a.orderIndex - b.orderIndex));
        } catch (e) {
            console.error("Error loading indicators data", e);
            setError("Error cargando datos del plan.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenCreate = (section?: string) => {
        setEditingIndicator(null);
        setFormData({
            section: section || '',
            content: '',
            orderIndex: indicators.filter(i => i.section === section).length + 1
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (indicator: IndicatorDto) => {
        setEditingIndicator(indicator);
        setFormData({
            section: indicator.section,
            content: indicator.content,
            orderIndex: indicator.orderIndex
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.section || !formData.content) return;

        try {
            if (editingIndicator) {
                await apiService.updateIndicator(editingIndicator.indicatorId, {
                    section: formData.section,
                    content: formData.content,
                    orderIndex: formData.orderIndex || 0,
                    subSection: formData.subSection
                });
            } else {
                await apiService.createIndicator({
                    planId: Number(planId),
                    section: formData.section,
                    content: formData.content,
                    orderIndex: formData.orderIndex || 0,
                    subSection: formData.subSection
                });
            }
            setIsModalOpen(false);
            loadData();
        } catch (e) {
            console.error("Error saving indicator", e);
            alert("Error guardando indicador.");
        }
    };

    const handleDelete = async () => {
        if (!indicatorToDelete) return;
        try {
            await apiService.deleteIndicator(indicatorToDelete);
            setDeleteModalOpen(false);
            setIndicatorToDelete(null);
            loadData();
        } catch (e) {
            console.error("Error deleting indicator", e);
            alert("Error eliminando indicador.");
        }
    };

    // --- Quick Add Logic ---
    const handleQuickAddChange = (section: string, value: string) => {
        setQuickAddValues(prev => ({ ...prev, [section]: value }));
    };

    const handleQuickAddKeyDown = async (e: React.KeyboardEvent, section: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const content = quickAddValues[section]?.trim();
            if (!content) return;

            setQuickAddLoading(prev => ({ ...prev, [section]: true }));
            try {
                const sectionIndicators = indicators.filter(i => i.section === section);
                const nextOrder = sectionIndicators.length > 0
                    ? Math.max(...sectionIndicators.map(i => i.orderIndex)) + 1
                    : 1;

                await apiService.createIndicator({
                    planId: Number(planId),
                    section: section,
                    content: content,
                    orderIndex: nextOrder
                });

                // Clear input
                setQuickAddValues(prev => ({ ...prev, [section]: '' }));
                // Reload data silently to update list
                const indicatorsData = await apiService.getIndicatorsByPlan(Number(planId));
                setIndicators(indicatorsData.sort((a, b) => a.orderIndex - b.orderIndex));
            } catch (err) {
                console.error("Quick add failed", err);
                alert("Error al agregar indicador rápido.");
            } finally {
                setQuickAddLoading(prev => ({ ...prev, [section]: false }));
            }
        }
    };

    // --- Drag and Drop Logic ---
    const onDragStart = (e: React.DragEvent, item: IndicatorDto) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        // Set transparent drag image or standard ghost
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
    };

    const onDrop = async (e: React.DragEvent, targetItem: IndicatorDto) => {
        e.preventDefault();
        if (!draggedItem || draggedItem.indicatorId === targetItem.indicatorId) return;
        if (draggedItem.section !== targetItem.section) return; // Only allow reorder within same section

        // Calculate new order locally
        const sectionIndicators = indicators
            .filter(i => i.section === draggedItem.section)
            .sort((a, b) => a.orderIndex - b.orderIndex);

        const oldIndex = sectionIndicators.findIndex(i => i.indicatorId === draggedItem.indicatorId);
        const newIndex = sectionIndicators.findIndex(i => i.indicatorId === targetItem.indicatorId);

        const newOrderList = [...sectionIndicators];
        const [movedItem] = newOrderList.splice(oldIndex, 1);
        newOrderList.splice(newIndex, 0, movedItem);

        // Update local state immediately for responsiveness
        const otherIndicators = indicators.filter(i => i.section !== draggedItem.section);
        const updatedIndicators = [...otherIndicators, ...newOrderList.map((item, index) => ({ ...item, orderIndex: index + 1 }))];
        setIndicators(updatedIndicators);

        // Update Backend
        try {
            // We only need to update the items that changed index, but easiest is to update all in the section for safety
            // Or typically just send the reordered list to an endpoint. 
            // Since we have individual update, let's update in parallel.
            const updates = newOrderList.map((item, index) =>
                apiService.updateIndicator(item.indicatorId, {
                    section: item.section,
                    content: item.content,
                    orderIndex: index + 1, // 1-based index
                    subSection: item.subSection
                })
            );
            await Promise.all(updates);
        } catch (err) {
            console.error("Error reordering", err);
            alert("Error al reordenar. Recarga la página.");
            loadData(); // Revert on error
        }
        setDraggedItem(null);
    };

    if (loading) return <div className="p-8 flex justify-center"><SpinnerIcon /></div>;
    if (!plan) return <div className="p-8 text-red-600">Plan no encontrado.</div>;

    const existingSections = Array.from(new Set(indicators.map(i => i.section)));
    const allSections = Array.from(new Set([...INDICATOR_SECTIONS.map(s => s.title), ...existingSections]));

    const isPreschool = plan.level.includes("Sala");
    const filteredSections = isPreschool
        ? ['FORMACIÓN PERSONAL, SOCIAL Y COMUNICACIÓN', 'RELACIÓN ENTRE LOS COMPONENTES DEL AMBIENTE']
        : ['LENGUAJE', 'MATEMÁTICA', 'CIENCIAS SOCIALES', 'CIENCIAS DE LA NATURALEZA Y TECNOLOGÍA', 'EDUCACIÓN ESTÉTICA'];

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link to="/boletas/planes" className="text-blue-600 hover:underline mb-2 block">&larr; Volver a Planes</Link>
                    <h1 className="text-2xl font-bold text-gray-800">{plan.name}</h1>
                    <p className="text-gray-500">{plan.level}</p>
                </div>
                <button onClick={() => handleOpenCreate()} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center shadow-sm">
                    <PlusIcon className="w-5 h-5 mr-1" /> Nueva Sección Manual
                </button>
            </div>

            <div className="space-y-8">
                {filteredSections.map(sectionTitle => {
                    const sectionIndicators = indicators
                        .filter(i => i.section === sectionTitle)
                        .sort((a, b) => a.orderIndex - b.orderIndex);

                    return (
                        <div key={sectionTitle} className="bg-white rounded-xl shadow-md p-5 border-l-4 border-blue-500">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                                <h2 className="text-xl font-bold text-gray-800">{sectionTitle}</h2>
                                <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                                    {sectionIndicators.length} indicadores
                                </span>
                            </div>

                            {/* Quick Add Input */}
                            <div className="mb-4 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <PlusIcon className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm shadow-sm transition-colors"
                                    placeholder="Escribe un nuevo indicador y presiona Enter..."
                                    value={quickAddValues[sectionTitle] || ''}
                                    onChange={(e) => handleQuickAddChange(sectionTitle, e.target.value)}
                                    onKeyDown={(e) => handleQuickAddKeyDown(e, sectionTitle)}
                                    disabled={quickAddLoading[sectionTitle]}
                                />
                                {quickAddLoading[sectionTitle] && (
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <SpinnerIcon className="h-5 w-5 text-blue-500 animate-spin" />
                                    </div>
                                )}
                            </div>

                            {sectionIndicators.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <p className="text-gray-500 text-sm">No hay indicadores. Comienza escribiendo arriba.</p>
                                </div>
                            ) : (
                                <div className="overflow-hidden rounded-lg border border-gray-200">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {sectionIndicators.map((ind, idx) => (
                                                <tr
                                                    key={ind.indicatorId}
                                                    className={`hover:bg-blue-50 transition-colors cursor-move ${draggedItem?.indicatorId === ind.indicatorId ? 'opacity-50 bg-blue-100' : ''}`}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, ind)}
                                                    onDragOver={onDragOver}
                                                    onDrop={(e) => onDrop(e, ind)}
                                                >
                                                    <td className="w-12 px-4 py-3 text-center">
                                                        <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                                                            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16"></path>
                                                            </svg>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                                                        {ind.content}
                                                    </td>
                                                    <td className="w-24 px-4 py-3 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => handleOpenEdit(ind)}
                                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-2 rounded-lg transition-colors mr-2"
                                                            title="Editar"
                                                        >
                                                            <EditIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => { setIndicatorToDelete(ind.indicatorId); setDeleteModalOpen(true); }}
                                                            className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Other/Custom Sections */}
                {indicators.filter(i => !filteredSections.includes(i.section)).length > 0 && (
                    <div className="bg-white rounded-xl shadow-md p-6 border-t-4 border-gray-400 mt-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs mr-2">EXTRA</span>
                            Otras Secciones
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                            {Array.from(new Set(indicators.filter(i => !filteredSections.includes(i.section)).map(i => i.section))).map((sec: unknown) => {
                                const sectionName = sec as string;
                                return (
                                    <div key={sectionName} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <div className="font-bold text-gray-700 mb-3 border-b border-gray-300 pb-2 flex justify-between">
                                            {sectionName}
                                            <button onClick={() => handleOpenCreate(sectionName)} className="text-xs text-blue-600 hover:underline">+ Agregar</button>
                                        </div>
                                        <div className="space-y-2">
                                            {indicators.filter(i => i.section === sectionName).map(ind => (
                                                <div key={ind.indicatorId} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border border-gray-100">
                                                    <span className="text-sm text-gray-800">{ind.content}</span>
                                                    <div className="flex">
                                                        <button onClick={() => handleOpenEdit(ind)} className="text-blue-500 hover:bg-blue-50 p-1 rounded mr-1"><EditIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => { setIndicatorToDelete(ind.indicatorId); setDeleteModalOpen(true); }} className="text-red-500 hover:bg-red-50 p-1 rounded"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3">
                                            <input
                                                type="text"
                                                className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                placeholder="Agregar rápido..."
                                                value={quickAddValues[sectionName] || ''}
                                                onChange={(e) => handleQuickAddChange(sectionName, e.target.value)}
                                                onKeyDown={(e) => handleQuickAddKeyDown(e, sectionName)}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Gestión de Indicador">
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sección</label>
                        <input
                            value={formData.section}
                            onChange={e => setFormData({ ...formData, section: e.target.value })}
                            list="sections-list"
                            className="w-full border rounded p-2 mt-1"
                            placeholder="Ej. MATEMÁTICA"
                        />
                        <datalist id="sections-list">
                            {allSections.map(s => <option key={s} value={s} />)}
                        </datalist>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contenido del Indicador</label>
                        <textarea
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            rows={3}
                            className="w-full border rounded p-2 mt-1"
                            placeholder="Ej. Identifica los números del 1 al 100..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Orden y Subsección (Opcional)</label>
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                type="number"
                                placeholder="Orden"
                                value={formData.orderIndex}
                                onChange={e => setFormData({ ...formData, orderIndex: Number(e.target.value) })}
                                className="border rounded p-2 mt-1"
                            />
                            <input
                                type="text"
                                placeholder="Subsección"
                                value={formData.subSection || ''}
                                onChange={e => setFormData({ ...formData, subSection: e.target.value })}
                                className="border rounded p-2 mt-1"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Eliminar Indicador">
                <div className="p-4">
                    <p className="text-gray-700 mb-4">¿Seguro que deseas eliminar este indicador? Esta acción no se puede deshacer.</p>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setDeleteModalOpen(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Eliminar</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default IndicatorsManagerPage;
