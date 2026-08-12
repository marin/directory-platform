# Heilpraktiker – Keyword-Analyse Deutschland (DE)

**Quelle:** DataForSEO Labs (Google), Location = Germany, Language = de
**Datenstand:** Suchvolumen-Snapshot Juli 2026, abgerufen am 12. August 2026
**Umfang:** 1.186 Keywords → **802 eindeutige Volumen-Gruppen**, 302.260 Suchanfragen/Monat, rechnerischer Traffic-Wert ≈ **653.900 € / Monat** (bei CPC-Bewertung)
**Datei mit Rohdaten:** `heilpraktiker_keywords_de.csv` (Semikolon-getrennt, UTF-8 mit BOM → öffnet direkt in deutschem Excel)

---

## 0. Zwei Dinge vorab, sonst rechnest du dich reich

**1. Die Daten sind massiv dupliziert.** Google fasst Permutationen zu einer Volumen-Gruppe zusammen. „ausbildung zum heilpraktiker", „heilpraktiker ausbildung", „ausbildung für heilpraktiker", „heilpraktiker-ausbildung" haben **alle dasselbe** Suchvolumen von 14.800 – das sind nicht 59.200 Suchen, sondern 14.800. Von 1.186 Keywords bleiben nach Bereinigung 802 echte übrig. Naiv summiert käme man auf 578.770 SV statt der realen 302.260 – ein Fehler von 91 %.

> In der CSV lösen das zwei Spalten: `variant_group` (der Repräsentant der Gruppe) und `is_primary` (1 = zählen, 0 = Variante). **Für jede Summenrechnung: `is_primary = 1` filtern.** Die Varianten bleiben drin, weil sie für die On-Page-Optimierung wertvoll sind – sie zeigen, welche Formulierungen in denselben Ranking-Topf fallen.

**2. Keyword Difficulty fehlt bei 56 % der Keywords** (518 von 1.186 haben einen Wert). Das ist kein Datenfehler: DataForSEO gibt KD nur aus, wenn genügend SERP-/Backlink-Daten der rankenden Seiten vorliegen. Ein Nachladen über den Bulk-KD-Endpunkt lieferte für dieselben Keywords ebenfalls überwiegend `null`. **Fehlende KD ist in dieser Nische selbst ein Signal:** die SERPs sind dünn besetzt und werden von Verzeichnissen und schwachen Praxis-Websites gehalten. Behandle leere KD-Felder als „vermutlich niedrig, vor dem Investment eine SERP-Sichtprüfung".

---

## 1. Wo das Geld liegt: Cluster-Übersicht

Alle Zahlen dedupliziert (`is_primary = 1`). „Traffic-Wert" = SV × CPC, also das, was dieser Traffic bei Google Ads kosten würde.

| Cluster | KWs | Suchvol./Mon. | Anteil | KD (Median) | CPC (Median) | Traffic-Wert/Mon. |
|---|---:|---:|---:|---:|---:|---:|
| **Ausbildung & Prüfung** | 125 | 79.120 | 26,2 % | 15 | 2,64 € | **328.272 €** |
| Lokale Suche | 215 | 59.690 | 19,7 % | 8 | 0,76 € | 62.795 € |
| Kernbegriffe | 2 | 36.700 | 12,1 % | 41,5 | 1,96 € | 82.221 € |
| Marken- & Praxisnamen | 197 | 32.560 | 10,8 % | 8 | 1,02 € | 26.510 € |
| Tierheilkunde | 24 | 16.280 | 5,4 % | 20 | 2,04 € | 46.106 € |
| Praxisbetrieb & Kosten | 35 | 14.110 | 4,7 % | 7 | 0,37 € | 9.952 € |
| **Versicherung & Kostenerstattung** | 25 | 12.940 | 4,3 % | 15 | 2,75 € | **45.937 €** |
| Ärzte, Kliniken & Schulmedizin | 34 | 10.290 | 3,4 % | 10 | 1,03 € | 9.955 € |
| Jobs & Gehalt | 22 | 8.950 | 3,0 % | – | 0,47 € | 4.468 € |
| Methoden & Therapien | 48 | 8.530 | 2,8 % | 12 | 1,30 € | 7.412 € |
| Beschwerden & Indikationen | 32 | 6.930 | 2,3 % | 4,5 | 1,08 € | 6.449 € |
| Informational / Erklärung | 15 | 6.040 | 2,0 % | 17 | 1,69 € | 7.303 € |
| Sektoraler Heilpraktiker | 9 | 5.220 | 1,7 % | – | 1,69 € | 9.073 € |
| Heilpraktiker Psychotherapie | 9 | 1.830 | 0,6 % | 12 | 1,03 € | 3.882 € |
| Bücher & Medien | 4 | 1.740 | 0,6 % | – | 0,54 € | 953 € |
| Beruf & Verbände | 6 | 1.330 | 0,4 % | 30,5 | 1,15 € | 2.573 € |

