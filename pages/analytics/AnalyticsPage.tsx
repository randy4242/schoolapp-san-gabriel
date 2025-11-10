import React, { useState } from 'react';
import { CashIcon, ShoppingCartIcon, CubeIcon, CreditCardIcon } from '../../components/icons';
import PnlReport from './PnlReport';
import SalesByProductReport from './SalesByProductReport';
import InventoryReports from './InventoryReports';
import ArReports from './ArReports';


const TABS = [
  { id: 'pnl', label: 'Pérdidas y Ganancias', icon: <CashIcon /> },
  { id: 'sales', label: 'Ventas', icon: <ShoppingCartIcon /> },
  { id: 'inventory', label: 'Inventario', icon: <CubeIcon /> },
  { id: 'ar', label: 'Cuentas por Cobrar', icon: <CreditCardIcon /> }
];

const AnalyticsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('pnl');

    const renderContent = () => {
        switch(activeTab) {
            case 'pnl': return <PnlReport />;
            case 'sales': return <SalesByProductReport />;
            case 'inventory': return <InventoryReports />;
            case 'ar': return <ArReports />;
            default: return <p>Seleccione un reporte.</p>;
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-text-primary mb-4">Análisis y Reportes</h1>
            
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

export default AnalyticsPage;
