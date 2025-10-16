import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ChevronDownIcon, LogoutIcon, HomeIcon, UsersIcon, BookOpenIcon, SchoolIcon, ClipboardListIcon, LinkIcon, BeakerIcon, CalendarIcon, DocumentTextIcon, CreditCardIcon, CubeIcon, BellIcon, UserCheckIcon, ChartBarIcon, DocumentReportIcon, HistoryIcon } from './icons';

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

const Sidebar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const location = useLocation();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const currentOpenSections: Record<string, boolean> = {};
    navSections.forEach(section => {
      if (section.links.some(link => location.pathname.startsWith(link.to))) {
        currentOpenSections[section.label] = true;
      }
    });
    setOpenSections(currentOpenSections);
  }, [location.pathname]);

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const Is = (roles: number[]) => hasPermission(roles);
  const IsSuperAdmin = Is([6]);
  const IsTeacherAny = Is([2, 9, 10]);

  const navSections: NavSection[] = [
    {
      label: 'Usuarios',
      icon: <UsersIcon />,
      permission: (has) => has([6, 7]),
      links: [
        { to: '/users', label: 'Ver Usuarios', icon: <span />, permission: (has) => has([6, 7]) },
        { to: '/users/create', label: 'Crear Usuario', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Cursos',
      icon: <BookOpenIcon />,
      permission: (has) => has([6, 7, 2, 9, 10]),
      links: [
        { to: '/courses', label: 'Ver Cursos', icon: <span />, permission: (has) => has([6, 7, 2, 9, 10]) },
        { to: '/courses/create', label: 'Crear Curso', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Salones',
      icon: <SchoolIcon />,
      permission: (has) => has([6, 7, 2, 9, 10]),
      links: [
        { to: '/classrooms', label: 'Ver Salones', icon: <span />, permission: (has) => has([6, 7, 2, 9, 10]) },
        { to: '/classrooms/create', label: 'Crear Salon', icon: <span />, permission: (has) => has([6]) },
      ].filter(l => l.permission(Is))
    },
    {
      label: 'Evaluaciones',
      icon: <ClipboardListIcon />,
      permission: (has) => has([6, 7, 8, 2, 9, 10]),
      links: [
        { to: '/evaluations', label: 'Ver Evaluaciones', icon: <span />, permission: (has) => has([6, 7, 8, 2, 9, 10]) },
        { to: '/evaluations/create', label: 'Crear Evaluación', icon: <span />, permission: (has) => has([6, 2, 9, 10]) },
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
     // Add other sections here based on _Layout.cshtml logic
  ];
  
  const singleLinks: (NavLink & { permission: (has: (roles: number[]) => boolean) => boolean })[] = [
      { to: '/lapsos', label: 'Lapsos', icon: <CalendarIcon />, permission: (has) => has([6]) },
      { to: '/relationships', label: 'Relaciones', icon: <LinkIcon />, permission: (has) => has([6]) },
      { to: '/enrollments', label: 'Inscripciones', icon: <UserCheckIcon />, permission: (has) => has([6]) },
      { to: '/certificates', label: 'Constancias', icon: <DocumentTextIcon />, permission: (has) => has([6]) },
      { to: '/products', label: 'Productos', icon: <CreditCardIcon />, permission: (has) => has([6]) },
      { to: '/notifications/send', label: 'Notificaciones', icon: <BellIcon />, permission: (has) => has([6, 2, 9, 10]) },
      { to: '/reports', label: 'Reportes', icon: <DocumentReportIcon />, permission: (has) => has([6]) },
      { to: '/login-history', label: 'Historial de Logins', icon: <HistoryIcon />, permission: (has) => has([6]) },
  ];


  return (
    <div className="w-64 bg-sidebar-background text-text-on-primary flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-accent">Colegio San Gabriel Arcángel</h1>
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
      <div className="p-4 border-t border-sidebar-border">
        <button onClick={logout} className="w-full flex items-center px-4 py-2 text-white bg-danger/90 hover:bg-danger font-semibold rounded-md transition-colors">
          <LogoutIcon />
          <span className="ml-3">Cerrar sesión</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;