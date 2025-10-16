import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../../services/apiService';
import { useAuth } from '../../hooks/useAuth';
import { ProductWithAudiences, ProductAudience } from '../../types';

const AudienceToText = (a: ProductAudience) => {
    const t = (a.targetTypeRaw ?? "All").toLowerCase();
    switch (t) {
        case "all": return "Todos";
        case "role": return `Rol #${a.targetID}`;
        case "user": return `Usuario #${a.targetID}`;
        case "classroom": return `Aula #${a.targetID}`;
        default: return a.targetTypeRaw ?? "N/A";
    }
};

const ProductListPage: React.FC = () => {
    const [products, setProducts] = useState<ProductWithAudiences[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user, hasPermission } = useAuth();

    const canCreate = useMemo(() => hasPermission([6]), [hasPermission]);

    useEffect(() => {
        const fetchData = async () => {
            if (user?.schoolId) {
                try {
                    setLoading(true);
                    const data = await apiService.getProductsWithAudiences(user.schoolId);
                    setProducts(data);
                    setError('');
                } catch (err) {
                    setError('No se pudo cargar la lista de productos.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
                {canCreate && (
                    <Link to="/products/create" className="bg-main-blue text-white py-2 px-4 rounded hover:bg-black transition-colors">
                        Crear Producto
                    </Link>
                )}
            </div>

            {loading && <p>Cargando productos...</p>}
            {error && <p className="text-red-500">{error}</p>}

            {!loading && !error && (
                products.length > 0 ? (
                    <div className="bg-white shadow-md rounded-lg overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-main-blue">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">SKU</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Precio</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Audiencia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {products.map(({ product, audiences }) => {
                                    const displayAud = audiences.some(a => (a.targetTypeRaw ?? "").toLowerCase() === 'all')
                                        ? audiences.filter(a => (a.targetTypeRaw ?? "").toLowerCase() === 'all')
                                        : audiences;

                                    return (
                                        <tr key={product.productID} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">{product.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">{product.salePrice.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {product.isActive ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                {displayAud.length === 0 
                                                  ? <span className="text-xs text-gray-500">Todos</span>
                                                  : displayAud.map(a => (
                                                      <span key={a.productAudienceID} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{AudienceToText(a)}</span>
                                                  ))
                                                }
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <Link to={`/products/edit/${product.productID}`} className="text-yellow-600 hover:text-yellow-800">Editar</Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-white rounded-lg shadow-md">
                        <p className="text-gray-500">No hay productos registrados.</p>
                    </div>
                )
            )}
        </div>
    );
};

export default ProductListPage;