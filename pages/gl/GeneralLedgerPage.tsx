import React, { useState } from 'react';
import { CashIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon, LedgerIcon } from '../../components/icons';
import TrialBalanceReport from './reports/TrialBalanceReport';
import LedgerReport from './reports/LedgerReport';
import IncomeStatementReport from './reports/IncomeStatementReport';
import BalanceSheetReport from './reports/BalanceSheetReport';


const TABS = [
  { id: 'trial', label: 'Balance de Comprobación', icon: <LedgerIcon /> },
  { id: 'ledger', label: 'Mayor', icon: <CubeIcon /> },
  { id: 'income', label: 'Estado de Resultados', icon: <CashIcon /> },
  { id: 'balance', label: 'Balance General', icon: <CreditCardIcon /> }
];

const GeneralLedgerPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('trial');

    const renderContent = () => {
        switch(activeTab) {
            case 'trial': return <TrialBalanceReport />;
            case 'ledger': return <LedgerReport />;
            case 'income': return <IncomeStatementReport />;
            case 'balance': return <BalanceSheetReport />;
            default: return <p>Seleccione un reporte.</p>;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-4">Reportes Contables</h1>
            
            <div className="mb-6 border-b border-border">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
                                ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                                }
                            `}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>
            
            <div className="mt-4">
                {renderContent()}
            </div>
        </div>
    );
};

export default GeneralLedgerPage;
