import { mount } from 'svelte';
import { registerSW } from 'virtual:pwa-register';
import App from './App.svelte';
import './app.css';
import { ligarVoltarAndroid, nativo } from './lib/plataforma.ts';

mount(App, { target: document.getElementById('app')! });

ligarVoltarAndroid();

// No APK os arquivos já estão no aparelho; o service worker é só para o site.
if (!nativo) registerSW({ immediate: true });
