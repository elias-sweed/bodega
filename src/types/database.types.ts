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

export type Database = {
  public: {
    Tables: {
      productos: {
        Row: ProductosRow
        Insert: ProductosInsert
        Update: ProductosUpdate
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}