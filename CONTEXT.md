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
- Typografie: Cormorant Garamond (koppen), DM Sans (tekst), DM Mono (getallen)
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
- v0.2
- v0.3
Hypotheek moet resterende looptijd hebben. En start van de looptijd. misschien kan de resterende looptijd ook worden berekend aan de hand van de start looptijd en duur van de looptijd. 
Dan in de tab  met jouw vrijheidsplan visualiseren hoe de aflossing verloopt tov de leeftijd van de persoon. 
Starten met niet vooraf ingevulde velden. Nu staat er bij geboortejaar bijvoorbeeld al een jaartal. 
Benaming stopleeftijd misschien veranderen in financiele vrije leeftijd.
Bij mobiliteit, uitleg wat daaronder valt, benzine per maand, afschrijving, onvoorziene kosten misschien? 
Als ik een cijfer verander door het voor ingevulde weg te halen blijft de 0 staan. Als mijn cursor achter de 0 staat kan ik niet op backspace drukken want de 0 blijft dan staan.
Verzekeringen zijn er veel soorten ik denk dat een drop down het beste werkt waar je verschillende verzekeringen kan selecteren. En dan de bedragen kan invullen. 
Denk aan auto verzekering, opstal inboedel, reisverzekering etc. Vul de lijst aan tot wat jij denkt dat het meest gebruikelijke is.
Het lijkt erop dat het gemiddelde bedrag voor onderhoud wel erg hoog is. Als je het niet eens met dat bedrag bent moet je dit ook kunnen aanpassen.
Als je bij hypotheekdelen tot de conclusie komt dat de persoon hypotheek vrij is bij de vrije leeftijd moeten die kosten niet worden opgeteld bij hetgeen wat ze dus nodig hebben voor hun levenstijl. Ook kan het hypotheek bedrag worden ingevuld door wat er dus is berekend in de hypotheek delen toch? Hou je rekening dan met de hypotheekvorm. Lineair, annuïteit of aflossingsvrij.
Als een lineair berekening te lastig wordt hoe kunnen we dit dan het beste oplossen?
Wat is de logica hoelang je het dan wil volhouden? In de zin van je weet uiteindelijk welk inkomen je nodig hebt. Maar dan voor hoeveel jaar moeten we dan vooruit gaan rekenen. Zodat we een goede indicatie kunnen geven wat ze echt nodig hebben? Wat is hierin gangbaar?
Het vrijheidsplan is goed om in verschillende scenario's uit te voeren, optimistisch pessimistisch, waarschijnlijk. 
Per vermogens soort moet je rendement kunnen invullen. Zou ook mooi zijn als je gelijk ziet welke scenario's er zijn en wat het rendement is afhankelijk van de leeftijd. Dus je kijkt dan naar de huidige inleg en het te verwachten rendement. Je vraagt ook naar de verwachte inleg. En je maakt de prognose tot het jaar dat de gebruiker financieel vrij wil zijn. 
```

## Instructie voor Claude
Wanneer ik een nieuw gesprek begin:
1. Ik upload dit bestand + het specifieke component dat ik wil aanpassen
2. Jij hoeft de rest van de codebase niet te kennen
3. Verander alleen wat gevraagd wordt — geen stijlwijzigingen tenzij expliciet gevraagd
4. Geef altijd een volledig gewijzigd bestand terug (niet alleen de diff)
5. Gebruik dezelfde codestijl: functionele componenten, inline styles, geen externe imports buiten recharts
