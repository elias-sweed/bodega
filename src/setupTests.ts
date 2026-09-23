import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { handlers, resetMockState } from './mocks/handlers'
import { server } from './mocks/server'
import { resetProductsCache } from './services/productsCache'
import { supabase } from './services/supabase'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

beforeEach(() => {
  resetMockState()
  resetProductsCache()
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
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})
