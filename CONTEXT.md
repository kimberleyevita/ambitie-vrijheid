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
- v0.4
bij verzekeringen overige, zodat de gebruiker zelf iets kan invullen.
En een omschrijving dat de voor ingevulde bedragen de gemiddelden zijn.
Bij de uitleg over cashbuffer, liever het advies weglaten dat het actief belegd kan worden.
Rendement moet je per categorie kunnen aangeven. 
Rendement per portfolio item dan in een lijn grafiek aangeven waarbij in de grafiek pessimistisch optimistisch en waarschijnlijk scenario te zien zijn. Die dus door het systeem worden berekend op basis van vuistregels en standaarden.
In het vermogensplan moet je toch ergens de aow uitkering erbij krijgen. 
Ik denk ook dat we moeten laten zien hoeveel je dan per maand hebt en waar dat uit bestaat.
Inleg moet per soort, dus inleg, beleggen, sparen, overig. Want elk soort heeft een ander rendement. Het moet heel simpel zichtbaar worden dat de verschillende rendementen bijdragen aan het vermogen.
Bewoordingen zijn wat moeilijk. Ik wil dat het vermogensopbouw voor iedereen is. Dus ook als je niet weet wat kapitaal is. Dus dan ipv benodigd kapitaal kan je liever zeggen benodigd bedrag ofzo. Denk zelf hier ook over na wat simpele bewoording is die velen zullen begrijpen als je niet uit business komt of de financiele wereld.
Moet er bij pensioengegevens niet iets komen over de leeftijd waarop het dan beschikbaar zou komen? Pensioenen is het lastigste stuk voor de meeste dit moet zo simpel en makkelijk mogelijk worden uitgelegd en de gebruiker moet op een gebruiksvriendelijke manier hierdoor worden heen begeleid.
We moeten nadenken over hoe je dit dient in te vullen als alleenstaande en met partner. Als je namelijk je vaste lasten invult en je hebt een partner dan lijkt me dat de kosten worden verdeeld? Ik denk dat je dan moet kunnen kiezen middels percentages hoe die verdeling eruit ziet. Bijvoorbeeld 50-50 of 30-70. Sommige koppels verdelen de lasten adhv kostenposten. Dus bijvoorbeeld de hypotheek betaalt 1 persoon en de ander betaalt gas water en licht bijvoorbeeld. Hoe kan je dit op een simpele en gebruiksvriendelijke manier oplossen?
Ook bij pensioen om het minder overweldigend te laten lijken. Eerst vragen of men over een pensioen beschikt en als het is aangevinkt pas de velden worden weergegeven.
De bewoording liquide zegt de gemiddelde Nederlander ook niets.
Bij huidig vermogen wil ik zelf rekeningen kunnen toevoegen. Label geven in welke categorie het valt en dan het gemiddeld rendement wat bij die categorie hoort al weergeven als ze het er niet mee eens zijn mogen ze dit wijzigen. Je ziet de wijzigingen dan direct in de grafiek eronder met op de x het aantal jaar en Y de waarde in geld. Ik wil het compounding effect laten zien. 
Bij spaar of banktegoeden wil ik vooraf ingevuld de huidige marktrente. Kan je deze ergens ophalen? Ook uitleg erbij wat het rente percentage inhoud. Het doel van de verschillen tussen de verschillende type moet de gebruiker doen beseffen dat geld op verschillende manieren kan groeien. 
De cashbusfer uitleggen waar we vanuit zijn gegaan. 
- v0.5
Bij hypotheek inzicht: hypotheek loopt nog x jaar door vanaf financieel vrije leeftijd. Eigenlijk liever: Je hebt nog x jaar hypotheek te betalen op je financieel vrije leeftijd. als het weinig is dan een leuke foto ofzo of plaatje of iets om het positief te benadrukken.
Je kan ook een optie geven om deel in 1 keer van de hypotheek af te lossen. Misschien hebben ze dat namelijk in de planning staan en willen ze kijken wat dat voor het vermogen zou betekenen. 
Bij wonen staat huur of hypotheek lasten. Als iemand zijn leningdelen al heeft ingevuld kan je dit toch ook al vooraf invullen? 
Onderhoud woning hebben we in een eerder veld ook al ingevuld of geaccepteerd als automatisch berekend.
Bij mobiliteit wordt gesproken over verzekeringen terwijl je bij verzekeringen ook al aangeeft. Dus dit is dan dubbelop
We kunnen ook de categorie als drop down doen compact mid size etc. Of liever nederlandse benamingen en dan nog dat ze zelf een bedrag mogen invullen als ze het niet eens zijn met de vooraf opgestelde categorie.
Het moet duidelijker worden gevisualiseerd wat allemaal moet worden meegenomen in de autokosten. Nu moet je cursor eerst over het vraagteken voordat je het ziet.
Zullen we de boodschappen wekelijks
Als je een nieuwe rekening ofzo toevoegt moet je gelijk naar dat stuk van de pagina springen waar je dan de gegevens gaat invullen.
Bij jouw geld mis ik nog cash en vastgoed als vaste categorie.
Er wordt gezegd dat je per categorie de verdeling kan aanpassen. Maar er is geen verdeler beschikbaar per categorie. 
Het noodfonds is een kleine regel en nu niet zo goed zichtbaar. Deze mag beter worden weergegeve n bij jouw geld.
Bij vermogensgroei moet er ook een uitleg worden gegeven dat het een combinatie is van alle verschillende bezittingen of geld wat ze hebben ingevuld.
Het is onduidelijk dat je de titels van de verschillende rekeningen kan veranderen.
Bij jouw geld ontbreekt dan schulden denk. Dit wordt van het vermogen nog afgehaald toch?
Het verwacht pensioen bedrag komt dan toch voort uit de lijfrente spaarrekening als ze die hebben ingevuld bij de eerdere stap? Ze moeten de mogelijkheid hebben dit zelf nog aan te passen. Maar als ze lijfrente en pensioen rekeningen hebben toegevoegd ten behoeve van eigen pensioen dus kan dit vooraf worden ingevuld.
Ik wil dat de output meer in een rapport wordt gemaakt met mooie visualisaties erbij die echte inzichten geven en aha momenten. Ik moet nu eerder gaan zoeken wat mis ik en hoe kan ik als ik een gat heb dit kan overbruggen.
Opties op basis van de gegevens kunnen worden gegeven.
- v0.6
Bij schulden, moet het dan overige schulden ofzo worden want de gebruiker moet zich niet verwarren dat hij daar de hypotheek weer moet gaan invullen.
Schulden kunnen soms ook worden afgelost dat ze een looptijd hebben.
Sommige mensen hebben naast hun hoofdverblijf nog meerdere woningen. Deze vallen dan in de vastgoed categorie. Ze kunnen daarvoor wel huurinkomsten ontvangen. Dit levert dan passief inkomen op. We hebben dit nog nergens staan. 
Evenals als je aandelen hebt kan je ook dividend inkomsten ontvangen dit behoort dan ook tot passief inkomen. Zijn er nog andere categorien wat ik niet heb opgenoemd maar waar wel rekening mee moet worden gehouden?
Contant geld heeft geen rendement
De weergave mag duidelijker. Nu loopt de tekst door de staven heen bij de uitleg van het effect rente op rente. De tekst moet boven de staafdiagram komen.
Ik wil een piechart toevoegen hoe het vermogen is opgebouwd.
De zelf invullen knop werkt niet bij mobiliteit er komt nergens in het scherm iets waar ik dan een bedrag kan invullen.
Er staan geen bedragen berekend bij je eigen pensioen en aow. Misschien moet er duidelijker komen te staan op de gewenste financieel vrije leeftijd is daar nog geen uitkering en dan vanaf 68 of 67 de huidige aow leeftijd voor mensen met dat geboortejaar zou het inkomen vanuit pensioen en aow er met een x bedrag uitzien en dan missen ze nog een x bedrag. We moeten de gaten duidelijk en verhelderend kunnen aangeven of juist geen gaten als er voldoende is.
Bij wat kan je doen om een gat te overbruggen staat er +50 jaar doorwerken. Dat kan natuurlijk niet. Want de aow en pensioen leeftijd is al 67 en je kan niet tot 90 jaar doorwerken. Dat is onrealistisch.
```

## Instructie voor Claude
Wanneer ik een nieuw gesprek begin:
1. Ik upload dit bestand + het specifieke component dat ik wil aanpassen
2. Jij hoeft de rest van de codebase niet te kennen
3. Verander alleen wat gevraagd wordt — geen stijlwijzigingen tenzij expliciet gevraagd
4. Geef altijd een volledig gewijzigd bestand terug (niet alleen de diff)
5. Gebruik dezelfde codestijl: functionele componenten, inline styles, geen externe imports buiten recharts
