# 🌌 Sistema Solare Interattivo

Una demo di apprendimento interattiva del sistema solare che mostra il Sole e il moto orbitale di tutti gli otto pianeti.

## 🚀 Funzionalità

- **Animazione orbitale**: Tutti gli 8 pianeti ruotano attorno al Sole con velocità orbitali realistiche
- **Sfondo stellato**: Effetto spaziale realistico
- **Interattività**: Clicca su un pianeta per visualizzare nome, dimensioni, distanza dal Sole e periodo orbitale
- **Controlli di riproduzione**: Play/Pausa e regolazione velocità (0.25x - 10x)
- **Design responsive**: Funziona su desktop e mobile

## 🛠️ Tecnologie

- React 18
- TypeScript
- Vite
- CSS Animations

## 📦 Deploy su Vercel

### Opzione 1: Deploy diretto da GitHub (consigliata)

1. Carica questo progetto su un repository GitHub
2. Vai su [vercel.com](https://vercel.com)
3. Clicca **"Add New Project"**
4. Importa il repository GitHub
5. Vercel rileverà automaticamente Vite come framework
6. Clicca **"Deploy"**

### Opzione 2: Deploy con Vercel CLI

```bash
# Installa Vercel CLI
npm install -g vercel

# Deploy
vercel

# Per deploy in produzione
vercel --prod
```

### Opzione 3: Deploy locale

```bash
# Build del progetto
npm run build

# Il contenuto della cartella dist/ è pronto per il deploy
```

## 🔧 Sviluppo locale

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Build per produzione
npm run build
```

## 📋 Struttura del progetto

```
├── index.html          # HTML entry point
├── src/
│   ├── main.tsx        # React entry point
│   ├── App.tsx         # Componente principale
│   └── index.css       # Stili globali
├── vercel.json         # Configurazione Vercel
├── vite.config.js      # Configurazione Vite
├── tsconfig.json       # Configurazione TypeScript
└── package.json        # Dipendenze e script
```

## 🪐 Pianeti inclusi

| Pianeta | Diametro | Distanza dal Sole | Periodo Orbitale |
|---------|----------|-------------------|------------------|
| Mercurio | 4,879 km | 57.9 mln km | 88 giorni |
| Venere | 12,104 km | 108.2 mln km | 225 giorni |
| Terra | 12,756 km | 149.6 mln km | 365 giorni |
| Marte | 6,792 km | 227.9 mln km | 687 giorni |
| Giove | 142,984 km | 778.6 mln km | 4,333 giorni |
| Saturno | 120,536 km | 1,433.5 mln km | 10,759 giorni |
| Urano | 51,118 km | 2,872.5 mln km | 30,687 giorni |
| Nettuno | 49,528 km | 4,495.1 mln km | 60,190 giorni |
