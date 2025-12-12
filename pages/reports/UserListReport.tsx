
import React from 'react';
import { User, ROLES } from '../../types';

interface UserListReportProps {
  users: (User & { classroomName?: string; parentNames?: string; parentEmails?: string })[];
  schoolName: string;
  templateRef: React.RefObject<HTMLDivElement>;
}

const UserListReport: React.FC<UserListReportProps> = ({ users, schoolName, templateRef }) => {
    
    const getRoleName = (roleId: number) => {
        return ROLES.find(r => r.id === roleId)?.name || 'Desconocido';
    };

    return (
        <div ref={templateRef} className="bg-white text-black font-sans p-8" style={{ width: '100%', minHeight: '210mm', boxSizing: 'border-box' }}>
            <style>{`
                @media print {
                    @page { size: landscape; margin: 10mm; }
                    body { -webkit-print-color-adjust: exact; }
                    html, body { height: 100%; }
                }
                .user-table { width: 100%; border-collapse: collapse; font-size: 9px; }
                .user-table th { background-color: #f3f4f6; font-weight: bold; text-align: left; border: 1px solid #000; padding: 4px; }
                .user-table td { border: 1px solid #000; padding: 4px; vertical-align: top; }
                .status-active { color: green; font-weight: bold; }
                .status-blocked { color: red; font-weight: bold; }
                .text-gray { color: #666; font-style: italic; }
            `}</style>

            <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold uppercase">LISTA DE USUARIOS</h1>
                <h2 className="text-xl text-gray-700">{schoolName}</h2>
                <p className="text-sm text-gray-500 mt-1">Fecha de emisión: {new Date().toLocaleDateString('es-ES')}</p>
            </div>

            <table className="user-table">
                <thead>
                    <tr>
                        <th style={{ width: '4%' }}>No.</th>
                        <th style={{ width: '18%' }}>Nombre Completo</th>
                        <th style={{ width: '8%' }}>Cédula</th>
                        <th style={{ width: '14%' }}>Correo Electrónico</th>
                        <th style={{ width: '8%' }}>Teléfono</th>
                        <th style={{ width: '8%' }}>Rol</th>
                        <th style={{ width: '10%' }}>Salón</th>
                        <th style={{ width: '12%' }}>Representante</th>
                        <th style={{ width: '14%' }}>Correo Rep.</th>
                        <th style={{ width: '4%' }}>Est.</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => (
                        <tr key={user.userID}>
                            <td className="text-center">{index + 1}</td>
                            <td>{user.userName}</td>
                            <td>{user.cedula || ''}</td>
                            <td>{user.email}</td>
                            <td>{user.phoneNumber || ''}</td>
                            <td>{getRoleName(user.roleID)}</td>
                            <td>{user.classroomName || ''}</td>
                            <td>{user.parentNames || ''}</td>
                            <td className="text-gray">{user.parentEmails || ''}</td>
                            <td className="text-center">
                                <span className={user.isBlocked ? 'status-blocked' : 'status-active'}>
                                    {user.isBlocked ? 'B' : 'A'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            <div className="mt-4 text-right text-xs">
                Total de usuarios: {users.length}
            </div>
        </div>
    );
};

export default UserListReport;
