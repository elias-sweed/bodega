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
  creado_por: string | null
}

export type VentasInsert = Omit<VentasRow, 'id' | 'fecha'>

export type DetalleVentasRow = {
  id: string
  venta_id: string
  producto_id: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
  costo_unitario: number | null
}

export type DetalleVentasInsert = Omit<DetalleVentasRow, 'id'>

export type RegistrarVentaResult = {
  venta_id: string
  total: number
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
  cantidad: number | null
  cantidad_ingresada: number
  costo_unitario?: number | null
  costo_total: number
  comprobante: string | null
  motivo: string | null
  fecha: string
  created_at?: string | null
  creado_por: string | null
  productos?: { nombre: string | null } | null
}

export type IngresosMercaderiaInsert = Omit<IngresosMercaderiaRow, 'id' | 'fecha'>

export type AjustesStockRow = {
  id: string
  producto_id: string | null
  tipo: 'entrada' | 'salida'
  cantidad: number
  motivo: string
  stock_resultante: number
  fecha: string
}

export type RegistrarIngresoArgs = {
  p_compra_id: string
  p_proveedor_id: string | null
  p_nombre_proveedor: string | null
  p_producto_id: string
  p_cantidad: number
  p_costo_total: number
  p_comprobante: string | null
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

export type ActualizarProductoArgs = {
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

export type RegistrarAjusteManualArgs = {
  p_producto_id: string
  p_nuevo_stock: number
  p_es_regalo: boolean
  p_motivo: string
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

export type UsuariosAutorizadosInsert = Omit<UsuariosAutorizadosRow, 'created_at'>

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
        Insert: VentasInsert
        Update: Partial<VentasInsert>
        Relationships: []
      }
      detalle_ventas: {
        Row: DetalleVentasRow
        Insert: DetalleVentasInsert
        Update: Partial<DetalleVentasInsert>
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
        Insert: IngresosMercaderiaInsert
        Update: Partial<IngresosMercaderiaInsert>
        Relationships: [
          {
            foreignKeyName: 'ingresos_mercaderia_producto_id_fkey',
            columns: ['producto_id'],
            isOneToOne: false,
            referencedRelation: 'productos',
            referencedColumns: ['id'],
          },
        ]
      }
      ajustes_stock: {
        Row: AjustesStockRow
        Insert: Omit<AjustesStockRow, 'id' | 'fecha'>
        Update: Partial<Omit<AjustesStockRow, 'id' | 'fecha'>>
        Relationships: []
      }
      usuarios_autorizados: {
        Row: UsuariosAutorizadosRow
        Insert: UsuariosAutorizadosInsert
        Update: Partial<UsuariosAutorizadosInsert>
        Relationships: []
      }
      }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_venta: {
        Args: { p_articulos: Json[]; p_metodo_pago: string }
        Returns: RegistrarVentaResult
      }
      registrar_ingreso: {
        Args: RegistrarIngresoArgs
        Returns: RegistrarIngresoResult
      }
      registrar_ajuste_manual: {
        Args: RegistrarAjusteManualArgs
        Returns: RegistrarAjusteManualResult
      }
      registrar_ajuste_stock: {
        Args: {
          p_producto_id: string
          p_tipo: string
          p_cantidad: number
          p_motivo?: string
        }
        Returns: { ajuste_id: string; stock_resultante: number }
      }
      registrar_compra: {
        Args: { p_proveedor_id: string | null; p_nombre_proveedor: string | null; p_comprobante: string | null; p_items: Json[] }
        Returns: RegistrarCompraResult
      }
      actualizar_producto: {
        Args: ActualizarProductoArgs
        Returns: ActualizarProductoResult
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