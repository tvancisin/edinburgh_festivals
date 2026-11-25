# Festival map selection audit

Audited November 25, 2026 against the 15 local source CSVs, `2012.csv` through `2026.csv`.

## Method and scope

All 11 timeline arcs were checked across 15 source years (165 combinations), plus All years for each arc (176 selections). The regression test independently lists expected source names, checks both selection orders, and preserves source order, repeated records, event objects, and raw rows.

Year selection uses the source `Year`, never a filename. A record with coordinates has both latitude and longitude parsed as nonblank finite numbers by the existing loader. Counts describe records eligible for hexbin rendering, not unique events, venues, visible hexagons, or coordinates verified against a geographic boundary. The current map window and zoom determine which hexagons are visible.

Aliases are explicit application grouping decisions. Raw names and CSVs remain unchanged. There is no fuzzy matching, coordinate imputation, or deduplication. Source download URLs, download dates, and export versions were not supplied. Website hosts below come from source event `Website` fields; they were not downloaded or independently verified as historical evidence. Imaginate names are grouped under the Children's arc; this grouping does not assert cross-year program comparability.

## Source names and grouping

| Source festival name | Arc | Source years | Records | With coordinates | Website hosts (source sample) |
| --- | --- | --- | ---: | ---: | --- |
| Edinburgh International Book Festival | Book | 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026 | 8999 | 8871 | www.edbookfest.co.uk |
| Fringe | Fringe | 2012, 2013 | 5767 | 5740 | www.edfringe.com |
| Edinburgh International Film Festival | Film | 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025, 2026 | 2492 | 2483 | www.edfilmfest.org.uk, www.eif.co.uk, www.edfilmfest.org |
| Bank of Scotland Imaginate Festival | Children's | 2012 | 13 | 4 |  |
| Edinburgh Arts Festival | Art | 2012 | 142 | 0 | www.edinburghartfestival.com |
| Edinburgh Jazz Festival | Jazz & Blues | 2012 | 68 | 0 | www.edinburghjazzfestival.com |
| Scottish International Storytelling Festival | Storytelling | 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026 | 1023 | 824 | www.tracscotland.org, www.sisf.org.uk, sisf.online.red61.co.uk |
| Edinburgh International Festival | International | 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026 | 1390 | 925 | www.eif.co.uk |
| Edinburgh Mela Festival | No configured arc | 2012 | 29 | 0 | edinburgh-mela.co.uk |
| Edinburgh's Hogmanay | Hogmanay | 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023, 2024, 2025, 2026 | 123 | 117 | www.edinburghfestivals.co.uk, www.edinburghshogmanay.org, www.edinburghshogmanay.com |
| Edinburgh Military Tattoo | Tattoo | 2012, 2013 | 2 | 0 | etickets.edintattoo.co.uk |
| Edinburgh International Science Festival | Science | 2013, 2014, 2015, 2016, 2017, 2018, 2024, 2025, 2026 | 1838 | 1825 | www.sciencefestival.co.uk, www.edinburghscience.co.uk |
| Imaginate Festival | Children's | 2013, 2014, 2015, 2016 | 58 | 30 | www.imaginate.org.uk |
| Edinburgh Mela | No configured arc | 2013, 2014, 2015 | 132 | 132 | www.edinburgh-mela.co.uk |
| Edinburgh Jazz & Blues Festival | Jazz & Blues | 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023 | 1376 | 729 | www.edinburghjazzfestival.com |
| Edinburgh Art Festival | Art | 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026 | 838 | 489 | www.edinburghartfestival.com, edinburghartfestival.com |
| Edinburgh Festival Fringe | Fringe | 2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026 | 43590 | 43590 | www.edfringe.com |
| The Royal Edinburgh Military Tattoo | Tattoo | 2014, 2015, 2016, 2017, 2018, 2019, 2022, 2023 | 8 | 8 | www.edintattoo.co.uk |
| Edinburgh International Children's Festival | Children's | 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025, 2026 | 128 | 112 | www.imaginate.org.uk |
| Edinburgh Science Festival | Science | 2019, 2020, 2022, 2023 | 528 | 487 | www.sciencefestival.co.uk |
| Edinburgh Jazz and Blues Festival | Jazz & Blues | 2024, 2025, 2026 | 312 | 312 | www.ejbf.co.uk, ejbf.co.uk |
| Royal Edinburgh Military Tattoo | Tattoo | 2024, 2025, 2026 | 3 | 3 | www.edintattoo.co.uk |

Nine historical name variants map to the corresponding arc keys: `Fringe`, `Edinburgh Science Festival`, `Bank of Scotland Imaginate Festival`, `Imaginate Festival`, `Edinburgh Jazz Festival`, `Edinburgh Jazz & Blues Festival`, `Edinburgh Military Tattoo`, `The Royal Edinburgh Military Tattoo`, and `Edinburgh Arts Festival`. All unlisted names match exactly.

