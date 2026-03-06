# Ambitie Vrijheid

Bereken wanneer jij financieel vrij kunt zijn. Gratis, transparant, volledig lokaal — er wordt geen data verstuurd.

## Functies

- **Vrijheidswizard** — stap voor stap naar jouw FIRE-datum
- **Hypotheekmodule** — meerdere leningdelen (annuïteit, lineair, aflossingsvrij)
- **AOW-onzekerheid** — eerlijke prognose op basis van geboortejaar
- **Lifestyle calculator** — 28 categorieën met CBS-benchmarks
- **Vermogen & Belasting** — Box 1 woning, Box 3, jaarruimte
- **Scenarioanalyse** — wat als je meer inlegt of later stopt?

## Lokaal draaien

```bash
npm install
npm run dev
```

Open dan `http://localhost:5173`

## Deployen via Vercel

1. Push dit project naar een GitHub repository
2. Ga naar [vercel.com](https://vercel.com) en maak een nieuw project
3. Koppel je GitHub repository
4. Vercel detecteert Vite automatisch — klik **Deploy**

Klaar. Geen environment variables nodig, alles werkt client-side.

## Projectstructuur

```
src/
  App.jsx                 # Root component + navigatie
  tokens.js               # Design tokens + financiële constanten
  utils.js                # Berekeningsfuncties (AOW, hypotheek, FIRE)
  main.jsx                # React entry point
  data/
    lifestyle.js          # Alle lifestyle categorieën met CBS-benchmarks
  components/
    Atoms.jsx             # Herbruikbare UI-componenten
    VrijheidsWizard.jsx   # 5-staps FIRE wizard
    VermogenModule.jsx    # Box 1 / Box 3 module
```

## Technische keuzes

- **Vite + React** — snel, geen config nodig
- **Recharts** — grafieken
- **Geen backend** — alles berekend in de browser
- **Geen database** — privacy by design

## Disclaimer

Indicatieve berekeningen gebaseerd op constante rendementen, 2,5% inflatie en huidige belastingregels. Geen financieel advies.