**Die zentrale Erkenntnis:** Der Markt sucht überwiegend **nicht nach Behandlung, sondern nach dem Beruf.** Ausbildung allein macht 26 % des Volumens, aber **50 % des gesamten kommerziellen Werts** (328.272 € von 653.861 €). Wer echte Patienten sucht, spielt in einem viel kleineren, stark lokal zersplitterten Feld – wer Heilpraktiker *als Zielgruppe* hat (Schulen, Software, Versicherer, Verbände), sitzt am fetten Ende.

**Intent-Verteilung (dedupliziert):** 451 informational (214.850 SV) · 280 navigational (64.860) · 61 commercial (21.600) · 10 transactional (950). Nur **7,5 % des Volumens ist kommerziell** – ohne Content-Strategie ist hier nichts zu holen.

---

## 2. Die stärksten Einzelchancen

### 2.1 Fernstudium / Online-Ausbildung – höchster CPC bei niedriger Difficulty

Das ist die auffälligste Ineffizienz im gesamten Datensatz: bezahlte Klicks kosten hier bis zu **16,42 €**, gleichzeitig liegt die KD bei 9–22.

| Keyword | SV | KD | CPC |
|---|---:|---:|---:|
| heilpraktiker fernstudium (+ 4 Varianten) | 480 | 15–22 | **16,42 €** |
| heilpraktiker fernausbildung | 480 | – | **16,42 €** |
| heilpraktiker ausbildung fernstudium | 110 | 23 | 13,53 € |
| fernstudium heilpraktiker psychotherapie (+2) | 170 | 11–13 | 12,22 € |
| heilpraktiker ausbildung online (+ 7 Varianten) | 1.000 | 9 | **9,87 €** |
| heilpraktiker fernstudium testsieger | 50 | 1 | 14,62 € |

**Warum das so ist:** Fernlehrinstitute (ILS, sgd, Paracelsus, Impulse) bieten aggressiv auf diese Begriffe, weil ein Lehrgang vierstellig kostet. Organisch sind die SERPs dagegen dünn – KD 9 bei 9,87 € CPC ist ein Preis-Leistungs-Verhältnis, das man in kaum einer Nische findet.

