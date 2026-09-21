import { Outlet } from 'react-router-dom'
import Silk from '../components/Silk'

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-[#1a0b3d]">
      <div className="fade-in fixed inset-0" aria-hidden="true">
        <Silk
          speed={5}
          scale={1}
          color="#5227FF"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}