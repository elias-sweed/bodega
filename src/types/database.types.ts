export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type ProductosRow = {
  id: string
  codigo_barras: string | null
  nombre: string
  precio_venta: number
  costo: number
  stock_actual: number
  stock_minimo: number
  categoria: string
  created_at: string
}

export type ProductosInsert = Omit<ProductosRow, 'id' | 'created_at'>
export type ProductosUpdate = Partial<ProductosInsert>

export type VentasRow = {
  id: string
  fecha: string
  total: number
  metodo_pago: string
  origen: string
  ticket_externo: string | null
  idempotency_key: string | null
  creado_por: string | null
}

export type DetalleVentasRow = {
  id: string
  venta_id: string
  producto_id: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
  costo_unitario: number | null
}

export type RegistrarVentaResult = {
  venta_id: string
  total: number
  idempotency_key: string
  items: {
    producto_id: string | null
    cantidad: number
    precio_unitario: number
    subtotal: number
  }[]
}

export type RegistrarVentaBackfillResult = {
  venta_id: string
  total: number
  idempotency_key: string
  stock_negativo: false
}

export type ProveedoresRow = {
  id: string
  nombre: string
  empresa: string | null
  created_at: string
}

export type ProveedoresInsert = Omit<ProveedoresRow, 'id' | 'created_at'>

export type IngresosMercaderiaRow = {
  id: string
  compra_id: string | null
  proveedor_id: string | null
  nombre_proveedor: string | null
  producto_id: string | null
  cantidad_ingresada: number
  costo_total: number
  comprobante: string | null
  motivo: string | null
  fecha: string
  created_at?: string | null
  creado_por: string | null
  productos?: { nombre: string | null } | null
}

export type RegistrarIngresoResult = {
  ingreso_id: string
  stock_actual: number
}

export type RegistrarCompraItem = {
  producto_id: string
  cantidad: number
  costo_total: number
}

export type RegistrarCompraResult = {
  compra_id: string
  total: number
  items: number
}

export type CargarInventarioInicialItem =
  | {
      tipo: 'existente'
      producto_id: string
      cantidad: number
    }
  | {
      tipo: 'nuevo'
      nombre: string
      categoria: string
      codigo_barras: string | null
      precio_venta: number
      stock_minimo: number
      cantidad: number
    }

export type CargarInventarioInicialResult = {
  productos: number
  creados: number
  actualizados: number
  unidades: number
}

export type ActualizarProductoResult = {
  producto_id: string
  stock_actual: number | null
  delta: number
}

export type DashboardResumenResult = {
  ventas_hoy_total: number
  ventas_hoy_count: number
  efectivo_hoy: number
  yape_hoy: number
  plin_hoy: number
  gasto_compras_mes: number
  ganancia_estimada_hoy: number
  total_productos: number
  bajos_stock: number
  agotados: number
}

export type RegistrarAjusteManualResult = {
  ingreso_id: string | null
  stock_actual: number
  delta: number
}

export type UsuarioRol = 'admin' | 'cajero'

export type UsuariosAutorizadosRow = {
  email: string
  rol: UsuarioRol
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      productos: {
        Row: ProductosRow
        Insert: ProductosInsert
        Update: ProductosUpdate
        Relationships: []
      }
      ventas: {
        Row: VentasRow
        Insert: Omit<VentasRow, 'id' | 'fecha'>
        Update: Partial<Omit<VentasRow, 'id' | 'fecha'>>
        Relationships: []
      }
      detalle_ventas: {
        Row: DetalleVentasRow
        Insert: Omit<DetalleVentasRow, 'id'>
        Update: Partial<Omit<DetalleVentasRow, 'id'>>
        Relationships: []
      }
      proveedores: {
        Row: ProveedoresRow
        Insert: ProveedoresInsert
        Update: Partial<ProveedoresInsert>
        Relationships: []
      }
      ingresos_mercaderia: {
        Row: IngresosMercaderiaRow
        Insert: Omit<IngresosMercaderiaRow, 'id' | 'fecha'>
        Update: Partial<Omit<IngresosMercaderiaRow, 'id' | 'fecha'>>
        Relationships: [
          {
            foreignKeyName: 'ingresos_mercaderia_producto_id_fkey'
            columns: ['producto_id']
            isOneToOne: false
            referencedRelation: 'productos'
            referencedColumns: ['id']
          },
        ]
      }
      usuarios_autorizados: {
        Row: UsuariosAutorizadosRow
        Insert: Omit<UsuariosAutorizadosRow, 'created_at'>
        Update: Partial<Omit<UsuariosAutorizadosRow, 'created_at'>>
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_venta_caja: {
        Args: {
          p_articulos: Json[]
          p_metodo_pago: string
          p_idempotency_key: string
        }
        Returns: RegistrarVentaResult
      }
      registrar_venta_backfill: {
        Args: {
          p_articulos: Json[]
          p_metodo_pago: string
          p_fecha: string
          p_ticket: string
        }
        Returns: RegistrarVentaBackfillResult
      }
      registrar_compra: {
        Args: {
          p_proveedor_id: string | null
          p_nombre_proveedor: string | null
          p_comprobante: string | null
          p_items: Json[]
          p_idempotency_key: string
        }
        Returns: RegistrarCompraResult
      }
      registrar_ajuste_manual: {
        Args: {
          p_producto_id: string
          p_nuevo_stock: number
          p_es_regalo: boolean
          p_motivo: string
        }
        Returns: RegistrarAjusteManualResult
      }
      actualizar_producto: {
        Args: {
          p_id: string
          p_nombre: string
          p_categoria: string
          p_codigo_barras: string | null
          p_precio_venta: number
          p_costo: number
          p_stock_minimo: number
          p_nuevo_stock: number | null
          p_motivo: string
        }
        Returns: ActualizarProductoResult
      }
      crear_producto: {
        Args: {
          p_nombre: string
          p_categoria: string
          p_codigo_barras: string | null
          p_precio_venta: number
          p_costo: number
          p_stock_inicial: number
          p_stock_minimo: number
        }
        Returns: ProductosRow
      }
      cargar_inventario_inicial: {
        Args: { p_items: Json[] }
        Returns: CargarInventarioInicialResult
      }
      cambiar_rol_usuario: {
        Args: { p_email: string; p_rol: UsuarioRol }
        Returns: { email: string; rol: UsuarioRol }
      }
      eliminar_usuario_autorizado: {
        Args: { p_email: string }
        Returns: undefined
      }
      dashboard_resumen: {
        Args: Record<PropertyKey, never>
        Returns: DashboardResumenResult
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
