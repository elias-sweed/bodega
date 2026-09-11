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
}

export type VentasInsert = Omit<VentasRow, 'id' | 'fecha'>

export type DetalleVentasRow = {
  id: string
  venta_id: string
  producto_id: string | null
  cantidad: number
  precio_unitario: number
  subtotal: number
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
  proveedor_id: string | null
  producto_id: string | null
  cantidad_ingresada: number
  costo_total: number
  fecha: string
}

export type IngresosMercaderiaInsert = Omit<IngresosMercaderiaRow, 'id' | 'fecha'>

export type RegistrarIngresoArgs = {
  p_proveedor_id: string | null
  p_producto_id: string
  p_cantidad: number
  p_costo_total: number
}

export type RegistrarIngresoResult = {
  ingreso_id: string
  stock_actual: number
}

export type AjustesStockRow = {
  id: string
  producto_id: string | null
  tipo: 'entrada' | 'salida'
  cantidad: number
  motivo: string
  stock_resultante: number
  fecha: string
}

export type AjustesStockInsert = Omit<AjustesStockRow, 'id' | 'fecha'>

export type RegistrarAjusteStockArgs = {
  p_producto_id: string
  p_tipo: 'entrada' | 'salida'
  p_cantidad: number
  p_motivo: string
}

export type RegistrarAjusteStockResult = {
  ajuste_id: string
  stock_resultante: number
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
        Relationships: []
      }
      ajustes_stock: {
        Row: AjustesStockRow
        Insert: AjustesStockInsert
        Update: Partial<AjustesStockInsert>
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
        Args: { p_articulos: Json[] }
        Returns: RegistrarVentaResult
      }
      registrar_ingreso: {
        Args: RegistrarIngresoArgs
        Returns: RegistrarIngresoResult
      }
      registrar_ajuste_stock: {
        Args: RegistrarAjusteStockArgs
        Returns: RegistrarAjusteStockResult
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