
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService, GlobalSearchResult } from '../services/apiService';
import { SearchIcon, UserCircleIcon } from './icons';
import { Evaluation, Classroom, ExtracurricularActivity } from '../types';
import NotificationBell from './notifications/NotificationBell';

const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

interface NavResult {
    path: string;
    label: string;
}

const Header: React.FC<{ toggleSidebar: () => void }> = ({ toggleSidebar }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<GlobalSearchResult>({ users: [], courses: [], evaluations: [], classrooms: [], extracurriculars: [] });
    const [navResults, setNavResults] = useState<NavResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const { user, hasPermission } = useAuth();
    const navigate = useNavigate();
    const searchRef = useRef<HTMLDivElement>(null);

    const isParent = user?.roleId === 3;

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const searchableNavLinks = useMemo(() => [
        { to: '/dashboard', label: 'Inicio', keywords: ['inicio', 'dashboard', 'home', 'panel'], permission: () => true },
        { to: '/users', label: 'Usuarios', keywords: ['usuarios', 'ver', 'crear', 'estudiantes', 'profesores', 'padres'], permission: (has: (r: number[])=>boolean) => has([6, 7]) },
        { to: '/courses', label: 'Cursos', keywords: ['cursos', 'ver', 'crear', 'materias', 'asignaturas'], permission: (has: (r: number[])=>boolean) => has([6, 7, 2, 9, 10]) },
        { to: '/classrooms', label: 'Salones', keywords: ['salones', 'aulas', 'ver', 'crear'], permission: (has: (r: number[])=>boolean) => has([6, 7, 2, 9, 10]) },
        { to: '/evaluations', label: 'Evaluaciones', keywords: ['evaluaciones', 'notas', 'calificaciones', 'ver', 'crear'], permission: (has: (r: number[])=>boolean) => has([6, 7, 8, 2, 9, 10]) },
        { to: '/extracurriculars', label: 'Actividades Extracurriculares', keywords: ['actividades', 'extra', 'extracurriculares'], permission: (has: (r: number[])=>boolean) => has([6, 7]) },
        { to: '/lapsos', label: 'Lapsos', keywords: ['lapsos', 'periodos', 'trimestres'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/relationships', label: 'Relaciones', keywords: ['relaciones', 'padres', 'hijos', 'representantes'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/enrollments', label: 'Inscripciones', keywords: ['inscripciones', 'inscribir', 'matricular'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/certificates', label: 'Constancias', keywords: ['constancias', 'certificados', 'generar'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/products', label: 'Productos', keywords: ['productos', 'pagos', 'tienda'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/notifications/send', label: 'Notificaciones', keywords: ['notificaciones', 'push', 'enviar', 'mensajes'], permission: (has: (r: number[])=>boolean) => has([6, 2, 9, 10]) },
        { to: '/reports', label: 'Reportes', keywords: ['reportes', 'boletas', 'resumen', 'final'], permission: (has: (r: number[])=>boolean) => has([6]) },
        { to: '/login-history', label: 'Historial de Logins', keywords: ['historial', 'logins', 'inicios', 'sesion'], permission: (has: (r: number[])=>boolean) => has([6]) },
    ], []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setDropdownVisible(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (debouncedSearchTerm && user?.schoolId && user.userId && !isParent) {
            setLoading(true);
            setDropdownVisible(true);
            apiService.globalSearch(user.schoolId, user.userId, debouncedSearchTerm)
                .then(data => {
                    setResults(data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
            
            const lowerCaseTerm = debouncedSearchTerm.toLowerCase();
            const filteredNavs = searchableNavLinks.filter(link => 
                link.permission(hasPermission) && 
                (link.label.toLowerCase().includes(lowerCaseTerm) || link.keywords.some(k => k.includes(lowerCaseTerm)))
            ).map(link => ({ path: link.to, label: link.label }));
            setNavResults(filteredNavs);

        } else {
            setResults({ users: [], courses: [], evaluations: [], classrooms: [], extracurriculars: [] });
            setNavResults([]);
            setDropdownVisible(false);
        }
    }, [debouncedSearchTerm, user?.schoolId, user?.userId, hasPermission, searchableNavLinks, isParent]);
    
    const handleNavigate = (path: string, state?: object) => {
        navigate(path, { state });
        setSearchTerm('');
        setDropdownVisible(false);
    };
    
    const noResults = !loading && 
                      results.users.length === 0 && 
                      results.courses.length === 0 && 
                      results.classrooms.length === 0 &&
                      results.evaluations.length === 0 &&
                      results.extracurriculars.length === 0 &&
                      navResults.length === 0 &&
                      debouncedSearchTerm;

    return (
        <header className="bg-surface shadow-sm p-4 flex items-center justify-between z-40 relative">
            <div className="flex items-center">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden text-text-primary focus:outline-none mr-4"
                    aria-label="Abrir menú"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
            </div>
            
            {!isParent && (
                <div className="flex-1 flex justify-center px-4">
                    <div className="relative w-full max-w-lg" ref={searchRef}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar en todo el sitio..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onFocus={() => { if(searchTerm) setDropdownVisible(true); }}
                                className="w-full pl-10 pr-4 py-2 border border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 bg-secondary text-text-on-primary placeholder:text-text-tertiary"
                                aria-label="Búsqueda global"
                            />
                            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
                                <SearchIcon />
                            </div>
                        </div>
                        {isDropdownVisible && (
                            <div className="absolute mt-2 w-full bg-surface border rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto">
                                {loading && <div className="p-4 text-text-secondary">Buscando...</div>}
                                {noResults && (
                                    <div className="p-4 text-text-secondary">No se encontraron resultados para "{debouncedSearchTerm}".</div>
                                )}
                                
                                {navResults.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Navegación</h3>
                                        <ul>{navResults.map(nav => (
                                            <li key={`nav-${nav.path}`}><button onClick={() => handleNavigate(nav.path)} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{nav.label}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {results.users.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Usuarios</h3>
                                        <ul>{results.users.slice(0, 3).map(u => (
                                            <li key={`user-${u.userID}`}><button onClick={() => handleNavigate('/users', { searchTerm: u.userName })} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{u.userName}</p>
                                                <p className="text-sm text-text-secondary">{u.email}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {results.courses.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Cursos</h3>
                                        <ul>{results.courses.slice(0, 3).map(c => (
                                            <li key={`course-${c.courseID}`}><button onClick={() => handleNavigate('/courses', { searchTerm: c.name })} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{c.name}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {results.classrooms.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Salones</h3>
                                        <ul>{results.classrooms.slice(0, 3).map(c => (
                                            <li key={`classroom-${c.classroomID}`}><button onClick={() => handleNavigate('/classrooms', { searchTerm: c.name })} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{c.name}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {results.evaluations.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Evaluaciones</h3>
                                        <ul>{results.evaluations.slice(0, 3).map(e => (
                                            <li key={`eval-${e.evaluationID}`}><button onClick={() => handleNavigate(`/evaluations/edit/${e.evaluationID}`)} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{e.title}</p>
                                                <p className="text-sm text-text-secondary">Curso: {e.course?.name}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                                {results.extracurriculars.length > 0 && (
                                    <div>
                                        <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Actividades Extracurriculares</h3>
                                        <ul>{results.extracurriculars.slice(0, 3).map(e => (
                                            <li key={`extra-${e.activityID}`}><button onClick={() => handleNavigate(`/extracurriculars/edit/${e.activityID}`)} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <p className="font-medium text-text-primary">{e.name}</p>
                                            </button></li>
                                        ))}</ul>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {isParent && <div className="flex-1"></div>}

            <div className="flex items-center space-x-4">
                <NotificationBell />
                <Link to="/profile" className="text-text-primary hover:text-accent transition-colors" aria-label="Ver perfil">
                    <UserCircleIcon className="w-8 h-8" />
                </Link>
            </div>
        </header>
    );
};
export default Header;
