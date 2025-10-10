import { useState, useEffect } from 'react';
import { supabase, Product } from '../lib/supabase';
import { Plus, Edit2, AlertTriangle, Package, Trash2 } from 'lucide-react';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    stock: 0,
    min_stock: 10,
    price: 0,
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (!error && data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProduct) {
      await supabase
        .from('products')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([formData]);
    }

    setShowModal(false);
    setEditingProduct(null);
    setFormData({ name: '', description: '', stock: 0, min_stock: 10, price: 0 });
    loadProducts();
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      stock: product.stock,
      min_stock: product.min_stock,
      price: product.price,
    });
    setShowModal(true);
  };

  const openNewModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', stock: 0, min_stock: 10, price: 0 });
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    // Check if product is used in any sales
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('id')
      .eq('product_id', product.id)
      .limit(1);

    let confirmMessage = `¿Estás seguro de eliminar el producto "${product.name}"?`;
    
    if (saleItems && saleItems.length > 0) {
      confirmMessage += '\n\n⚠️ ADVERTENCIA: Este producto tiene ventas asociadas. Al eliminarlo, las referencias en las ventas se establecerán como NULL (producto eliminado).';
    }

    if (window.confirm(confirmMessage)) {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (!error) {
        loadProducts();
      } else {
        alert('Error al eliminar el producto: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando inventario...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Inventario de Productos</h2>
          <p className="text-slate-600 mt-1">Gestiona el stock de tus productos de harina</p>
        </div>
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition"
        >
          <Plus size={20} />
          <span>Agregar Producto</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Package size={20} className="text-slate-700" />
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => openEditModal(product)}
                  className="text-slate-400 hover:text-blue-600 transition p-1"
                  title="Editar"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(product)}
                  className="text-slate-400 hover:text-red-600 transition p-1"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-slate-900 mb-2 line-clamp-1">{product.name}</h3>
            <p className="text-sm text-slate-600 mb-3 line-clamp-2">{product.description}</p>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600">Stock Actual:</span>
                <span
                  className={`font-bold ${
                    product.stock <= product.min_stock ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {product.stock} unidades
                </span>
              </div>

              {product.stock <= product.min_stock && (
                <div className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                  <AlertTriangle size={14} />
                  <span>Stock bajo</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Precio:</span>
                  <span className="font-semibold text-slate-900">${product.price.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
                >
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