**Konkret:** Eine Vergleichs-/Testsieger-Seite („Heilpraktiker Fernstudium Vergleich 2026") bedient `fernstudium`, `fernausbildung`, `online ausbildung` und `testsieger` in einem Asset. Rechnerischer Ads-Gegenwert der Gruppe: rund 17.000 €/Monat.

### 2.2 Heilpraktiker Psychotherapie – 5.400 SV bei KD 2

Die gesamte HPP-Ausbildungsgruppe teilt sich 5.400 SV/Monat bei **4,93 € CPC**, und die KD-Werte der Varianten streuen extrem (2, 6, 13, 18) – ein Zeichen dafür, dass keine Seite das Thema sauber besetzt.

| Keyword | SV | KD | CPC |
|---|---:|---:|---:|
| ausbildung heilpraktiker psychotherapie | 5.400 | **2** | 4,93 € |
| ausbildung zum heilpraktiker psychotherapie | 5.400 | 6 | 4,93 € |
| ausbildung psychotherapeut heilpraktiker | 5.400 | 13 | 4,93 € |
| ausbildung heilpraktiker psychotherapie kosten | 390 | 10 | 2,86 € |
| psychologischer heilpraktiker | 720 | 12 | 3,97 € |
| heilpraktiker psychotherapie prüfungsvorbereitung | 210 | – | 2,38 € (+614 % YoY) |

Traffic-Wert der Kerngruppe: **26.622 €/Monat.** Das ist nach dem Head-Term und der Haupt-Ausbildung das drittwertvollste Einzelthema – und mit Abstand das am leichtesten angreifbare.

### 2.3 Zusatzversicherung – klarste kommerzielle Absicht im Datensatz

| Keyword | SV | KD | CPC | Intent |
|---|---:|---:|---:|---|
| heilpraktiker zusatzversicherung (+ 5 Varianten) | 3.600 | 8–24 | 4,16 € | commercial |
| heilpraktiker zusatzversicherung ohne wartezeit (+2) | 320 | – | **7,21 €** | commercial |
| versicherung für heilpraktiker | 390 | 7 | 5,41 € | commercial |
| zusatzversicherung heilpraktiker psychotherapie | 210 | 14 | 4,14 € | commercial |
| barmenia / AOK / TK + zusatzversicherung | je 210–390 | 1–14 | 1,59–3,03 € | commercial |

Das ist der einzige Cluster, in dem die Mehrheit der Keywords von DataForSEO als *commercial* eingestuft wird. Für ein Affiliate- oder Vergleichsmodell (Versicherungsvergleiche zahlen hohe Leadprämien) ist das der direkteste Weg zu Umsatz. Achtung bei der Kassen-Ebene: „heilpraktiker tk" und „techniker krankenkasse heilpraktiker" (je 480 SV) sind **-56 % YoY** – die Nachfrage verschiebt sich weg von einzelnen Kassen hin zu generischen Vergleichen.

### 2.4 Praxisbetrieb / GebüH – das unterschätzte B2B-Tor

CPC nahe null, aber **14.110 SV bei Median-KD 7.** Das ist kein Werbegeld – das ist Reichweite bei genau der Zielgruppe, die Software, Fortbildung und Versicherungen kauft.

| Keyword | SV | KD | CPC |
|---|---:|---:|---:|
| gebührenverordnung heilpraktiker (+3 Varianten) | 1.300 | 6–15 | 0,05 € |
| heilpraktiker kosten (+2) | 880 | 7 | 0,61 € |
| gebührenverzeichnis heilpraktiker (+2) | 590 | 8–12 | 0,05 € |
| gebüh heilpraktiker tabelle | 390 | – | 0,04 € |
| heilpraktiker gebührenordnung 2025 | 210 | 6 | 0,02 € |
| abrechnung heilpraktiker / heilpraktiker rechnung | je 210 | 6–12 | 2,74 € |
| **heilpraktiker software** (+1) | 210 | 16 | **9,37 €** |
| heilpraktiker steuerlich absetzbar (+1) | 210 | 8–10 | 0,00 € |

**Das Muster:** Eine gepflegte, aktuelle GebüH-Tabelle (plus PDF-Download, plus Abrechnungsrechner) zieht praktisch die gesamte deutsche Heilpraktiker-Berufsgruppe an – bei KD 6–15 in wenigen Monaten machbar. Von dort ist „heilpraktiker software" mit 9,37 € CPC nur einen internen Link entfernt. Wer B2B an Heilpraktiker verkauft, sollte hier anfangen und nicht bei den teuren Ausbildungsbegriffen.

### 2.5 Sektoraler Heilpraktiker – aufkommende Lücke, noch keine KD-Daten

| Keyword | SV | KD | CPC | Trend |
|---|---:|---:|---:|---|
| heilpraktiker sektoral (+3 Varianten) | 2.400 | – | 1,95 € | – |
| heilpraktiker sektoral physiotherapie | 880 | – | 2,28 € | **+69 % YoY** |
| sektoraler heilpraktiker ausbildung | ~170 | – | – | – |
| heilpraktiker für physiotherapie ausbildung | 170 | – | – | – |

5.220 SV, durchgehend **keine** KD-Werte – DataForSEO findet keine etablierten Ranker. Der Treiber ist regulatorisch: Physiotherapeuten holen sich die sektorale Erlaubnis, um ohne ärztliche Verordnung behandeln zu dürfen. Wachsendes Thema, kein Platzhirsch. Für eine Ausbildungsmarke oder ein Fachportal die sauberste Landnahme im ganzen Datensatz.

### 2.6 Beschwerden & Indikationen – klein, aber die einzige echte Patientenabsicht

Median-KD 4,5 – praktisch unbesetzt. Einzelvolumen 110–480, aber das ist der Traffic, der tatsächlich einen Termin bucht.

`heilpraktiker bei kinderwunsch` (480) · `heilpraktiker für hautprobleme` (320) · `heilpraktiker für schilddrüse` (320) · `abnehmen heilpraktiker` (210, 2,63 €) · `darmreinigung heilpraktiker` (170, KD 4) · `depression heilpraktiker` (170) · `heilpraktiker wechseljahre` (140, KD 2) · `haarausfall heilpraktiker` (140) · `akne heilpraktiker` (140) · `blasenentzündung naturheilkunde` (210) · `gicht naturheilkunde` (140) · `rosacea behandlung naturheilkunde` (170)

Für eine einzelne Praxis ist **das** die Strategie – nicht der Kampf um „heilpraktiker berlin". Je Indikation eine ernsthafte Seite, kombiniert mit dem Ort. 20 solcher Seiten sind realistischer und konvertieren besser als eine Top-3-Platzierung beim Head-Term.

---

## 3. Lokale Suche: hohe Frequenz, geringer Wert pro Keyword

215 eindeutige Lokal-Keywords, 59.690 SV, Median-KD **8**, Median-CPC nur 0,76 €. Die Difficulty ist niedrig, weil hier fast ausschließlich Verzeichnisse (Jameda, Gelbe Seiten, Heilpraktiker-Verbände) und schwache Einzelpraxis-Seiten ranken.

| Keyword | SV | KD | CPC |
|---|---:|---:|---:|
| **heilpraktiker in meiner nähe** | 5.400 | 7 | 0,62 € (**+125 % YoY**) |
| berlin heilpraktiker | 1.600 | 31 | 1,31 € (-47 % YoY) |
| heilpraktiker leipzig | 1.300 | 25 | 1,24 € |
| heilpraktiker köln | 1.000 | 17 | 2,36 € |
| heilpraktiker nürnberg | 1.000 | 14 | 2,40 € |
| bremen heilpraktiker | 880 | **2** | 2,13 € |
| dortmund heilpraktiker | 880 | **1** | 0,91 € |
| heilpraktiker hamburg | 880 | 38 | 1,78 € |
| heilpraktiker wuppertal | 880 | 9 | 0,56 € |
| bielefeld heilpraktiker | 720 | **1** | 1,57 € |
| heilpraktiker münster / hannover / essen | je 720 | 14–19 | 0,63–1,50 € |

**Zwei Beobachtungen:**

- **Die Großstädte sind nicht die härtesten.** Bremen (KD 2), Dortmund (KD 1) und Bielefeld (KD 1) sind faktisch unbesetzt, während Hamburg (38) und Berlin (31) umkämpft sind. Ein Verzeichnis-Rollout beginnt sinnvollerweise bei den 500-1.000-SV-Städten mit einstelliger KD, nicht bei Berlin.
- **„in meiner nähe" wächst um 125 % und ist mit 5.400 SV größer als jede einzelne Stadt.** Das ist eine Maps-/Local-Pack-Abfrage, kein klassisches SEO-Keyword. Für eine Praxis heißt das: Google-Business-Profil, NAP-Konsistenz und Bewertungen schlagen jede Textoptimierung.

---

## 4. Trends – wo sich die Nachfrage gerade verschiebt

**Aufsteiger (YoY, ab 200 SV):**

| Keyword | SV | YoY | Einordnung |
|---|---:|---:|---|
| heilpraktiker fernausbildung | 480 | +2.500 % | Vorsicht: Basiseffekt, sehr niedriger Ausgangswert |
| heilpraktiker psychotherapie prüfungsvorbereitung | 210 | +614 % | echter Ausbildungs-Boom im HPP-Segment |
| arzt für naturheilkunde (+5 Varianten) | 720 | +303 % | Nachfrage wandert zum *approbierten* Arzt |
| heilpraktiker in meiner nähe | 5.400 | +125 % | Local-/Maps-Verschiebung |
| heilpraktiker sektoral physiotherapie | 880 | +69 % | regulatorisch getrieben |
| heilpraktiker (Head) | 33.100 | +83 % | Gesamtnachfrage zieht wieder an |
| heilpraktiker zusatzversicherung ohne wartezeit | 320 | +53 % | Preissensibilität steigt |
| heilpraktiker akademie | 210 | +50 % | – |

**Absteiger:**

`versicherung heilpraktiker` -70 % · `heilpraktiker tk` / `techniker krankenkasse heilpraktiker` -56 % · `fernstudium heilpraktiker` -56 % (trotz Top-CPC – das Volumen wandert zu „online ausbildung") · `heilpraktiker hunde/hund/für hunde` -52 % · `berlin heilpraktiker` -47 % · `zahnarzt für naturheilkunde` -56 %

**Das wichtigste Trendsignal:** `arzt für naturheilkunde` +303 % gegen `heilpraktiker hunde` -52 % und `berlin heilpraktiker` -47 %. Die Nachfrage professionalisiert sich – Nutzer suchen zunehmend nach naturheilkundlich arbeitenden **Ärzten** statt nach Heilpraktikern. Wer im Patientengeschäft ist, sollte Qualifikation, Zusatzausbildung und Zusammenarbeit mit Ärzten deutlich sichtbarer machen, als es in dieser Branche üblich ist.

---

## 5. Was du nicht angehen solltest

- **`heilpraktiker` (33.100 SV, KD 42, 2,31 €).** Höchstes Volumen, aber informational und von Wikipedia, Verbänden und Verzeichnissen belegt. Als Ranking-Ziel teuer, als thematischer Anker für ein Hub sinnvoll.
- **Marken- & Praxisnamen: 197 Gruppen, 32.560 SV (10,8 %).** „naturheilpraxis linek", „heilpraktiker münch", „naturheilpraxis wang" usw. Das ist Navigations-Traffic zu bestehenden Praxen. Nicht angreifbar, nicht übertragbar – bei jeder Marktgrößen-Rechnung abziehen.
- **Jobs & Gehalt (8.950 SV, CPC 0,47 €).** Volumen ohne Monetarisierung, und die SERPs gehören Indeed und StepStone. Nur relevant, wenn du selbst rekrutierst.
- **Bücher & Medien (1.740 SV).** Gehört Amazon und Thalia.

---

## 6. Empfohlene Priorisierung

| Prio | Wenn du … | Dann zuerst | Warum |
|---|---|---|---|
| 1 | **Ausbildung/Schule** verkaufst | Fernstudium- & Online-Ausbildung-Cluster + HPP-Ausbildung | 16,42 € bzw. 4,93 € CPC bei KD 2–22; ~45.000 €/Mon. Ads-Gegenwert |
| 2 | **B2B an Heilpraktiker** verkaufst | GebüH-/Gebührenordnung-Hub, dann Bridge zu „heilpraktiker software" | KD 6–15, 14.110 SV, perfekte Zielgruppenreinheit |
| 3 | **Affiliate/Vergleich** betreibst | Zusatzversicherung + Fernstudium-Vergleich | Einziger Cluster mit dominant kommerziellem Intent |
| 4 | eine **einzelne Praxis** hast | 15–25 Indikationsseiten (KD 4,5 Median) + GBP für „in meiner nähe" | Ortskeywords sind niedrigwertig; Indikationen konvertieren |
| 5 | ein **Verzeichnis/Portal** baust | Städte mit 500–1.000 SV und KD 1–9 (Bremen, Dortmund, Bielefeld, Wuppertal …) | Nicht Berlin/Hamburg – dort sitzen die Platzhirsche |
| 6 | **First Mover** sein willst | Sektoraler Heilpraktiker (5.220 SV, keine KD-Daten, +69 %) | Regulatorisch getrieben, noch niemand etabliert |

---

## 7. Spaltendokumentation `heilpraktiker_keywords_de.csv`

Trennzeichen `;`, Kodierung UTF-8 mit BOM, 1.186 Zeilen.

| Spalte | Bedeutung |
|---|---|
| `keyword` | Suchbegriff |
| `search_volume` | Ø monatliche Suchanfragen (Google, DE) |
| `keyword_difficulty` | 0–100, logarithmisch; leer = keine Daten (siehe Abschnitt 0) |
| `cpc_eur` | Durchschnittlicher Cost-per-Click in EUR |
| `competition` / `competition_level` | Google-Ads-Wettbewerb 0–1 bzw. LOW/MEDIUM/HIGH – **bezieht sich auf Ads, nicht auf SEO** |
| `low_top_of_page_bid` / `high_top_of_page_bid` | Gebotsspanne für die obere Anzeigenposition |
| `search_intent` | informational / navigational / commercial / transactional |
| `cluster` | Thematische Zuordnung (regelbasiert vergeben) |
| `words_count` | Anzahl Wörter |
| `trend_quarterly_pct` / `trend_yearly_pct` | Volumenveränderung in % ggü. Vorquartal/Vorjahr |
| `traffic_value_eur_month` | SV × CPC – was dieser Traffic bei Ads kosten würde |
| `opportunity_score` | Eigene Kennzahl: `SV^0,55 × (1 + CPC) / (12 + KD)`. Belohnt Volumen und kommerziellen Wert, bestraft Difficulty. Fehlende KD wird für die Berechnung mit 20 angenommen – solche Zeilen also nachprüfen |
| `variant_group` | Repräsentant der Volumen-Gruppe |
| `is_primary` | 1 = eindeutiger Eintrag, 0 = Variante. **Für Summen immer auf 1 filtern** |

**Methodische Grenzen:** Suchvolumen sind Google-Schätzungen mit Monatsschwankung (der Head-Term lag zwischen 27.100 und 60.500). KD misst die organische Ranking-Schwierigkeit, nicht den Ads-Wettbewerb – dafür ist `competition` da. Das Cluster-Feld ist regelbasiert und bei Praxis-Eigennamen gelegentlich unscharf. Der `opportunity_score` ist eine Priorisierungshilfe, kein Ersatz für eine SERP-Sichtprüfung vor dem Investment.
