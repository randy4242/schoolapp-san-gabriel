


import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChevronDownIcon, LogoutIcon, HomeIcon, UsersIcon, BookOpenIcon, SchoolIcon, ClipboardListIcon, LinkIcon, BeakerIcon, CalendarIcon, DocumentTextIcon, CreditCardIcon, CubeIcon, BellIcon, UserCheckIcon, ChartBarIcon, DocumentReportIcon, HistoryIcon, UserCircleIcon, ClipboardCheckIcon, CashIcon, ShoppingCartIcon, BriefcaseIcon, TrendingUpIcon, LedgerIcon, PercentageIcon, PlusIcon } from './icons';

interface NavLink {
  to: string;
  label: string;
  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
}

interface NavSection {
  label: string;
  // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  icon: React.ReactElement;
  links: NavLink[];
  permission: (has: (roles: number[]) => boolean) => boolean;
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Close sidebar on navigation on smaller screens
    if (isOpen) {
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const Is = (roles: number[]) => hasPermission(roles);

  const allowedSchoolsForBoletas = [5, 6, 7, 8, 9];
  const canViewBoletas = user && allowedSchoolsForBoletas.includes(user.schoolId);

  const navSections: NavSection[] = [
    {
      label: 'Usuarios',
      icon: <UsersIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/users', label: 'Ver Usuarios', icon: <span />, permission: (has) => has([6, 7]) },
        { to: '/users/create', label: 'Crear Usuario', icon: <span />, permission: (has) => has([6]) },
        { to: '/users/create-bulk-ia', label: 'Crear Multiples (IA)', icon: <span />, permission: (has) => has([6]) && user?.schoolId === 5 },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Cursos',
      icon: <BookOpenIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/courses', label: 'Ver Cursos', icon: <span />, permission: (has) => has([6, 7]) },
        { to: '/courses/create', label: 'Crear Curso', icon: <span />, permission: (has) => has([6]) },
        { to: '/courses/assign-classroom', label: 'Asignar Salón', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Salones',
      icon: <SchoolIcon />,
      permission: (has) => has([6, 7, 2, 9, 10]),
      links: [
        { to: '/classrooms', label: 'Ver Salones', icon: <span />, permission: (has) => has([6, 7, 2, 9, 10]) },
        { to: '/classrooms/create', label: 'Crear Salon', icon: <span />, permission: (has) => has([6]) },
        { to: '/classrooms/assign-student', label: 'Asignar Estudiante', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Evaluaciones',
      icon: <ClipboardCheckIcon />,
      permission: (has) => has([6, 7, 8, 2, 9, 10]),
      links: [
        { to: '/evaluations', label: 'Ver Evaluaciones', icon: <span />, permission: (has) => has([6, 7, 8, 2, 9, 10]) },
        { to: '/evaluations/create', label: 'Crear Evaluación', icon: <span />, permission: (has) => has([6, 2, 9, 10]) },
        { to: '/evaluations/create-bulk-ia', label: 'Crear Múltiples (IA)', icon: <span />, permission: (has) => has([6, 2, 9, 10]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Act. Extra',
      icon: <CubeIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/extracurriculars', label: 'Ver Actividades', icon: <span />, permission: (has) => has([6, 7]) },
        { to: '/extracurriculars/create', label: 'Crear Actividad', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Boletas',
      icon: <DocumentTextIcon />,
      permission: (has) => (canViewBoletas ?? false) && has([6, 7, 2, 9, 10, 3]),
      links: [
        { to: '/boletas', label: 'Ver Boletas', icon: <span />, permission: (has) => has([6, 7, 2, 9, 10, 3]) },
        { to: '/boletas/create', label: 'Crear Boleta', icon: <span />, permission: (has) => has([6, 7, 2, 9, 10]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Administrativo',
      icon: <DocumentReportIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/cxc', label: 'Cuentas Por Cobrar', icon: <CashIcon />, permission: (has) => has([6, 7]) },
        { to: '/invoices', label: 'Cuentas Generales', icon: <ClipboardListIcon />, permission: (has) => has([6, 7]) },
        { to: '/purchases', label: 'Compras', icon: <ShoppingCartIcon />, permission: (has) => has([6, 7]) },
        { to: '/payroll', label: 'Nómina', icon: <BriefcaseIcon />, permission: (has) => has([6, 7]) },
        { to: '/withholdings', label: 'Retenciones', icon: <PercentageIcon />, permission: (has) => has([6, 7]) },
        { to: '/administrative/monthly-generation', label: 'Generación Mensual', icon: <CalendarIcon />, permission: (has) => has([6, 7]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Libro Contable',
      icon: <LedgerIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/gl/postings', label: 'Posteos GL', icon: <span />, permission: (has) => has([6, 7]) },
        { to: '/gl/reports', label: 'Reportes Contables', icon: <span />, permission: (has) => has([6, 7]) },
      ].filter(l => l.permission(Is))
    },
     // Add other sections here based on _Layout.cshtml logic
  ];
  
  const singleLinks: (NavLink & { permission: (has: (roles: number[]) => boolean) => boolean })[] = [
      { to: '/lapsos', label: 'Lapsos', icon: <CalendarIcon />, permission: (has) => has([6]) },
      { to: '/courses', label: 'Horario', icon: <HistoryIcon />, permission: (has) => has([2, 9, 10]) && !has([6, 7]) },
      { to: '/attendance', label: 'Asistencia', icon: <ClipboardListIcon />, permission: (has) => has([6, 2, 9, 10]) },
      { to: '/relationships', label: 'Relaciones', icon: <LinkIcon />, permission: (has) => has([6]) },
      { to: '/enrollments', label: 'Inscripciones', icon: <UserCheckIcon />, permission: (has) => has([6]) },
      { to: '/certificates', label: 'Constancias', icon: <DocumentTextIcon />, permission: (has) => has([6]) },
      { to: '/products', label: 'Productos', icon: <CreditCardIcon />, permission: (has) => has([6]) },
      { to: '/notifications/send', label: 'Enviar Notificaciones', icon: <BellIcon />, permission: (has) => has([6, 2, 9, 10]) },
      { to: '/reports', label: 'Reportes', icon: <DocumentReportIcon />, permission: (has) => has([6]) },
      { to: '/stats/grades', label: 'Estadísticas de Notas', icon: <ChartBarIcon />, permission: (has) => has([6, 7]) },
      { to: '/analytics', label: 'Análisis y Reportes', icon: <TrendingUpIcon />, permission: (has) => has([6, 7]) },
      { to: '/login-history', label: 'Historial de Logins', icon: <HistoryIcon />, permission: (has) => has([6]) },
  ];
  
  useEffect(() => {
    const currentOpenSections: Record<string, boolean> = {};
    navSections.forEach(section => {
      if (section.links.some(link => location.pathname.startsWith(link.to))) {
        currentOpenSections[section.label] = true;
      }
    });
    setOpenSections(currentOpenSections);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };


  const sidebarClasses = `
    bg-sidebar-background text-text-on-primary flex flex-col h-full flex-shrink-0
    fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
    md:relative md:translate-x-0
    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
  `;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      ></div>
      <div className={sidebarClasses}>
        <div className="p-4 border-b border-sidebar-border flex-shrink-0">
          <h1 className="text-xl font-bold text-accent">SchoolApp</h1>
          <span className="text-sm text-sidebar-text truncate">{user?.email}</span>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          <Link to="/dashboard" className="flex items-center px-4 py-2 text-sidebar-text hover:bg-sidebar-bgHover rounded-md">
            <HomeIcon />
            <span className="ml-3">Inicio</span>
          </Link>
          <hr className="border-sidebar-border my-2" />

          {navSections.filter(s => s.permission(Is)).map((section) => (
            <div key={section.label}>
              <button onClick={() => toggleSection(section.label)} className="w-full flex items-center justify-between px-4 py-2 text-sidebar-text hover:bg-sidebar-bgHover rounded-md">
                <span className="flex items-center">
                  {section.icon}
                  <span className="ml-3">{section.label}</span>
                </span>
                <ChevronDownIcon className={`transition-transform duration-200 ${openSections[section.label] ? 'rotate-180' : ''}`} />
              </button>
              {openSections[section.label] && (
                <div className="pl-8 py-2 space-y-2">
                  {section.links.map(link => (
                    <Link key={link.to} to={link.to} className="block px-4 py-2 text-sm text-sidebar-text hover:text-sidebar-textHover hover:bg-sidebar-bgHover rounded-md">
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
              <hr className="border-sidebar-border my-2" />
            </div>
          ))}

          {singleLinks.filter(l => l.permission(Is)).map(link => (
             <div key={link.to}>
             <Link to={link.to} className="flex items-center px-4 py-2 text-sidebar-text hover:bg-sidebar-bgHover rounded-md">
               {link.icon}
               <span className="ml-3">{link.label}</span>
             </Link>
             <hr className="border-sidebar-border my-2" />
           </div>
          ))}
        </nav>
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <button onClick={logout} className="w-full flex items-center px-4 py-2 text-text-on-primary bg-danger hover:bg-danger-dark font-semibold rounded-md transition-colors">
            <LogoutIcon />
            <span className="ml-3">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
