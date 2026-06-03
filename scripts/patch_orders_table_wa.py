#!/usr/bin/env python3
"""Agrega botón WhatsApp Factura por fila en la tabla de pedidos."""
import sys

filepath = sys.argv[1]

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Old: the VER link cell
old_marker = '''                                    <td className="p-5 text-right" data-label="">
                                        <Tooltip content="Ver detalles del pedido">
                                            <Link
                                                href={`/dashboard/orders/${order.id}`}
                                                className="text-[10px] font-black text-brand-orange hover:text-white transition-all flex items-center justify-end gap-1"
                                            >
                                                VER <ChevronRight size={10} />
                                            </Link>
                                        </Tooltip>
                                    </td>'''

new_marker = '''                                    <td className="p-5 text-right" data-label="">
                                        <div className="flex items-center justify-end gap-2">
                                            {order.customerPhone && (
                                                <Tooltip content="Enviar factura por WhatsApp">
                                                    <a
                                                        href={(() => {
                                                            let c = order.customerPhone.replace(/\\D/g, '')
                                                            if (c.startsWith('0')) c = c.substring(1)
                                                            if (!c.startsWith('549') && !c.startsWith('54') && c.length === 10) c = '549' + c
                                                            if (c.startsWith('54') && !c.startsWith('549')) c = '549' + c.substring(2)
                                                            const invoiceUrl = window.location.origin + '/dashboard/orders/' + order.id
                                                            const msg = '\\U0001f9fe *FACTURA PrintHype - JR3D*\\n\\nCliente: ' + order.customerName + '\\nTotal: $' + order.totalPrice.toLocaleString() + '\\nEstado: ' + order.status + '\\n\\nPod\\u00e9s ver tu factura ac\\u00e1:\\n' + invoiceUrl
                                                            return 'https://wa.me/' + c + '?text=' + encodeURIComponent(msg)
                                                        })()}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500/20 transition-all"
                                                        title="Enviar Factura WhatsApp"
                                                    >
                                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                                                    </a>
                                                </Tooltip>
                                            )}
                                            <Tooltip content="Ver detalles del pedido">
                                                <Link
                                                    href={`/dashboard/orders/${order.id}`}
                                                    className="text-[10px] font-black text-brand-orange hover:text-white transition-all flex items-center justify-end gap-1"
                                                >
                                                    VER <ChevronRight size={10} />
                                                </Link>
                                            </Tooltip>
                                        </div>
                                    </td>'''

if old_marker in content:
    content = content.replace(old_marker, new_marker, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print('OK: Reemplazo en tabla de pedidos exitoso')
else:
    print('ERR: No se encontró el marcador en tabla')
    # Show the first occurrence of relevant text
    idx = content.find('VER <ChevronRight')
    if idx >= 0:
        # Show surrounding context
        start = max(0, idx - 200)
        end = min(len(content), idx + 300)
        snippet = content[start:end]
        print(f'Found VER marker at position {idx}, showing context:')
        print(repr(snippet))
