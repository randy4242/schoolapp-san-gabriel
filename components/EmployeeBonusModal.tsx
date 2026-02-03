import React, { useState, useEffect } from 'react';

export type BonusItem = {
    id: string;
    name: string;
    amount: number;
    isUsd: boolean;
    type: 'MANUAL' | 'GLOBAL';
    sourceFieldId?: string; // To link back to the global definition for sync deletion
};

interface EmployeeBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeName: string;
    currentBonuses: BonusItem[];
    onSave: (newBonuses: BonusItem[]) => void;
    activeRate: number;
}

export const EmployeeBonusModal: React.FC<EmployeeBonusModalProps> = ({
    isOpen, onClose, employeeName, currentBonuses, onSave, activeRate
}) => {
    const [bonuses, setBonuses] = useState<BonusItem[]>([]);
    const [newBonusName, setNewBonusName] = useState('');
    const [newBonusAmount, setNewBonusAmount] = useState<number | ''>('');
    const [newBonusIsUsd, setNewBonusIsUsd] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setBonuses(JSON.parse(JSON.stringify(currentBonuses))); // Deep copy
            setNewBonusName('');
            setNewBonusAmount('');
            setNewBonusIsUsd(true);
        }
    }, [isOpen, currentBonuses]);

    if (!isOpen) return null;

    const handleAdd = () => {
        if (!newBonusName || !newBonusAmount) return;

        const newItem: BonusItem = {
            id: Date.now().toString(),
            name: newBonusName,
            amount: Number(newBonusAmount),
            isUsd: newBonusIsUsd,
            type: 'MANUAL'
        };

        setBonuses([...bonuses, newItem]);
        setNewBonusName('');
        setNewBonusAmount('');
    };

    const handleDelete = (id: string) => {
        setBonuses(bonuses.filter(b => b.id !== id));
    };

    const handleSave = () => {
        onSave(bonuses);
        onClose();
    };

    const formatMoney = (amount: number, currency: string) => {
        return new Intl.NumberFormat('es-VE', { style: 'currency', currency }).format(amount);
    };

    const getTotalVes = () => {
        return bonuses.reduce((acc, b) => {
            const amountVes = b.isUsd ? b.amount * activeRate : b.amount;
            return acc + amountVes;
        }, 0);
    };

    const inputClasses = "px-2 py-1 bg-white text-gray-900 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-4 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Bonos de {employeeName}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto space-y-4">
                    {/* Add New Bonus Form */}
                    <div className="bg-gray-50 p-3 rounded border border-gray-200 space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Agregar Bono Manual</label>
                        <div className="flex space-x-2">
                            <input
                                placeholder="Concepto (ej. Puntualidad)"
                                value={newBonusName}
                                onChange={e => setNewBonusName(e.target.value)}
                                className={inputClasses + " flex-1"}
                            />
                            <input
                                type="number"
                                placeholder="Monto"
                                value={newBonusAmount}
                                onChange={e => setNewBonusAmount(parseFloat(e.target.value) || '')}
                                className={inputClasses + " w-24"}
                            />
                            <select
                                value={newBonusIsUsd.toString()}
                                onChange={e => setNewBonusIsUsd(e.target.value === 'true')}
                                className={inputClasses + " w-20"}
                            >
                                <option value="true">USD</option>
                                <option value="false">VES</option>
                            </select>
                            <button
                                onClick={handleAdd}
                                disabled={!newBonusName || !newBonusAmount}
                                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-bold"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {bonuses.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-2">Sin bonificaciones asignadas.</p>
                        ) : (
                            bonuses.map((bonus, idx) => (
                                <div key={bonus.id || idx} className="flex justify-between items-center bg-white border border-gray-100 p-2 rounded shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{bonus.name}</span>
                                        <div className="flex items-center space-x-2">
                                            <span className={`text-xs px-1.5 rounded ${bonus.type === 'GLOBAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {bonus.type}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {formatMoney(bonus.amount, bonus.isUsd ? 'USD' : 'VES')}
                                                {bonus.isUsd && ` (≈ ${formatMoney(bonus.amount * activeRate, 'VES')})`}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(bonus.id)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Eliminar"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border-t p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-gray-600">Total Estimado:</span>
                        <span className="font-bold text-xl text-green-600">{formatMoney(getTotalVes(), 'VES')}</span>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold shadow">
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
