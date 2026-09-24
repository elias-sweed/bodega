import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { handlers, resetMockState } from './mocks/handlers'
import { server } from './mocks/server'
import { resetProductsCache } from './services/productsCache'
import { resetDashboardCache } from './services/dashboardCache'
import { resetProveedoresCache } from './services/proveedoresCache'
import { resetReporteCache } from './services/reporteCache'
import { resetHistoryCache } from './services/historyCache'
import { resetUsersCache } from './services/usersCache'
import { resetRecientesStore } from './services/recientesStore'
import { supabase } from './services/supabase'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  resetMockState()
  resetProductsCache()
  resetDashboardCache()
  resetProveedoresCache()
  resetReporteCache()
  resetHistoryCache()
  resetUsersCache()
  resetRecientesStore()
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn().mockResolvedValue('ok'),
  } as unknown as RealtimeChannel
  vi.mocked(channel.on).mockReturnValue(channel)
  vi.mocked(channel.subscribe).mockReturnValue(channel)
  vi.spyOn(supabase, 'channel').mockReturnValue(channel)
})

afterEach(() => {
  cleanup()
  server.resetHandlers(...handlers)
  resetProductsCache()
  resetDashboardCache()
  resetProveedoresCache()
  resetReporteCache()
  resetHistoryCache()
  resetUsersCache()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})
