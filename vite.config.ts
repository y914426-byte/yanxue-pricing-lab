import {sites} from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import {defineConfig} from 'vite';
export default defineConfig({resolve:{dedupe:['react','react-dom']},optimizeDeps:{include:['react','react-dom','react-dom/client','@base-ui/react/button','@base-ui/react/checkbox','@base-ui/react/select']},css:{postcss:{plugins:[tailwindcss()]}},plugins:[vinext(),sites()]});
