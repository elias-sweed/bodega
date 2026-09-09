import { Outlet } from 'react-router-dom'
import Beams from '../components/Beams'

export function AuthLayout() {
  return (
    <div className="relative min-h-screen bg-black">
      <div className="fade-in fixed inset-0" aria-hidden="true">
        <Beams
          beamWidth={3}
          beamHeight={30}
          beamNumber={20}
          lightColor="#ffffff"
          speed={2}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={30}
          beamColor="#000000"
          backgroundColor="#000000"
        />
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center overflow-y-auto p-4 sm:p-8">
        <Outlet />
      </div>
    </div>
  )
}