The two Mela names have no configured arc. All 161 Mela records, including 132 with coordinates, remain in All festivals and are not assigned to another festival.

## Festival/year coverage

Each cell is **source records / records with coordinates**. `0/0` means no matching source records. A positive first number and zero second number means records exist but none have both coordinates. Neither establishes whether the festival took place.

| Arc | 2012 | 2013 | 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | All years |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Science | 0/0 | 202/199 | 276/273 | 266/265 | 280/278 | 277/275 | 268/268 | 273/272 | 1/1 | 0/0 | 120/85 | 134/129 | 95/95 | 85/85 | 89/87 | 2366/2312 |
| Children's | 13/4 | 15/15 | 14/0 | 14/0 | 15/15 | 15/15 | 14/14 | 15/14 | 0/0 | 14/3 | 14/10 | 15/15 | 14/14 | 12/12 | 15/15 | 199/146 |
| Jazz & Blues | 68/0 | 119/0 | 140/0 | 152/0 | 142/0 | 151/151 | 127/127 | 128/128 | 0/0 | 72/0 | 124/124 | 221/199 | 124/124 | 93/93 | 95/95 | 1756/1041 |
| Fringe | 2782/2775 | 2985/2965 | 3370/3370 | 3487/3487 | 3618/3618 | 3795/3795 | 3985/3985 | 4257/4257 | 0/0 | 1027/1027 | 3492/3492 | 3743/3743 | 3978/3978 | 4276/4276 | 4562/4562 | 49357/49330 |
| International | 114/0 | 162/0 | 124/124 | 88/0 | 76/0 | 102/99 | 78/78 | 83/83 | 0/0 | 110/92 | 68/64 | 114/114 | 102/102 | 82/82 | 87/87 | 1390/925 |
| Tattoo | 1/0 | 1/0 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 0/0 | 0/0 | 1/1 | 1/1 | 1/1 | 1/1 | 1/1 | 13/11 |
| Art | 142/0 | 133/0 | 73/0 | 38/0 | 97/0 | 40/40 | 126/126 | 27/27 | 0/0 | 12/7 | 16/15 | 57/55 | 56/56 | 83/83 | 80/80 | 980/489 |
| Book | 647/647 | 676/676 | 693/693 | 659/659 | 710/710 | 845/845 | 807/807 | 773/773 | 128/0 | 238/238 | 568/568 | 517/517 | 591/591 | 668/668 | 479/479 | 8999/8871 |
| Film | 191/187 | 182/179 | 198/198 | 192/192 | 208/208 | 263/263 | 292/292 | 284/284 | 0/0 | 0/0 | 196/194 | 53/53 | 126/126 | 175/175 | 132/132 | 2492/2483 |
| Storytelling | 36/0 | 60/60 | 64/64 | 71/71 | 68/68 | 66/61 | 53/53 | 67/59 | 0/0 | 79/46 | 132/68 | 122/69 | 68/68 | 64/64 | 73/73 | 1023/824 |
| Hogmanay | 6/0 | 7/7 | 19/19 | 10/10 | 11/11 | 10/10 | 14/14 | 15/15 | 0/0 | 0/0 | 5/5 | 7/7 | 10/10 | 5/5 | 4/4 | 123/117 |

## Records without coordinates

| Arc | Year | Source records |
| --- | ---: | ---: |
| Children's | 2014 | 14 |
| Children's | 2015 | 14 |
| Jazz & Blues | 2012 | 68 |
| Jazz & Blues | 2013 | 119 |
| Jazz & Blues | 2014 | 140 |
| Jazz & Blues | 2015 | 152 |
| Jazz & Blues | 2016 | 142 |
| Jazz & Blues | 2021 | 72 |
| International | 2012 | 114 |
| International | 2013 | 162 |
| International | 2015 | 88 |
| International | 2016 | 76 |
| Tattoo | 2012 | 1 |
| Tattoo | 2013 | 1 |
| Art | 2012 | 142 |
| Art | 2013 | 133 |
| Art | 2014 | 73 |
| Art | 2015 | 38 |
| Art | 2016 | 97 |
| Book | 2020 | 128 |
| Storytelling | 2012 | 36 |
| Hogmanay | 2012 | 6 |

## Verification

Run `node --test --test-isolation=none tests/festivalMapData.test.mjs` to repeat all 176 selection checks. Expected source-name membership is independent from the application resolver. Every distinct source name must be covered by an arc or explicitly excluded as Mela. The audit verifies the data-selection pipeline, not browser clicks.
