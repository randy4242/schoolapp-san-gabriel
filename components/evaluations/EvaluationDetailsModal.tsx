
import React from 'react';
import Modal from '../Modal';
import { Evaluation } from '../../types';
import { EvaluationContentList } from '../content/EvaluationContentList';

interface EvaluationDetailsModalProps {
    evaluation: Evaluation;
    onClose: () => void;
}

const EvaluationDetailsModal: React.FC<EvaluationDetailsModalProps> = ({ evaluation, onClose }) => {
    
    const getEvaluationParts = (description: string | null | undefined): { text: string, percent: string } => {
        if (!description) return { text: '—', percent: '—' };
    
        let currentDesc = description;
        // Strip override if present
        const overrideMatch = currentDesc.match(/@@OVERRIDE:.*$/);
        if (overrideMatch) {
            currentDesc = currentDesc.replace(overrideMatch[0], '').trim();
        }

        const parts = currentDesc.split('@');
        if (parts.length > 1) {
            const potentialPercent = parts[parts.length - 1];
            if (!isNaN(parseFloat(potentialPercent))) {
                 const percent = parts.pop();
                 return { text: parts.join('@'), percent: `${percent}%` };
            }
        }
        return { text: currentDesc, percent: '—' };
    };

    const { text, percent } = getEvaluationParts(evaluation.description);

    return (
        <Modal isOpen={true} onClose={onClose} title="Detalle de Evaluación">
            <div className="space-y-6">
                {/* Header Info */}
                <div className="bg-surface p-4 rounded-lg border border-border shadow-sm">
                    <div>
                        <h3 className="text-xl font-bold text-primary">{evaluation.title}</h3>
                        <p className="text-sm text-text-secondary">{evaluation.course?.name}</p>
                    </div>

                    <div className="mt-4">
                        <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">Descripción General:</h4>
                        <p className="whitespace-pre-wrap text-text-primary text-sm">{text}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border-dashed">
                        <div>
                            <p className="text-xs text-text-secondary">Fecha</p>
                            <p className="font-semibold text-sm">{new Date(evaluation.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        </div>
                        <div>
                            <p className="text-xs text-text-secondary">Ponderación</p>
                            <p className="font-semibold text-sm">{percent}</p>
                        </div>
                    </div>
                </div>

                {/* Content Module */}
                <div className="border-t border-border pt-4">
                    <EvaluationContentList evaluationId={evaluation.evaluationID} />
                </div>
                
                <div className="flex justify-end pt-4 border-t">
                    <button onClick={onClose} className="bg-background text-text-primary py-2 px-4 rounded hover:bg-border transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default EvaluationDetailsModal;