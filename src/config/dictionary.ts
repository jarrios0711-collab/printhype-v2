/**
 * Configuración Global de Nomenclatura Comercial (White-Label)
 * Modificar estas constantes para adaptar el ERP a cualquier otro rubro comercial.
 */

export const Dictionary = {
    global: {
        brandName: "PrintHype",
        dashboardSubtitle: "SaaS de Gestión Integral"
    },
    inventory: {
        title: "Inventario de Materiales",
        subtitle: "Gestión de stock de consumibles",
        itemLabel: "Material",          // Genérico: "Producto" / "Insumo"
        categoryLabel: "Tipo de Filamento",  // Genérico: "Categoría"
        brandLabel: "Marca / Fabricante",
        metric1: "Peso (g)",            // Genérico: "Unidades"
        metricPrice: "Precio / Kg",     // Genérico: "Precio Unitario"
        colorLabel: "Selector de Color",
        categories: ['PLA', 'PETG', 'TPU', 'Resina UV', 'ABS / ASA'], // Opciones
        addBtn: "AGREGAR MATERIAL",
        emptyState: "Comienza agregando un material a tu stock.",
    },
    orders: {
        title: "Gestión de Pedidos",
        subtitle: "Control de órdenes, estados y entregas.",
        orderRef: "Nombre del Proyecto / STL", // Genérico: "Detalle del Pedido" / "Producto Solicitado"
        budget: "Presupuesto ($)",
        consumerMetric: "Peso Estimado (gramos)", // Genérico: "Cantidad a consumir"
        stagePrinting: "En Producción", // Genérico: "En Proceso"
        addBtn: "NUEVA ORDEN",
    },
    projects: {
        title: "Work-Flow",
        subtitle: "Gestión visual de la cadena de producción.",
        addBtn: "NUEVO PROYECTO",
        columns: [
            { id: 'idea', title: '💡 Idea / Diseño', color: 'border-neutral-500/50' },
            { id: 'ready', title: '⏳ Para Producir', color: 'border-yellow-500/50' },
            { id: 'printing', title: '🔥 En Producción', color: 'border-brand-orange/50' },
            { id: 'done', title: '✅ Terminado', color: 'border-green-500/50' },
        ]
    }
}
