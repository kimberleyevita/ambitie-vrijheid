# Ambitie Vrijheid — Projectcontext voor Claude

## Wat is dit?
Een Nederlandse FIRE-calculator (Financial Independence, Retire Early) webapp.
Gebouwd met Vite + React + Recharts. Geen backend, geen database — alles lokaal in de browser.
Live via Vercel, code op GitHub.

## Projectstructuur
```
src/
  App.jsx                 # Root + navigatie (wizard / vermogen)
  tokens.js               # Kleuren (C.*) + constanten (INFLATIE, AOW_MAAND, FIRE_PCT)
  utils.js                # Berekeningsfuncties
  main.jsx                # React entry point
  data/lifestyle.js       # 28 lifestyle-categorieën met CBS-benchmarks
  components/
    Atoms.jsx             # Herbruikbare UI: Card, Kop, Lbl, Inp, Slider, Metric, InfoBox, etc.
    VrijheidsWizard.jsx   # 5-staps wizard (profiel → lifestyle → vermogen → pensioen → prognose)
    VermogenModule.jsx    # Box 1 woning + Box 3 belasting uitleg
```

## Designsysteem
- Kleuren: goud (#b8862a), groen (#3d8f62), crème achtergrond (#faf7f2)
- Typografie: Cormorant Garamond (koppen), DM Sans (tekst), DM Mono (getallen)
- Stijl: warm, premium, geen harde schaduwen — denk private banking voor gewone mensen
- Alle inline styles (geen Tailwind, geen CSS modules)

## Kernberekeningen (in utils.js)
- **FIRE-kapitaal**: `(jaaruitgaven_gecorrigeerd_voor_inflatie - passief_inkomen) / 0.035`
- **Hypotheek**: annuïteit / lineair / aflossingsvrij — restschuld en maandlast berekend op stopjaar
- **AOW-onzekerheid**: officieel t/m 2032, prognose 2033-2037, indicatie daarna
- **Jaarruimte**: `(bruto - 17.545) × 30% - 5.000` (2025)
- **Woningonderhoud**: 1,0–1,8% WOZ per jaar afhankelijk van bouwjaar

## Bewuste keuzes / constraints
- Geen TypeScript (bewust — lagere drempel voor bijdragen)
- Geen state management library (useState is voldoende voor deze scope)
- Geen CSS-framework — alles inline voor portabiliteit
- Geen analytics / tracking — privacy by design
- Disclaimer: indicatief, geen financieel advies

## Openstaande verbeterpunten (bijhouden!)
- [ ] ...vul aan op basis van tests

## Versiegeschiedenis
- v0.1 — eerste live versie. Wizard + vermogenmodule.
```

## Instructie voor Claude
Wanneer ik een nieuw gesprek begin:
1. Ik upload dit bestand + het specifieke component dat ik wil aanpassen
2. Jij hoeft de rest van de codebase niet te kennen
3. Verander alleen wat gevraagd wordt — geen stijlwijzigingen tenzij expliciet gevraagd
4. Geef altijd een volledig gewijzigd bestand terug (niet alleen de diff)
5. Gebruik dezelfde codestijl: functionele componenten, inline styles, geen externe imports buiten recharts
