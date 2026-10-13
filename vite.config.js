import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { offlineBuild } from './offlineBuild.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/flight-briefing-app/',
  plugins: [react(), offlineBuild()],
})
