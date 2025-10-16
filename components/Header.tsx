import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiService, GlobalSearchResult } from '../services/apiService';
import { SearchIcon, ArrowRightIcon } from './icons';

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

const Header: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<GlobalSearchResult>({ users: [], courses: [] });
    const [loading, setLoading] = useState(false);
    const [isDropdownVisible, setDropdownVisible] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const searchRef = useRef<HTMLDivElement>(null);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);

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
        if (debouncedSearchTerm && user?.schoolId) {
            setLoading(true);
            setDropdownVisible(true);
            apiService.globalSearch(user.schoolId, debouncedSearchTerm)
                .then(data => {
                    setResults(data);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setResults({ users: [], courses: [] });
            setDropdownVisible(false);
        }
    }, [debouncedSearchTerm, user?.schoolId]);
    
    const handleNavigate = (path: string, state: object) => {
        navigate(path, { state });
        setSearchTerm('');
        setDropdownVisible(false);
    };

    return (
        <header className="bg-surface shadow-sm p-4 flex justify-center items-center z-40 relative">
            <div className="relative w-full max-w-lg" ref={searchRef}>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Buscar usuarios, cursos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => { if(searchTerm) setDropdownVisible(true); }}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50"
                        aria-label="Búsqueda global"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary">
                        <SearchIcon />
                    </div>
                </div>
                {isDropdownVisible && (
                    <div className="absolute mt-2 w-full bg-surface border rounded-lg shadow-xl overflow-hidden max-h-96 overflow-y-auto">
                        {loading && <div className="p-4 text-text-secondary">Buscando...</div>}
                        {!loading && results.users.length === 0 && results.courses.length === 0 && debouncedSearchTerm && (
                            <div className="p-4 text-text-secondary">No se encontraron resultados para "{debouncedSearchTerm}".</div>
                        )}
                        
                        {results.users.length > 0 && (
                            <div>
                                <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Usuarios</h3>
                                <ul>
                                    {results.users.slice(0, 5).map(u => (
                                        <li key={`user-${u.userID}`}>
                                           <button onClick={() => handleNavigate('/users', { searchTerm: u.userName })} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-text-primary">{u.userName}</p>
                                                        <p className="text-sm text-text-secondary">{u.email}</p>
                                                    </div>
                                                    <div className="flex items-center text-sm text-info-dark font-medium">
                                                        Ver <ArrowRightIcon />
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {results.courses.length > 0 && (
                            <div>
                                <h3 className="px-4 py-2 bg-background text-sm font-semibold text-text-secondary">Cursos</h3>
                                <ul>
                                    {results.courses.slice(0, 5).map(c => (
                                        <li key={`course-${c.courseID}`}>
                                            <button onClick={() => handleNavigate('/courses', { searchTerm: c.name })} className="w-full text-left px-4 py-2 hover:bg-background">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium text-text-primary">{c.name}</p>
                                                        <p className="text-sm text-text-secondary truncate max-w-xs">{c.description}</p>
                                                    </div>
                                                    <div className="flex items-center text-sm text-info-dark font-medium">
                                                        Ver <ArrowRightIcon />
                                                    </div>
                                                </div>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};
export default Header;