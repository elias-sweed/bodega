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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      registrar_venta: {
        Args: { p_articulos: Json[] }
        Returns: RegistrarVentaResult
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