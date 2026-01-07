import { useState, useEffect, useRef } from 'react';
import { supabase, Invoice, InvoiceStatus } from '../lib/supabase';
import { Trash2, FileText, DollarSign, Calendar, User, CheckCircle, Send, XCircle, AlertCircle, Eye, ChevronDown, BarChart3, Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadInvoices = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('invoices')
      .select('*, service:services(*, customer:customers(*), technician:user_profiles(*)), customer:customers(*)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setInvoices(data as Invoice[]);
    }
    setLoading(false);
  };

  const updateInvoiceStatus = async (invoice: Invoice, newStatus: InvoiceStatus) => {
    const updateData: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'paid') {
      updateData.paid_date = new Date().toISOString().split('T')[0];
    }
    
    await supabase.from('invoices').update(updateData).eq('id', invoice.id);
    loadInvoices();
  };

  const handleDelete = async (invoice: Invoice) => {
    if (window.confirm('¿Estás seguro de eliminar la factura ' + invoice.invoice_number + '?')) {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (!error) {
        loadInvoices();
      } else {
        alert('Error al eliminar la factura: ' + error.message);
      }
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return 'bg-slate-100 text-slate-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'paid': return 'Pagada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft': return <FileText size={14} />;
      case 'sent': return <Send size={14} />;
      case 'paid': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const getStatusDotColor = (status: InvoiceStatus | 'all') => {
    switch (status) {
      case 'all': return 'bg-slate-400';
      case 'draft': return 'bg-slate-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-slate-400';
    }
  };

  const filterOptions = [
    { value: 'all' as const, label: 'Todas' },
    { value: 'draft' as const, label: 'Borradores' },
    { value: 'sent' as const, label: 'Enviadas' },
    { value: 'paid' as const, label: 'Pagadas' },
    { value: 'cancelled' as const, label: 'Canceladas' },
  ];

  const currentFilter = filterOptions.find(f => f.value === filterStatus);

  const handleFilterSelect = (status: InvoiceStatus | 'all') => {
    setFilterStatus(status);
    setFilterMenuOpen(false);
  };

  const filteredInvoices = filterStatus === 'all' ? invoices : invoices.filter((inv) => inv.status === filterStatus);

  const totalPaid = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0);
  const totalPending = invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0);
  const totalDraft = invoices.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + inv.total, 0);

  const handlePrint = (invoice: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Factura ${invoice.invoice_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            color: #1e293b;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #0f172a;
          }
          .company-info h1 { 
            font-size: 28px; 
            color: #0f172a;
            margin-bottom: 8px;
          }
          .company-info p { 
            color: #64748b; 
            font-size: 14px;
            line-height: 1.6;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-number {
            font-size: 24px;
            font-weight: bold;
            color: #0f172a;
            margin-bottom: 8px;
          }
          .status {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
          }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-sent { background: #dbeafe; color: #1e40af; }
          .status-draft { background: #f1f5f9; color: #475569; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          
          .info-section {
            display: flex;
            justify-content: space-between;
            margin: 30px 0;
          }
          .info-box {
            width: 48%;
          }
          .info-box h3 {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .info-box p {
            font-size: 14px;
            line-height: 1.8;
            color: #1e293b;
          }
          .info-box .label {
            font-weight: 600;
            color: #475569;
          }
          
          .service-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 30px 0;
          }
          .service-section h3 {
            font-size: 16px;
            color: #0f172a;
            margin-bottom: 12px;
            font-weight: 600;
          }
          .service-section p {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 8px;
          }
          
          .costs-table {
            width: 100%;
            margin: 30px 0;
            border-collapse: collapse;
          }
          .costs-table tr {
            border-bottom: 1px solid #e2e8f0;
          }
          .costs-table td {
            padding: 12px 0;
            font-size: 14px;
          }
          .costs-table td:first-child {
            color: #64748b;
          }
          .costs-table td:last-child {
            text-align: right;
            color: #1e293b;
            font-weight: 500;
          }
          .costs-table .subtotal-row td {
            padding-top: 20px;
            font-weight: 600;
          }
          .costs-table .total-row {
            border-top: 2px solid #0f172a;
            border-bottom: none;
          }
          .costs-table .total-row td {
            padding: 16px 0;
            font-size: 20px;
            font-weight: bold;
            color: #0f172a;
          }
          
          .notes {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
          }
          .notes h3 {
            font-size: 14px;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 8px;
            font-weight: 600;
          }
          .notes p {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            text-align: center;
            color: #94a3b8;
            font-size: 12px;
          }
          
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>AC Management</h1>
            <p>Sistema de Gestión de Climatización</p>
          </div>
          <div class="invoice-details">
            <div class="invoice-number">Factura ${invoice.invoice_number}</div>
            <span class="status status-${invoice.status}">${
              invoice.status === 'paid' ? 'Pagada' :
              invoice.status === 'sent' ? 'Enviada' :
              invoice.status === 'draft' ? 'Borrador' : 'Cancelada'
            }</span>
          </div>
        </div>

        <div class="info-section">
          <div class="info-box">
            <h3>Cliente</h3>
            <p><strong>${invoice.customer?.name || 'N/A'}</strong></p>
            ${invoice.customer?.email ? `<p>${invoice.customer.email}</p>` : ''}
            ${invoice.customer?.phone ? `<p>${invoice.customer.phone}</p>` : ''}
            ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
          </div>
          <div class="info-box">
            <h3>Fechas</h3>
            <p><span class="label">Emisión:</span> ${new Date(invoice.issue_date).toLocaleDateString('es-MX')}</p>
            <p><span class="label">Vencimiento:</span> ${new Date(invoice.due_date).toLocaleDateString('es-MX')}</p>
            ${invoice.paid_date ? `<p><span class="label">Pagada:</span> ${new Date(invoice.paid_date).toLocaleDateString('es-MX')}</p>` : ''}
          </div>
        </div>

        <div class="service-section">
          <h3>Servicio</h3>
          <p><strong>${invoice.service?.title || 'N/A'}</strong></p>
          ${invoice.service?.description ? `<p>${invoice.service.description}</p>` : ''}
          <p style="margin-top: 12px;">
            <span class="label">Técnico:</span> ${invoice.service?.technician?.full_name || 'N/A'} • 
            <span class="label">Fecha:</span> ${invoice.service?.scheduled_date ? new Date(invoice.service.scheduled_date).toLocaleDateString('es-MX') : 'N/A'}
          </p>
        </div>

        <table class="costs-table">
          <tr>
            <td>Mano de Obra</td>
            <td>$${(invoice.service?.labor_cost || 0).toFixed(2)}</td>
          </tr>
          <tr>
            <td>Materiales</td>
            <td>$${(invoice.service?.materials_cost || 0).toFixed(2)}</td>
          </tr>
          <tr class="subtotal-row">
            <td>Subtotal</td>
            <td>$${invoice.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>IVA (${invoice.tax_rate}%)</td>
            <td>$${invoice.tax_amount.toFixed(2)}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL</td>
            <td>$${invoice.total.toFixed(2)}</td>
          </tr>
        </table>

        ${invoice.notes ? `
          <div class="notes">
            <h3>Notas</h3>
            <p>${invoice.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>Factura generada el ${new Date().toLocaleDateString('es-MX')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleSaveAsImage = async (invoice: Invoice) => {
    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px';
    container.style.background = 'white';
    container.style.padding = '40px';
    
    container.innerHTML = `
      <div style="font-family: Arial, sans-serif; color: #1e293b;">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0f172a;">
          <div>
            <h1 style="font-size: 28px; color: #0f172a; margin-bottom: 8px;">AC Management</h1>
            <p style="color: #64748b; font-size: 14px;">Sistema de Gestión de Climatización</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 24px; font-weight: bold; color: #0f172a; margin-bottom: 8px;">Factura ${invoice.invoice_number}</div>
            <span style="display: inline-block; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; background: ${
              invoice.status === 'paid' ? '#dcfce7; color: #166534' :
              invoice.status === 'sent' ? '#dbeafe; color: #1e40af' :
              invoice.status === 'draft' ? '#f1f5f9; color: #475569' : '#fee2e2; color: #991b1b'
            };">${
              invoice.status === 'paid' ? 'Pagada' :
              invoice.status === 'sent' ? 'Enviada' :
              invoice.status === 'draft' ? 'Borrador' : 'Cancelada'
            }</span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin: 25px 0;">
          <div style="width: 48%;">
            <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">Cliente</h3>
            <p style="font-weight: bold; margin-bottom: 4px;">${invoice.customer?.name || 'N/A'}</p>
            ${invoice.customer?.email ? `<p style="font-size: 14px; color: #475569; margin-bottom: 4px;">${invoice.customer.email}</p>` : ''}
            ${invoice.customer?.phone ? `<p style="font-size: 14px; color: #475569; margin-bottom: 4px;">${invoice.customer.phone}</p>` : ''}
            ${invoice.customer?.address ? `<p style="font-size: 14px; color: #475569;">${invoice.customer.address}</p>` : ''}
          </div>
          <div style="width: 48%;">
            <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; margin-bottom: 12px; font-weight: 600;">Fechas</h3>
            <p style="font-size: 14px; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569;">Emisión:</span> ${new Date(invoice.issue_date).toLocaleDateString('es-MX')}</p>
            <p style="font-size: 14px; margin-bottom: 4px;"><span style="font-weight: 600; color: #475569;">Vencimiento:</span> ${new Date(invoice.due_date).toLocaleDateString('es-MX')}</p>
            ${invoice.paid_date ? `<p style="font-size: 14px;"><span style="font-weight: 600; color: #475569;">Pagada:</span> ${new Date(invoice.paid_date).toLocaleDateString('es-MX')}</p>` : ''}
          </div>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="font-size: 16px; color: #0f172a; margin-bottom: 12px; font-weight: 600;">Servicio</h3>
          <p style="font-weight: bold; margin-bottom: 8px;">${invoice.service?.title || 'N/A'}</p>
          ${invoice.service?.description ? `<p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 8px;">${invoice.service.description}</p>` : ''}
          <p style="font-size: 14px; margin-top: 12px;">
            <span style="font-weight: 600; color: #475569;">Técnico:</span> ${invoice.service?.technician?.full_name || 'N/A'} • 
            <span style="font-weight: 600; color: #475569;">Fecha:</span> ${invoice.service?.scheduled_date ? new Date(invoice.service.scheduled_date).toLocaleDateString('es-MX') : 'N/A'}
          </p>
        </div>

        <div style="margin: 25px 0;">
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Mano de Obra</span>
            <span style="font-weight: 500; font-size: 14px;">$${(invoice.service?.labor_cost || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">Materiales</span>
            <span style="font-weight: 500; font-size: 14px;">$${(invoice.service?.materials_cost || 0).toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px; font-weight: 600;">Subtotal</span>
            <span style="font-weight: 600; font-size: 14px;">$${invoice.subtotal.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #64748b; font-size: 14px;">IVA (${invoice.tax_rate}%)</span>
            <span style="font-weight: 500; font-size: 14px;">$${invoice.tax_amount.toFixed(2)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; padding: 16px 0; border-top: 2px solid #0f172a;">
            <span style="font-size: 20px; font-weight: bold; color: #0f172a;">TOTAL</span>
            <span style="font-size: 20px; font-weight: bold; color: #0f172a;">$${invoice.total.toFixed(2)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <h3 style="font-size: 14px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; font-weight: 600;">Notas</h3>
            <p style="font-size: 14px; line-height: 1.6; color: #475569;">${invoice.notes}</p>
          </div>
        ` : ''}

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
          <p>Factura generada el ${new Date().toLocaleDateString('es-MX')}</p>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      document.body.removeChild(container);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `factura-${invoice.invoice_number}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      document.body.removeChild(container);
      alert('Error al generar la imagen');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-600">Cargando facturas...</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Facturación</h2>
          <p className="text-slate-600 text-sm sm:text-base mt-1 hidden sm:block">Gestiona las facturas de los servicios completados</p>
        </div>
      </div>

      {/* Filtros - Móvil (dropdown) */}
      <div className="md:hidden mb-4 relative" ref={filterMenuRef}>
        <button
          onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          className="w-full flex items-center justify-between bg-white border border-slate-200 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span className={'w-2 h-2 rounded-full ' + getStatusDotColor(filterStatus)}></span>
            <span className="font-medium text-slate-900">{currentFilter?.label}</span>
          </div>
          <ChevronDown size={20} className={'text-slate-500 transition-transform duration-200 ' + (filterMenuOpen ? 'rotate-180' : '')} />
        </button>

        {filterMenuOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-30">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterSelect(option.value)}
                className={'w-full flex items-center gap-3 px-4 py-3 transition ' + (
                  filterStatus === option.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className={'w-2 h-2 rounded-full ' + getStatusDotColor(option.value)}></span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filtros - Desktop */}
      <div className="hidden md:flex gap-2 mb-6">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilterStatus(option.value)}
            className={'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ' + (
              filterStatus === option.value
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Stats - Botón para mostrar en móvil */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowStats(!showStats)}
          className="w-full flex items-center justify-between bg-slate-100 rounded-lg px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-slate-600" />
            <span className="font-medium text-slate-700">Estadísticas</span>
          </div>
          <ChevronDown size={20} className={'text-slate-500 transition-transform duration-200 ' + (showStats ? 'rotate-180' : '')} />
        </button>

        {showStats && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-700 text-xs font-medium">Pagadas</p>
              <p className="text-lg font-bold text-green-800">${totalPaid.toFixed(2)}</p>
              <p className="text-[10px] text-green-600">{invoices.filter(inv => inv.status === 'paid').length} facturas</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-700 text-xs font-medium">Por Cobrar</p>
              <p className="text-lg font-bold text-blue-800">${totalPending.toFixed(2)}</p>
              <p className="text-[10px] text-blue-600">{invoices.filter(inv => inv.status === 'sent').length} facturas</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <p className="text-slate-700 text-xs font-medium">Borradores</p>
              <p className="text-lg font-bold text-slate-800">${totalDraft.toFixed(2)}</p>
              <p className="text-[10px] text-slate-600">{invoices.filter(inv => inv.status === 'draft').length} facturas</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-purple-700 text-xs font-medium">Total</p>
              <p className="text-lg font-bold text-purple-800">${(totalPaid + totalPending + totalDraft).toFixed(2)}</p>
              <p className="text-[10px] text-purple-600">{invoices.length} facturas</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats - Desktop (siempre visible) */}
      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-600" />
            <p className="text-green-700 text-sm font-medium">Pagadas</p>
          </div>
          <p className="text-2xl font-bold text-green-800">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-green-600">{invoices.filter(inv => inv.status === 'paid').length} facturas</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send size={18} className="text-blue-600" />
            <p className="text-blue-700 text-sm font-medium">Por Cobrar</p>
          </div>
          <p className="text-2xl font-bold text-blue-800">${totalPending.toFixed(2)}</p>
          <p className="text-xs text-blue-600">{invoices.filter(inv => inv.status === 'sent').length} facturas</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-slate-600" />
            <p className="text-slate-700 text-sm font-medium">Borradores</p>
          </div>
          <p className="text-2xl font-bold text-slate-800">${totalDraft.toFixed(2)}</p>
          <p className="text-xs text-slate-600">{invoices.filter(inv => inv.status === 'draft').length} facturas</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-purple-600" />
            <p className="text-purple-700 text-sm font-medium">Total Facturado</p>
          </div>
          <p className="text-2xl font-bold text-purple-800">${(totalPaid + totalPending + totalDraft).toFixed(2)}</p>
          <p className="text-xs text-purple-600">{invoices.length} facturas totales</p>
        </div>
      </div>

      {/* Lista de facturas - Móvil (cards) */}
      <div className="md:hidden space-y-3">
        {filteredInvoices.map((invoice) => (
          <div key={invoice.id} className="bg-white border border-slate-200 rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="font-mono font-semibold text-sm text-slate-900">{invoice.invoice_number}</span>
                <p className="text-xs text-slate-600 mt-0.5">{invoice.customer?.name || 'N/A'}</p>
              </div>
              <span className={'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ' + getStatusColor(invoice.status)}>
                {getStatusIcon(invoice.status)}
                {getStatusLabel(invoice.status)}
              </span>
            </div>
            
            <p className="text-xs text-slate-500 truncate mb-2">{invoice.service?.title || 'N/A'}</p>
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar size={12} />
                <span>{new Date(invoice.issue_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
              </div>
              <span className="font-semibold text-slate-900">${invoice.total.toFixed(2)}</span>
            </div>

            <div className="flex gap-1 mt-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-slate-600 hover:bg-slate-50 rounded transition"
              >
                <Eye size={14} /> Ver
              </button>
              {invoice.status === 'draft' && (
                <button
                  onClick={() => updateInvoiceStatus(invoice, 'sent')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition"
                >
                  <Send size={14} /> Enviar
                </button>
              )}
              {invoice.status === 'sent' && (
                <button
                  onClick={() => updateInvoiceStatus(invoice, 'paid')}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded transition"
                >
                  <CheckCircle size={14} /> Pagada
                </button>
              )}
              {(invoice.status === 'draft' || invoice.status === 'sent') && (
                <button
                  onClick={() => updateInvoiceStatus(invoice, 'cancelled')}
                  className="flex items-center justify-center gap-1 py-1.5 px-2 text-xs text-orange-600 hover:bg-orange-50 rounded transition"
                >
                  <XCircle size={14} />
                </button>
              )}
              <button
                onClick={() => handleDelete(invoice)}
                className="flex items-center justify-center gap-1 py-1.5 px-2 text-xs text-red-600 hover:bg-red-50 rounded transition"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de facturas - Desktop (tabla) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">N° Factura</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Cliente</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Servicio</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Fecha</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Estado</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4">
                  <span className="font-mono font-semibold text-slate-900">{invoice.invoice_number}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span className="text-slate-900">{invoice.customer?.name || 'N/A'}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-slate-600 truncate max-w-[200px] block">
                    {invoice.service?.title || 'N/A'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Calendar size={14} className="text-slate-400" />
                    <span>{new Date(invoice.issue_date).toLocaleDateString('es-MX')}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-semibold text-slate-900">${invoice.total.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4">
                  <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ' + getStatusColor(invoice.status)}>
                    {getStatusIcon(invoice.status)}
                    {getStatusLabel(invoice.status)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedInvoice(invoice); setShowDetailModal(true); }}
                      className="p-2 text-slate-400 hover:text-blue-600 transition"
                      title="Ver detalle"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handlePrint(invoice)}
                      className="p-2 text-slate-400 hover:text-purple-600 transition"
                      title="Imprimir"
                    >
                      <Printer size={18} />
                    </button>
                    {invoice.status === 'draft' && (
                      <button
                        onClick={() => updateInvoiceStatus(invoice, 'sent')}
                        className="p-2 text-slate-400 hover:text-blue-600 transition"
                        title="Marcar como enviada"
                      >
                        <Send size={18} />
                      </button>
                    )}
                    {invoice.status === 'sent' && (
                      <button
                        onClick={() => updateInvoiceStatus(invoice, 'paid')}
                        className="p-2 text-slate-400 hover:text-green-600 transition"
                        title="Marcar como pagada"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    {(invoice.status === 'draft' || invoice.status === 'sent') && (
                      <button
                        onClick={() => updateInvoiceStatus(invoice, 'cancelled')}
                        className="p-2 text-slate-400 hover:text-orange-600 transition"
                        title="Cancelar"
                      >
                        <XCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(invoice)}
                      className="p-2 text-slate-400 hover:text-red-600 transition"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500">
            No hay facturas {filterStatus !== 'all' ? 'con estado "' + getStatusLabel(filterStatus) + '"' : 'registradas'}
          </p>
          <p className="text-sm text-slate-400 mt-2">
            Las facturas se generan desde los servicios completados
          </p>
        </div>
      )}

      {/* Modal de detalle */}
      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4 sm:mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Factura {selectedInvoice.invoice_number}</h3>
                <span className={'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mt-2 ' + getStatusColor(selectedInvoice.status)}>
                  {getStatusIcon(selectedInvoice.status)}
                  {getStatusLabel(selectedInvoice.status)}
                </span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Cliente</h4>
                <p className="text-slate-900">{selectedInvoice.customer?.name}</p>
                {selectedInvoice.customer?.email && (
                  <p className="text-sm text-slate-600">{selectedInvoice.customer.email}</p>
                )}
                {selectedInvoice.customer?.phone && (
                  <p className="text-sm text-slate-600">{selectedInvoice.customer.phone}</p>
                )}
                {selectedInvoice.customer?.address && (
                  <p className="text-sm text-slate-600">{selectedInvoice.customer.address}</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-2">Fechas</h4>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Emisión:</span> {new Date(selectedInvoice.issue_date).toLocaleDateString('es-MX')}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Vencimiento:</span> {new Date(selectedInvoice.due_date).toLocaleDateString('es-MX')}
                </p>
                {selectedInvoice.paid_date && (
                  <p className="text-sm text-green-600">
                    <span className="font-medium">Pagada:</span> {new Date(selectedInvoice.paid_date).toLocaleDateString('es-MX')}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 mb-4 sm:mb-6">
              <h4 className="font-semibold text-slate-700 mb-3">Servicio</h4>
              <div className="bg-slate-50 rounded-lg p-3 sm:p-4">
                <p className="font-medium text-slate-900">{selectedInvoice.service?.title}</p>
                {selectedInvoice.service?.description && (
                  <p className="text-sm text-slate-600 mt-1">{selectedInvoice.service.description}</p>
                )}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p className="text-slate-600">
                    <span className="font-medium">Técnico:</span> {selectedInvoice.service?.technician?.full_name || 'N/A'}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-medium">Fecha:</span> {selectedInvoice.service?.scheduled_date ? new Date(selectedInvoice.service.scheduled_date).toLocaleDateString('es-MX') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="font-semibold text-slate-700 mb-3">Detalle de Costos</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Mano de Obra</span>
                  <span className="text-slate-900">${selectedInvoice.service?.labor_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Materiales</span>
                  <span className="text-slate-900">${selectedInvoice.service?.materials_cost?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-200 pt-2">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="text-slate-900">${selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">IVA ({selectedInvoice.tax_rate}%)</span>
                  <span className="text-slate-900">${selectedInvoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t border-slate-200 pt-2">
                  <span className="text-slate-900">Total</span>
                  <span className="text-slate-900">${selectedInvoice.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="border-t border-slate-200 pt-4 mt-4">
                <h4 className="font-semibold text-slate-700 mb-2">Notas</h4>
                <p className="text-sm text-slate-600">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 mt-6">
              <button
                onClick={() => handlePrint(selectedInvoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                <Printer size={18} /> Imprimir
              </button>
              <button
                onClick={() => handleSaveAsImage(selectedInvoice)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <Download size={18} /> Guardar Imagen
              </button>
              {selectedInvoice.status === 'draft' && (
                <button
                  onClick={() => {
                    updateInvoiceStatus(selectedInvoice, 'sent');
                    setShowDetailModal(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  <Send size={18} /> Marcar como Enviada
                </button>
              )}
              {selectedInvoice.status === 'sent' && (
                <button
                  onClick={() => {
                    updateInvoiceStatus(selectedInvoice, 'paid');
                    setShowDetailModal(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  <CheckCircle size={18} /> Marcar como Pagada
                </button>
              )}
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
