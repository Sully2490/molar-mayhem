// Element symbols, names, and the numbers behind the trend heat maps.
// Radius (empirical, pm), first ionization energy (kJ/mol), and Pauling
// electronegativity are adapted from periodic-table-data-complete
// by Scott Weaver, used under the MIT License:
// https://github.com/sweaver2112/periodic-table-data-complete
//
// Copyright (c) 2025 Scott Weaver
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// Noble-gas electronegativity is left blank. General chemistry does not assign
// those atoms a Pauling value. Radius is empirical only, so mixed radius
// definitions do not distort the heat map.

/** @typedef {'main' | 'lanthanide' | 'actinide'} ElementSeries */

/**
 * @typedef {object} ElementRecord
 * @property {number} z
 * @property {string} sym
 * @property {string} name
 * @property {number} period
 * @property {number} group
 * @property {ElementSeries} series
 * @property {number | null} radius Empirical atomic radius in pm, when known.
 * @property {number | null} ie First ionization energy in kJ/mol, when known.
 * @property {number | null} en Pauling electronegativity, when assigned.
 */

/** @type {ElementRecord[]} */
export const ELEMENTS = [
  { z: 1, sym: "H", name: "Hydrogen", period: 1, group: 1, series: "main", radius: 25, ie: 1312, en: 2.2 },
  { z: 2, sym: "He", name: "Helium", period: 1, group: 18, series: "main", radius: null, ie: 2372.3, en: null },
  { z: 3, sym: "Li", name: "Lithium", period: 2, group: 1, series: "main", radius: 145, ie: 520.2, en: 0.98 },
  { z: 4, sym: "Be", name: "Beryllium", period: 2, group: 2, series: "main", radius: 105, ie: 899.5, en: 1.57 },
  { z: 5, sym: "B", name: "Boron", period: 2, group: 13, series: "main", radius: 85, ie: 800.6, en: 2.04 },
  { z: 6, sym: "C", name: "Carbon", period: 2, group: 14, series: "main", radius: 70, ie: 1086.5, en: 2.55 },
  { z: 7, sym: "N", name: "Nitrogen", period: 2, group: 15, series: "main", radius: 65, ie: 1402.3, en: 3.04 },
  { z: 8, sym: "O", name: "Oxygen", period: 2, group: 16, series: "main", radius: 60, ie: 1313.9, en: 3.44 },
  { z: 9, sym: "F", name: "Fluorine", period: 2, group: 17, series: "main", radius: 50, ie: 1681, en: 3.98 },
  { z: 10, sym: "Ne", name: "Neon", period: 2, group: 18, series: "main", radius: null, ie: 2080.7, en: null },
  { z: 11, sym: "Na", name: "Sodium", period: 3, group: 1, series: "main", radius: 180, ie: 495.8, en: 0.93 },
  { z: 12, sym: "Mg", name: "Magnesium", period: 3, group: 2, series: "main", radius: 150, ie: 737.7, en: 1.31 },
  { z: 13, sym: "Al", name: "Aluminum", period: 3, group: 13, series: "main", radius: 125, ie: 577.5, en: 1.61 },
  { z: 14, sym: "Si", name: "Silicon", period: 3, group: 14, series: "main", radius: 110, ie: 786.5, en: 1.9 },
  { z: 15, sym: "P", name: "Phosphorus", period: 3, group: 15, series: "main", radius: 100, ie: 1011.8, en: 2.19 },
  { z: 16, sym: "S", name: "Sulfur", period: 3, group: 16, series: "main", radius: 100, ie: 999.6, en: 2.58 },
  { z: 17, sym: "Cl", name: "Chlorine", period: 3, group: 17, series: "main", radius: 100, ie: 1251.2, en: 3.16 },
  { z: 18, sym: "Ar", name: "Argon", period: 3, group: 18, series: "main", radius: 71, ie: 1520.6, en: null },
  { z: 19, sym: "K", name: "Potassium", period: 4, group: 1, series: "main", radius: 220, ie: 418.8, en: 0.82 },
  { z: 20, sym: "Ca", name: "Calcium", period: 4, group: 2, series: "main", radius: 180, ie: 589.8, en: 1 },
  { z: 21, sym: "Sc", name: "Scandium", period: 4, group: 3, series: "main", radius: 160, ie: 633.1, en: 1.36 },
  { z: 22, sym: "Ti", name: "Titanium", period: 4, group: 4, series: "main", radius: 140, ie: 658.8, en: 1.54 },
  { z: 23, sym: "V", name: "Vanadium", period: 4, group: 5, series: "main", radius: 135, ie: 650.9, en: 1.63 },
  { z: 24, sym: "Cr", name: "Chromium", period: 4, group: 6, series: "main", radius: 140, ie: 652.9, en: 1.66 },
  { z: 25, sym: "Mn", name: "Manganese", period: 4, group: 7, series: "main", radius: 140, ie: 717.3, en: 1.55 },
  { z: 26, sym: "Fe", name: "Iron", period: 4, group: 8, series: "main", radius: 140, ie: 762.5, en: 1.83 },
  { z: 27, sym: "Co", name: "Cobalt", period: 4, group: 9, series: "main", radius: 135, ie: 760.4, en: 1.88 },
  { z: 28, sym: "Ni", name: "Nickel", period: 4, group: 10, series: "main", radius: 135, ie: 737.1, en: 1.91 },
  { z: 29, sym: "Cu", name: "Copper", period: 4, group: 11, series: "main", radius: 135, ie: 745.5, en: 1.9 },
  { z: 30, sym: "Zn", name: "Zinc", period: 4, group: 12, series: "main", radius: 135, ie: 906.4, en: 1.65 },
  { z: 31, sym: "Ga", name: "Gallium", period: 4, group: 13, series: "main", radius: 130, ie: 578.8, en: 1.81 },
  { z: 32, sym: "Ge", name: "Germanium", period: 4, group: 14, series: "main", radius: 125, ie: 762, en: 2.01 },
  { z: 33, sym: "As", name: "Arsenic", period: 4, group: 15, series: "main", radius: 115, ie: 947, en: 2.18 },
  { z: 34, sym: "Se", name: "Selenium", period: 4, group: 16, series: "main", radius: 115, ie: 941, en: 2.55 },
  { z: 35, sym: "Br", name: "Bromine", period: 4, group: 17, series: "main", radius: 115, ie: 1139.9, en: 2.96 },
  { z: 36, sym: "Kr", name: "Krypton", period: 4, group: 18, series: "main", radius: null, ie: 1350.8, en: null },
  { z: 37, sym: "Rb", name: "Rubidium", period: 5, group: 1, series: "main", radius: 235, ie: 403, en: 0.82 },
  { z: 38, sym: "Sr", name: "Strontium", period: 5, group: 2, series: "main", radius: 200, ie: 549.5, en: 0.95 },
  { z: 39, sym: "Y", name: "Yttrium", period: 5, group: 3, series: "main", radius: 180, ie: 600, en: 1.22 },
  { z: 40, sym: "Zr", name: "Zirconium", period: 5, group: 4, series: "main", radius: 155, ie: 640.1, en: 1.33 },
  { z: 41, sym: "Nb", name: "Niobium", period: 5, group: 5, series: "main", radius: 145, ie: 652.1, en: 1.6 },
  { z: 42, sym: "Mo", name: "Molybdenum", period: 5, group: 6, series: "main", radius: 145, ie: 684.3, en: 2.16 },
  { z: 43, sym: "Tc", name: "Technetium", period: 5, group: 7, series: "main", radius: 135, ie: 702, en: 1.9 },
  { z: 44, sym: "Ru", name: "Ruthenium", period: 5, group: 8, series: "main", radius: 130, ie: 710.2, en: 2.2 },
  { z: 45, sym: "Rh", name: "Rhodium", period: 5, group: 9, series: "main", radius: 135, ie: 719.7, en: 2.28 },
  { z: 46, sym: "Pd", name: "Palladium", period: 5, group: 10, series: "main", radius: 140, ie: 804.4, en: 2.2 },
  { z: 47, sym: "Ag", name: "Silver", period: 5, group: 11, series: "main", radius: 160, ie: 731, en: 1.93 },
  { z: 48, sym: "Cd", name: "Cadmium", period: 5, group: 12, series: "main", radius: 155, ie: 867.8, en: 1.69 },
  { z: 49, sym: "In", name: "Indium", period: 5, group: 13, series: "main", radius: 155, ie: 558.3, en: 1.78 },
  { z: 50, sym: "Sn", name: "Tin", period: 5, group: 14, series: "main", radius: 145, ie: 708.6, en: 1.96 },
  { z: 51, sym: "Sb", name: "Antimony", period: 5, group: 15, series: "main", radius: 145, ie: 834, en: 2.05 },
  { z: 52, sym: "Te", name: "Tellurium", period: 5, group: 16, series: "main", radius: 140, ie: 869.3, en: 2.1 },
  { z: 53, sym: "I", name: "Iodine", period: 5, group: 17, series: "main", radius: 140, ie: 1008.4, en: 2.66 },
  { z: 54, sym: "Xe", name: "Xenon", period: 5, group: 18, series: "main", radius: null, ie: 1170.4, en: null },
  { z: 55, sym: "Cs", name: "Cesium", period: 6, group: 1, series: "main", radius: 260, ie: 375.7, en: 0.79 },
  { z: 56, sym: "Ba", name: "Barium", period: 6, group: 2, series: "main", radius: 215, ie: 502.9, en: 0.89 },
  { z: 57, sym: "La", name: "Lanthanum", period: 6, group: 3, series: "lanthanide", radius: 195, ie: 538.1, en: 1.1 },
  { z: 58, sym: "Ce", name: "Cerium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 534.4, en: 1.12 },
  { z: 59, sym: "Pr", name: "Praseodymium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 527, en: 1.13 },
  { z: 60, sym: "Nd", name: "Neodymium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 533.1, en: 1.14 },
  { z: 61, sym: "Pm", name: "Promethium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 540, en: 1.13 },
  { z: 62, sym: "Sm", name: "Samarium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 544.5, en: 1.17 },
  { z: 63, sym: "Eu", name: "Europium", period: 6, group: 3, series: "lanthanide", radius: 185, ie: 547.1, en: 1.2 },
  { z: 64, sym: "Gd", name: "Gadolinium", period: 6, group: 3, series: "lanthanide", radius: 180, ie: 593.4, en: 1.2 },
  { z: 65, sym: "Tb", name: "Terbium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 565.8, en: 1.1 },
  { z: 66, sym: "Dy", name: "Dysprosium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 573, en: 1.22 },
  { z: 67, sym: "Ho", name: "Holmium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 581, en: 1.23 },
  { z: 68, sym: "Er", name: "Erbium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 589.3, en: 1.24 },
  { z: 69, sym: "Tm", name: "Thulium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 596.7, en: 1.25 },
  { z: 70, sym: "Yb", name: "Ytterbium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 603.4, en: 1.1 },
  { z: 71, sym: "Lu", name: "Lutetium", period: 6, group: 3, series: "lanthanide", radius: 175, ie: 523.5, en: 1.27 },
  { z: 72, sym: "Hf", name: "Hafnium", period: 6, group: 4, series: "main", radius: 155, ie: 658.5, en: 1.3 },
  { z: 73, sym: "Ta", name: "Tantalum", period: 6, group: 5, series: "main", radius: 145, ie: 761, en: 1.5 },
  { z: 74, sym: "W", name: "Tungsten", period: 6, group: 6, series: "main", radius: 135, ie: 770, en: 2.36 },
  { z: 75, sym: "Re", name: "Rhenium", period: 6, group: 7, series: "main", radius: 135, ie: 760, en: 1.9 },
  { z: 76, sym: "Os", name: "Osmium", period: 6, group: 8, series: "main", radius: 130, ie: 840, en: 2.2 },
  { z: 77, sym: "Ir", name: "Iridium", period: 6, group: 9, series: "main", radius: 135, ie: 880, en: 2.2 },
  { z: 78, sym: "Pt", name: "Platinum", period: 6, group: 10, series: "main", radius: 135, ie: 870, en: 2.28 },
  { z: 79, sym: "Au", name: "Gold", period: 6, group: 11, series: "main", radius: 135, ie: 890.1, en: 2.54 },
  { z: 80, sym: "Hg", name: "Mercury", period: 6, group: 12, series: "main", radius: 150, ie: 1007.1, en: 2 },
  { z: 81, sym: "Tl", name: "Thallium", period: 6, group: 13, series: "main", radius: 190, ie: 589.4, en: 1.62 },
  { z: 82, sym: "Pb", name: "Lead", period: 6, group: 14, series: "main", radius: 180, ie: 715.6, en: 1.87 },
  { z: 83, sym: "Bi", name: "Bismuth", period: 6, group: 15, series: "main", radius: 160, ie: 703, en: 2.02 },
  { z: 84, sym: "Po", name: "Polonium", period: 6, group: 16, series: "main", radius: 190, ie: 812.1, en: 2 },
  { z: 85, sym: "At", name: "Astatine", period: 6, group: 17, series: "main", radius: null, ie: 899.003, en: 2.2 },
  { z: 86, sym: "Rn", name: "Radon", period: 6, group: 18, series: "main", radius: null, ie: 1037, en: null },
  { z: 87, sym: "Fr", name: "Francium", period: 7, group: 1, series: "main", radius: null, ie: 380, en: 0.79 },
  { z: 88, sym: "Ra", name: "Radium", period: 7, group: 2, series: "main", radius: 215, ie: 509.3, en: 0.9 },
  { z: 89, sym: "Ac", name: "Actinium", period: 7, group: 3, series: "actinide", radius: 195, ie: 499, en: 1.1 },
  { z: 90, sym: "Th", name: "Thorium", period: 7, group: 3, series: "actinide", radius: 180, ie: 587, en: 1.3 },
  { z: 91, sym: "Pa", name: "Protactinium", period: 7, group: 3, series: "actinide", radius: 180, ie: 568, en: 1.5 },
  { z: 92, sym: "U", name: "Uranium", period: 7, group: 3, series: "actinide", radius: 175, ie: 597.6, en: 1.38 },
  { z: 93, sym: "Np", name: "Neptunium", period: 7, group: 3, series: "actinide", radius: 175, ie: 604.5, en: 1.36 },
  { z: 94, sym: "Pu", name: "Plutonium", period: 7, group: 3, series: "actinide", radius: 175, ie: 584.7, en: 1.28 },
  { z: 95, sym: "Am", name: "Americium", period: 7, group: 3, series: "actinide", radius: 175, ie: 578, en: 1.13 },
  { z: 96, sym: "Cm", name: "Curium", period: 7, group: 3, series: "actinide", radius: null, ie: 581, en: 1.28 },
  { z: 97, sym: "Bk", name: "Berkelium", period: 7, group: 3, series: "actinide", radius: null, ie: 601, en: 1.3 },
  { z: 98, sym: "Cf", name: "Californium", period: 7, group: 3, series: "actinide", radius: null, ie: 608, en: 1.3 },
  { z: 99, sym: "Es", name: "Einsteinium", period: 7, group: 3, series: "actinide", radius: null, ie: 619, en: 1.3 },
  { z: 100, sym: "Fm", name: "Fermium", period: 7, group: 3, series: "actinide", radius: null, ie: 627, en: 1.3 },
  { z: 101, sym: "Md", name: "Mendelevium", period: 7, group: 3, series: "actinide", radius: null, ie: 635, en: 1.3 },
  { z: 102, sym: "No", name: "Nobelium", period: 7, group: 3, series: "actinide", radius: null, ie: 642, en: 1.3 },
  { z: 103, sym: "Lr", name: "Lawrencium", period: 7, group: 3, series: "actinide", radius: null, ie: 470, en: 1.3 },
  { z: 104, sym: "Rf", name: "Rutherfordium", period: 7, group: 4, series: "main", radius: null, ie: 580, en: null },
  { z: 105, sym: "Db", name: "Dubnium", period: 7, group: 5, series: "main", radius: null, ie: null, en: null },
  { z: 106, sym: "Sg", name: "Seaborgium", period: 7, group: 6, series: "main", radius: null, ie: null, en: null },
  { z: 107, sym: "Bh", name: "Bohrium", period: 7, group: 7, series: "main", radius: null, ie: null, en: null },
  { z: 108, sym: "Hs", name: "Hassium", period: 7, group: 8, series: "main", radius: null, ie: null, en: null },
  { z: 109, sym: "Mt", name: "Meitnerium", period: 7, group: 9, series: "main", radius: null, ie: null, en: null },
  { z: 110, sym: "Ds", name: "Darmstadtium", period: 7, group: 10, series: "main", radius: null, ie: null, en: null },
  { z: 111, sym: "Rg", name: "Roentgenium", period: 7, group: 11, series: "main", radius: null, ie: null, en: null },
  { z: 112, sym: "Cn", name: "Copernicium", period: 7, group: 12, series: "main", radius: null, ie: null, en: null },
  { z: 113, sym: "Nh", name: "Nihonium", period: 7, group: 13, series: "main", radius: null, ie: null, en: null },
  { z: 114, sym: "Fl", name: "Flerovium", period: 7, group: 14, series: "main", radius: null, ie: null, en: null },
  { z: 115, sym: "Mc", name: "Moscovium", period: 7, group: 15, series: "main", radius: null, ie: null, en: null },
  { z: 116, sym: "Lv", name: "Livermorium", period: 7, group: 16, series: "main", radius: null, ie: null, en: null },
  { z: 117, sym: "Ts", name: "Tennessine", period: 7, group: 17, series: "main", radius: null, ie: null, en: null },
  { z: 118, sym: "Og", name: "Oganesson", period: 7, group: 18, series: "main", radius: null, ie: null, en: null },
];
