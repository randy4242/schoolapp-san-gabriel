import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/apiService';
import { DashboardStats } from '../types';
import { Link } from 'react-router-dom';
import { CubeIcon, DocumentTextIcon, CreditCardIcon, UserCheckIcon } from '../components/icons';

const TotalUsersIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-full h-full">
        <path d="M16 7C16 9.20914 14.2091 11 12 11C9.79086 11 8 9.20914 8 7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 14C8.13401 14 5 17.134 5 21H19C19 17.134 15.866 14 12 14Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

const StudentsIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 31.666 31.666" className="w-full h-full">
        <g>
            <g>
                <path d="M30.073,17.717c0-0.881-0.715-1.595-1.596-1.595H3.188c-0.881,0-1.595,0.714-1.595,1.595v1.014h1.968V29.3    c0,1.308,1.06,2.366,2.365,2.366h19.862c1.308,0,2.365-1.061,2.365-2.366V18.73h1.92V17.717L30.073,17.717z"/>
                <path d="M21.858,11.793h1.436c1.054,0,1.91-0.866,1.91-1.919V1.54c0-0.85-0.697-1.54-1.549-1.54s-1.551,0.69-1.551,1.54v7.154    h-1.357c-0.373-0.246-0.817-0.393-1.297-0.393h-7.216c-1.335,0-2.428,1.102-2.428,2.437v3.81h12.052V11.793z"/>
                <circle cx="15.844" cy="3.463" r="3.462"/>
            </g>
        </g>
    </svg>
);

const TeachersIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 64 64" style={{fillRule: 'evenodd', clipRule: 'evenodd', strokeLinejoin: 'round', strokeMiterlimit: 2}} className="w-full h-full">
        <g id="ICON">
            <path d="M60,3.5l-56,-0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1l2.171,-0c-0.111,0.313 -0.171,0.649 -0.171,1l-0,10.176c-0,0.552 0.448,1 1,1c0.552,0 1,-0.448 1,-1l0,-6.676l44,-0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1l-44,-0l0,-1.5c0,-0.552 0.448,-1 1,-1l46,-0c0.552,0 1,0.448 1,1c0,0 -0,30.5 -0,30.5c-0,0.552 -0.448,1 -1,1l-23,-0l-0,-10.25c-0,-6.075 -4.925,-11 -11,-11c-0.665,0 -1.335,0 -2,0c-6.075,0 -11,4.925 -11,11l0,17.542c-1.104,0.329 -2.12,0.929 -2.95,1.758c-1.313,1.313 -2.05,3.093 -2.05,4.95c0,3.799 0,8 0,8c0,0.552 0.448,1 1,1l32,-0c0.552,-0 1,-0.448 1,-1l-0,-8c0,-1.857 -0.737,-3.637 -2.05,-4.95c-0.83,-0.829 -1.846,-1.429 -2.95,-1.758l-0,-5.292l23,0c1.657,-0 3,-1.343 3,-3l0,-30.5c-0,-0.351 -0.06,-0.687 -0.171,-1l2.171,-0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1Zm-30,43.5l-4.083,0c-0.477,2.836 -2.946,5 -5.917,5c-2.971,-0 -5.44,-2.164 -5.917,-5l-4.083,0c-1.326,-0 -2.598,0.527 -3.536,1.464c-0.937,0.938 -1.464,2.21 -1.464,3.536c0,0 0,7 0,7l4,-0l0,-4c0,-0.552 0.448,-1 1,-1c0.552,0 1,0.448 1,1l0,4l18,-0l0,-4c0,-0.552 0.448,-1 1,-1c0.552,0 1,0.448 1,1l0,4l4,-0l0,-7c0,-1.326 -0.527,-2.598 -1.464,-3.536c-0.938,-0.937 -2.21,-1.464 -3.536,-1.464Zm-6.126,0l-7.748,0c0.445,1.724 2.012,3 3.874,3c1.862,-0 3.429,-1.276 3.874,-3Zm6.126,-2l-20,-0c0,0 0,-17.25 0,-17.25c0,-4.971 4.029,-9 9,-9c0.665,0 1.335,0 2,0c4.971,0 9,4.029 9,9l0,17.25Zm-2,-17c-0,-0.552 -0.448,-1 -1,-1l-6.382,0c0,-0 -1.724,-3.447 -1.724,-3.447c-0.169,-0.339 -0.515,-0.553 -0.894,-0.553c-0.379,-0 -0.725,0.214 -0.894,0.553l-1.724,3.447c-0,0 -2.382,0 -2.382,0c-0.552,0 -1,0.448 -1,1l0,10c0,2.761 2.239,5 5,5c1.881,0 4.119,0 6,0c2.761,-0 5,-2.239 5,-5c-0,-4.138 -0,-10 -0,-10Zm-2,1l-0,9c-0,1.657 -1.343,3 -3,3c-0,-0 -6,0 -6,0c-1.657,-0 -3,-1.343 -3,-3c0,-0 0,-9 0,-9c-0,0 2,0 2,0c0.379,-0 0.725,-0.214 0.894,-0.553l1.106,-2.211c0,0 1.106,2.211 1.106,2.211c0.169,0.339 0.515,0.553 0.894,0.553l6,-0Zm14.5,6l11.5,0c0.552,-0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-11.5,0c-0.552,-0 -1,0.448 -1,1c-0,0.552 0.448,1 1,1Zm-3.5,-5l15,0c0.552,0 1,-0.448 1,-1c0,-0.552 -0.448,-1 -1,-1l-15,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Zm-0,-5l15,0c0.552,0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-15,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Zm0,-5l15,0c0.552,0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-15,0c-0.552,0 -1,0.448 -1,1c0,0.552 0.448,1 1,1Zm-7,-5l22,0c0.552,-0 1,-0.448 1,-1c-0,-0.552 -0.448,-1 -1,-1l-22,0c-0.552,-0 -1,0.448 -1,1c-0,0.552 0.448,1 1,1Z"/>
        </g>
    </svg>
);

const CoursesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 32 32" className="w-full h-full">
        <path d="M16 0l-12.635 1.323v23.161l12.635 7.516 12.635-7.516v-23.161l-12.505-1.307zM26.979 23.542l-10.979 6.536-10.979-6.536v-9.49l10.932 6.505 0.016 1.182-7.5-4.469-0.010 1.151 7.531 4.526 0.021 1.208-7.531-4.479-0.010 1.146 7.531 4.526 7.604-4.552v-1.151l-0.010 0.005v-3.74l3.385-2.021zM26.974 12.661l-4.391 2.589-6.615-3.938-0.010 1.146 5.651 3.359-0.047 0.031-0.125 0.073-0.802 0.474-4.667-2.776-0.010 1.141 3.682 2.193-0.87 0.583-0.021 0.010-2.781-1.641-0.010 1.146 1.823 1.078-1.859 1.115-10.88-6.469 10.896-6.547zM26.979 11.51l-11.042-6.51-10.917 6.5v-8.688l10.979-1.151 10.984 1.151v8.693z"/>
    </svg>
);

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactElement }> = ({ title, value, icon }) => (
    <div className="bg-surface p-6 rounded-lg shadow-md flex items-center">
        <div className="bg-primary text-white rounded-full h-12 w-12 flex items-center justify-center p-2">
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-text-secondary">{title}</p>
            <p className="text-2xl font-bold text-primary">{value}</p>
        </div>
    </div>
);

const ActionCard: React.FC<{ to: string, title: string, description: string, permission: boolean }> = ({ to, title, description, permission }) => {
    if(!permission) return null;
    return (
        <Link to={to} className="bg-surface p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow transform hover:-translate-y-1">
            <h3 className="text-lg font-semibold text-primary">{title}</h3>
            <p className="text-text-secondary mt-2">{description}</p>
        </Link>
    )
}

const DashboardPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (user?.schoolId) {
        try {
          const data = await apiService.getDashboardStats(user.schoolId);
          setStats(data);
        } catch (error) {
          console.error('Failed to fetch dashboard stats:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchStats();
  }, [user]);

  if (loading) {
    return <div>Cargando panel...</div>;
  }

  return (
    <div>
        <div className="mb-8">
             <h1 className="text-3xl font-bold text-primary">
                Panel de Control <span className="text-accent">{stats?.schoolName}</span>
            </h1>
            <p className="text-text-secondary">Administra los contenidos y usuarios de la aplicación móvil.</p>
        </div>
        
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Usuarios Totales" value={stats?.totalUsers ?? 0} icon={<TotalUsersIcon />} />
        <StatCard title="Estudiantes" value={stats?.students ?? 0} icon={<StudentsIcon />} />
        <StatCard title="Profesores" value={stats?.teachers ?? 0} icon={<TeachersIcon />} />
        <StatCard title="Cursos Activos" value={stats?.courses ?? 0} icon={<CoursesIcon />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ActionCard to="/users" title="Gestión de Usuarios" description="Gestiona estudiantes, profesores y padres de familia." permission={hasPermission([6, 7])} />
        <ActionCard to="/courses" title="Gestión de Cursos" description="Administra el catálogo de cursos disponibles." permission={hasPermission([6, 7, 2, 9, 10])} />
        <ActionCard to="/notifications/send" title="Notificaciones Push" description="Envía alertas directamente a la app móvil de los usuarios." permission={hasPermission([6, 2, 9, 10])} />
        <ActionCard to="/classrooms" title="Salones" description="Gestiona los salones de clase y asigna estudiantes." permission={hasPermission([6, 7, 2, 9, 10])} />
        <ActionCard to="/evaluations" title="Evaluaciones" description="Crea y gestiona las evaluaciones de los cursos." permission={hasPermission([6, 7, 8, 2, 9, 10])} />
        <ActionCard to="/extracurriculars" title="Actividades Extra" description="Gestiona las actividades extracurriculares del colegio." permission={hasPermission([6, 7])} />
        <ActionCard to="/certificates" title="Gestión de Constancias" description="Genera y administra constancias de estudio, conducta y más." permission={hasPermission([6])} />
        <ActionCard to="/products" title="Gestión de Productos" description="Administra productos y servicios para la venta." permission={hasPermission([6])} />
        <ActionCard to="/enrollments" title="Inscripciones" description="Gestiona las inscripciones de los estudiantes a los cursos." permission={hasPermission([6])} />
      </div>
    </div>
  );
};

export default DashboardPage;