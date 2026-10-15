# Element data

`elements.json` holds facts for the shared periodic table (atomic number, symbol, name, period, group, block, category, phase, mass, Pauling electronegativity, empirical atomic radius, first ionization energy, electron affinity, and electron configuration).

The numbers and labels were adapted from [Bowserinator/Periodic-Table-JSON](https://github.com/Bowserinator/Periodic-Table-JSON) (`PeriodicTableJSON.json`). That project compiles public element facts, including atomic radii from the Wikipedia page [Atomic radii of the elements (data page)](https://en.wikipedia.org/wiki/Atomic_radii_of_the_elements_(data_page)). The README says the JSON may be used in other projects. This file is not a copy of that JSON: summaries, images, discovery credits, and unused fields were left out, and the records were reshaped for this site.

## Study choices

- Elements 1–118 only. Ununennium (119) is not included.
- Empirical radius is in picometers. Helium and neon are blank on purpose. Their empirical figures in the source (120 pm and 160 pm) are several times the calculated radius and do not match the radius used for the other elements. OpenStax *Chemistry: Atoms First 2e* §3.5 compares radii measured the same way. Missing radii render as a grey hatch, not as zero.
- Noble-gas electronegativity is blank when the source has no Pauling value (He, Ne, Ar, Og). Kr, Xe, and Rn keep the source values.
- A mass in parentheses is a whole-number mass number from the source (no standard atomic weight in that field).
- Lanthanides (57–71) and actinides (89–103) sit on detached rows. The main grid keeps placeholders `57–71` and `89–103` in group 3. Lutetium and lawrencium keep the source block label `d`.
- Electron affinity is the source value in kJ/mol: the energy required to detach an electron from the 1− gas anion. A larger positive number means the anion holds the electron more tightly. Missing values are blank, not zero.

PubChem’s periodic-table page was not used. The research note for this work recorded a 403 on that fetch.

## On-screen chemistry

Trend arrows (across a period on the top margin, down a group on the side margin) follow the general-chemistry patterns in OpenStax *Chemistry: Atoms First 2e* §3.5. The 18-column layout with the f-block pulled out follows §3.6. The wording on the table is original.
