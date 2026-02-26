import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const REPO_NAME = 'crypto-tax'

export default defineConfig({
  plugins: [react()],
  base: `/${REPO_NAME}/`,
})
